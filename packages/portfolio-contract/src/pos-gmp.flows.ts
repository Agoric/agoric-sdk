/**
 * @file flows for Aave and Compound protocols on EVM chains
 *
 * Since Axelar GMP (General Message Passing) is used in both cases,
 * we use "gmp" in the filename.
 *
 * @see {@link changeGMPPosition}
 * @see {@link supplyToAave}
 * @see {@link supplyToCompound}
 * @see {@link createRemoteEVMAccount}
 * @see {@link sendTokensViaCCTP}
 */
import type { Amount } from '@agoric/ertp';
import {
  makeTracer,
  mustMatch,
  NonNullish,
  type TypedPattern,
} from '@agoric/internal';
import type { DenomAmount, Orchestrator } from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
  type ContractCall,
} from '@agoric/orchestration/src/axelar-types.js';
import {
  buildGMPPayload,
  gmpAddresses,
} from '@agoric/orchestration/src/utils/gmp.js';
import type { AmountKeywordRecord, ZCFSeat } from '@agoric/zoe';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { assert, throwRedacted as Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import { AxelarChain, type YieldProtocol } from './constants.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import {
  type PortfolioInstanceContext,
  provideAccountInfo,
} from './portfolio.flows.ts';
import type {
  AxelarChainsMap,
  OfferArgsFor,
  OpenPortfolioGive,
} from './type-guards.ts';

const trace = makeTracer('GMPF');
const { keys } = Object;

type BaseGmpArgs = {
  destinationEVMChain: AxelarChain;
  keyword: string;
  amounts: AmountKeywordRecord;
};
const GmpCallType = {
  ContractCall: 1,
  ContractCallWithToken: 2,
} as const;
type GmpCallType = (typeof GmpCallType)[keyof typeof GmpCallType];

export type GmpArgsContractCall = BaseGmpArgs & {
  destinationAddress: string;
  type: GmpCallType;
  contractInvocationData: Array<ContractCall>;
};
type GmpArgsTransferAmount = BaseGmpArgs & {
  transferAmount: bigint;
};
type GmpArgsWithdrawAmount = BaseGmpArgs & {
  withdrawAmount: bigint;
};
const ContractCallShape = M.splitRecord({
  target: M.string(),
  functionSignature: M.string(),
  args: M.arrayOf(M.any()),
});
const GMPArgsShape: TypedPattern<GmpArgsContractCall> = M.splitRecord({
  destinationAddress: M.string(),
  type: M.or(1, 2),
  destinationEVMChain: M.or(...keys(AxelarChain)),
  keyword: M.string(),
  amounts: AmountKeywordRecordShape, // XXX brand should be exactly USDC
  contractInvocationData: M.arrayOf(ContractCallShape),
});

export const createRemoteEVMAccount = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: BaseGmpArgs,
  kit: GuestInterface<PortfolioKit>,
  protocol: YieldProtocol,
) => {
  const { destinationEVMChain, keyword, amounts: gasAmounts } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [],
    }),
    kit,
  );

  return kit.reader.getGMPAddress(protocol);
};

export const sendTokensViaCCTP = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  args: BaseGmpArgs,
  kit: GuestInterface<PortfolioKit>,
  protocol: YieldProtocol,
) => {
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;
  const { keyword, amounts, destinationEVMChain } = args;
  const amount = amounts[keyword];
  const denom = NonNullish(chainHubTools.getDenom(amount.brand));
  const denomAmount: DenomAmount = { denom, value: amount.value };

  const { lca: localAcct } = await provideAccountInfo(orch, 'agoric', kit);
  const { ica: nobleAccount } = await provideAccountInfo(orch, 'noble', kit);

  trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
  await zoeTools.localTransfer(seat, localAcct, amounts);
  try {
    await localAcct.transfer(nobleAccount.getAddress(), denomAmount);
    const caipChainId = axelarChainsMap[destinationEVMChain].caip;
    const remoteAccountAddress = await kit.reader.getGMPAddress(protocol);
    const destinationAddress = `${caipChainId}:${remoteAccountAddress}`;
    trace(`CCTP destinationAddress: ${destinationAddress}`);

    try {
      await nobleAccount.depositForBurn(
        destinationAddress as `${string}:${string}:${string}`,
        denomAmount,
      );
    } catch (err) {
      console.error('⚠️ recover to local account.', amount);
      const nobleAmount: DenomAmount = { denom: 'uusdc', value: amount.value };
      await nobleAccount.transfer(localAcct.getAddress(), nobleAmount);
      // TODO: and what if this transfer fails?
      throw err;
    }
  } catch (err) {
    // TODO: use X from @endo/errors
    const errorMsg = `⚠️ Noble transfer failed`;
    console.error(errorMsg, err);
    await zoeTools.withdrawToSeat(localAcct, seat, amounts);
    throw new Error(`${errorMsg}: ${err}`);
  }
};

export const makeAxelarMemo = (
  axelarChainsMap: AxelarChainsMap,
  gmpArgs: GmpArgsContractCall,
) => {
  const {
    contractInvocationData,
    destinationEVMChain,
    destinationAddress,
    keyword,
    amounts: gasAmounts,
    type,
  } = gmpArgs;

  trace(`targets: [${destinationAddress}]`);

  const payload = buildGMPPayload(contractInvocationData);
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: axelarChainsMap[destinationEVMChain].axelarId,
    destination_address: destinationAddress,
    payload,
    type,
  };

  memo.fee = {
    amount: String(gasAmounts[keyword].value),
    recipient: gmpAddresses.AXELAR_GAS,
  };

  return harden(JSON.stringify(memo));
};
harden(makeAxelarMemo);

const sendGmp = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsContractCall,
  kit: GuestInterface<PortfolioKit>,
) => {
  mustMatch(gmpArgs, GMPArgsShape);
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;

  const axelar = await orch.getChain('axelar');
  const { chainId } = await axelar.getChainInfo();

  const { lca: localAccount } = await provideAccountInfo(orch, 'agoric', kit);
  const { keyword, amounts: gasAmounts } = gmpArgs;
  const natAmount = gasAmounts[keyword];
  const denom = await chainHubTools.getDenom(natAmount.brand);
  assert(denom, 'denom must be defined');
  const denomAmount = {
    denom,
    value: natAmount.value,
  };

  try {
    await zoeTools.localTransfer(seat, localAccount, gasAmounts);
    const memo = makeAxelarMemo(axelarChainsMap, gmpArgs);
    await localAccount.transfer(
      {
        value: gmpAddresses.AXELAR_GMP,
        encoding: 'bech32',
        chainId,
      },
      denomAmount,
      { memo },
    );
  } catch (err) {
    await ctx.zoeTools.withdrawToSeat(localAccount, seat, gasAmounts);
    throw new Error(`sendGmp failed: ${err}`);
  }
};

export const supplyToAave = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsTransferAmount,
  kit: GuestInterface<PortfolioKit>,
) => {
  const {
    destinationEVMChain,
    transferAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];
  const remoteEVMAddress = await kit.reader.getGMPAddress('Aave');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [contractAddresses.aavePool, transferAmount],
          target: contractAddresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256,address,uint16)',
          args: [contractAddresses.usdc, transferAmount, remoteEVMAddress, 0],
          target: contractAddresses.aavePool,
        },
      ],
    }),
    kit,
  );
};

/* c8 ignore start */
const withdrawFromAave = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsWithdrawAmount,
  kit: GuestInterface<PortfolioKit>,
) => {
  const {
    destinationEVMChain,
    withdrawAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];
  const remoteEVMAddress = await kit.reader.getGMPAddress('Aave');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256,address)',
          args: [contractAddresses.usdc, withdrawAmount, remoteEVMAddress],
          target: contractAddresses.aavePool,
        },
      ],
    }),
    kit,
  );
};
/* c8 ignore end */

export const supplyToCompound = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsTransferAmount,
  kit: GuestInterface<PortfolioKit>,
) => {
  const {
    destinationEVMChain,
    transferAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];
  const remoteEVMAddress = await kit.reader.getGMPAddress('Compound');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [contractAddresses.compound, transferAmount],
          target: contractAddresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256)',
          args: [contractAddresses.usdc, transferAmount],
          target: contractAddresses.compound,
        },
      ],
    }),
    kit,
  );
};

/* c8 ignore start */
const withdrawFromCompound = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsWithdrawAmount,
  kit: GuestInterface<PortfolioKit>,
) => {
  const {
    destinationEVMChain,
    withdrawAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];
  const remoteEVMAddress = await kit.reader.getGMPAddress('Compound');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256)',
          args: [contractAddresses.usdc, withdrawAmount],
          target: contractAddresses.compound,
        },
      ],
    }),
    kit,
  );
};

export const changeGMPPosition = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
  protocol: 'Aave' | 'Compound',
  give: {} | OpenPortfolioGive,
) => {
  const { axelarChainsMap } = ctx;
  const { destinationEVMChain } = offerArgs;

  (`${protocol}Gmp` in give && `${protocol}Account` in give) ||
    Fail`Gmp and Account needed for ${protocol}`;
  if (!destinationEVMChain)
    throw Fail`destinationEVMChain needed for ${protocol}`;
  const [gmpKW, accountKW] =
    protocol === 'Aave'
      ? ['AaveGmp', 'AaveAccount']
      : ['CompoundGmp', 'CompoundAccount'];

  const { position: _TODO, isNew } = kit.manager.provideGMPPositionOn(
    protocol,
    axelarChainsMap[destinationEVMChain].caip,
    destinationEVMChain,
  );

  if (isNew) {
    const gmpArgs = {
      destinationEVMChain,
      keyword: accountKW,
      amounts: { [accountKW]: give[accountKW] },
    };
    try {
      await createRemoteEVMAccount(orch, ctx, seat, gmpArgs, kit, protocol);
    } catch (err) {
      console.error('⚠️ initRemoteEVMAccount failed for', protocol, err);
      seat.fail(err);
    }
  }

  const args = {
    destinationEVMChain,
    keyword: protocol,
    amounts: { [protocol]: give[protocol] },
  };
  await sendTokensViaCCTP(orch, ctx, seat, args, kit, protocol);

  // Wait before supplying funds to aave - make sure tokens reach the remote EVM account
  kit.manager.waitKLUDGE(20n);

  const { value: transferAmount } = give[protocol] as Amount<'nat'>;
  const gmpArgs = {
    destinationEVMChain,
    transferAmount,
    keyword: gmpKW,
    amounts: { [gmpKW]: give[gmpKW] },
  };
  switch (protocol) {
    case 'Aave':
      await supplyToAave(orch, ctx, seat, gmpArgs, kit);
      break;
    case 'Compound':
      await supplyToCompound(orch, ctx, seat, gmpArgs, kit);
      break;
  }
};
