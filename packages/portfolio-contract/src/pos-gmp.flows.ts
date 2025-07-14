/**
 * @file flows for Aave and Compound protocols on EVM chains
 *
 * Since Axelar GMP (General Message Passing) is used in both cases,
 * we use "gmp" in the filename.
 *
 * @see {@link changeGMPPosition}
 * @see {@link supplyToAave}
 * @see {@link supplyToCompound}
 * @see {@link provideEVMAccount}
 * @see {@link sendTokensViaCCTP}
 */
import type { Amount } from '@agoric/ertp';
import { makeTracer, mustMatch, type TypedPattern } from '@agoric/internal';
import type {
  AccountId,
  CaipChainId,
  DenomAmount,
  Orchestrator,
} from '@agoric/orchestration';
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
import { throwRedacted as Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import { AxelarChain, type YieldProtocol } from './constants.js';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import {
  type PortfolioInstanceContext,
  provideCosmosAccount,
} from './portfolio.flows.ts';
import type {
  OfferArgsFor,
  OpenPortfolioGive,
  PoolKey,
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

const getCaipId = async (orch: Orchestrator, chainName: AxelarChain) => {
  const evmChain = await orch.getChain(chainName);
  const info = await evmChain.getChainInfo();
  const caipChainId: CaipChainId = `${info.namespace}:${info.reference}`;
  return caipChainId;
};

export const provideEVMAccount = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: BaseGmpArgs,
  kit: GuestInterface<PortfolioKit>,
) => {
  const { destinationEVMChain, keyword, amounts: gasAmounts } = gmpArgs;
  const addresses = ctx.contracts[destinationEVMChain];
  let promiseMaybe = kit.manager.reserveAccount(destinationEVMChain);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<GMPAccountInfo>; // XXX Guest/Host #9822
  }

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: addresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [],
    }),
    kit,
  );

  return kit.reader.getGMPInfo(
    destinationEVMChain,
  ) as unknown as Promise<GMPAccountInfo>; // XXX Guest/Host #9822
};

export const sendTokensViaCCTP = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  args: BaseGmpArgs,
  kit: GuestInterface<PortfolioKit>,
  protocol: YieldProtocol,
) => {
  const { usdc, zoeTools } = ctx;
  const { keyword, amounts, destinationEVMChain } = args;
  const amount = amounts[keyword];
  const { denom } = usdc;
  const denomAmount: DenomAmount = { denom, value: amount.value };

  const { lca: localAcct } = await provideCosmosAccount(orch, 'agoric', kit);
  const { ica: nobleAccount } = await provideCosmosAccount(orch, 'noble', kit);

  trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
  await zoeTools.localTransfer(seat, localAcct, amounts);
  try {
    await localAcct.transfer(nobleAccount.getAddress(), denomAmount);
    const caipChainId = await getCaipId(orch, destinationEVMChain);
    const { remoteAddress } = await kit.reader.getGMPInfo(destinationEVMChain);
    const destinationAddress: AccountId = `${caipChainId}:${remoteAddress}`;
    trace(`CCTP destinationAddress: ${destinationAddress}`);

    try {
      await nobleAccount.depositForBurn(destinationAddress, denomAmount);
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
  chainId: string,
  gmpArgs: GmpArgsContractCall,
) => {
  const {
    contractInvocationData,
    destinationAddress,
    keyword,
    amounts: gasAmounts,
    type,
  } = gmpArgs;

  trace(`targets: [${destinationAddress}]`);

  const payload = buildGMPPayload(contractInvocationData);
  const memo: AxelarGmpOutgoingMemo = {
    destination_chain: chainId,
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
  const { axelarIds, usdc, zoeTools } = ctx;

  const axelar = await orch.getChain('axelar');
  const { chainId } = await axelar.getChainInfo();

  const { lca: localAccount } = await provideCosmosAccount(orch, 'agoric', kit);
  const { keyword, amounts: gasAmounts, destinationEVMChain } = gmpArgs;
  const natAmount = gasAmounts[keyword];
  const { denom } = usdc;
  const denomAmount = {
    denom,
    value: natAmount.value,
  };

  try {
    await zoeTools.localTransfer(seat, localAccount, gasAmounts);
    const memo = makeAxelarMemo(axelarIds[destinationEVMChain], gmpArgs);
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

  const addresses = ctx.contracts[destinationEVMChain];
  const info = await provideEVMAccount(orch, ctx, seat, gmpArgs, kit);
  const { remoteAddress } = info;

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [addresses.aavePool, transferAmount],
          target: addresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256,address,uint16)',
          args: [addresses.usdc, transferAmount, remoteAddress, 0],
          target: addresses.aavePool,
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
  const addresses = ctx.contracts[destinationEVMChain];
  const info = await provideEVMAccount(orch, ctx, seat, gmpArgs, kit);
  const { remoteAddress } = info;

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256,address)',
          args: [addresses.usdc, withdrawAmount, remoteAddress],
          target: addresses.aavePool,
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
  const addresses = ctx.contracts[destinationEVMChain];
  const info = await provideEVMAccount(orch, ctx, seat, gmpArgs, kit);
  const { remoteAddress } = info;

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'approve(address,uint256)',
          args: [addresses.compound, transferAmount],
          target: addresses.usdc,
        },
        {
          functionSignature: 'supply(address,uint256)',
          args: [addresses.usdc, transferAmount],
          target: addresses.compound,
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
  const addresses = ctx.contracts[destinationEVMChain];
  const info = await provideEVMAccount(orch, ctx, seat, gmpArgs, kit);
  const { remoteAddress } = info;

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCall,
      keyword,
      amounts: gasAmounts,
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256)',
          args: [addresses.usdc, withdrawAmount],
          target: addresses.compound,
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
  const { destinationEVMChain } = offerArgs;

  (`${protocol}Gmp` in give && `${protocol}Account` in give) ||
    Fail`Gmp and Account needed for ${protocol}`;
  if (!destinationEVMChain)
    throw Fail`destinationEVMChain needed for ${protocol}`;
  const [gmpKW, accountKW] =
    protocol === 'Aave'
      ? ['AaveGmp', 'AaveAccount']
      : ['CompoundGmp', 'CompoundAccount'];

  const poolKey: PoolKey = `${protocol}_${destinationEVMChain}`;
  const gmpArgs = {
    destinationEVMChain,
    keyword: accountKW,
    amounts: { [accountKW]: give[accountKW] },
  };
  const info = await provideEVMAccount(orch, ctx, seat, gmpArgs, kit);
  const caipChainId = await getCaipId(orch, destinationEVMChain);
  const position = kit.manager.providePosition(
    poolKey,
    protocol,
    `${caipChainId}:${info.remoteAddress}`,
  );

  const args = {
    destinationEVMChain,
    keyword: protocol,
    amounts: { [protocol]: give[protocol] },
  };
  await sendTokensViaCCTP(orch, ctx, seat, args, kit, protocol);

  // Wait before supplying funds to aave - make sure tokens reach the remote EVM account
  kit.manager.waitKLUDGE(20n);

  const { value: transferAmount } = give[protocol] as Amount<'nat'>;
  const txfrArgs = {
    ...gmpArgs,
    keyword: gmpKW,
    amounts: { [gmpKW]: give[gmpKW] },
    transferAmount,
  };

  switch (protocol) {
    case 'Aave':
      await supplyToAave(orch, ctx, seat, txfrArgs, kit);
      break;
    case 'Compound':
      await supplyToCompound(orch, ctx, seat, txfrArgs, kit);
      break;
  }
  position.recordTransferIn(give[protocol]);
};
