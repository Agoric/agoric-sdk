/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { MsgLock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import type { Amount } from '@agoric/ertp';
import { makeTracer, mustMatch, NonNullish } from '@agoric/internal';
import type {
  CosmosChainAddress,
  Denom,
  DenomAmount,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
} from '@agoric/orchestration/src/axelar-types.js';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import {
  buildGMPPayload,
  gmpAddresses,
} from '@agoric/orchestration/src/utils/gmp.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail } from '@endo/errors';
import type { YieldProtocol } from './constants.js';
import type { PortfolioKit, Position, USDNPosition } from './portfolio.exo.ts';
import type {
  AxelarChainsMap,
  BaseGmpArgs,
  EVMContractAddresses,
  GmpArgsContractCall,
  GmpArgsTransferAmount,
  GmpArgsWithdrawAmount,
  LocalAccount,
  NobleAccount,
  OfferArgsFor,
  ProposalType,
} from './type-guards.ts';
import { GMPArgsShape, makePortfolioPath } from './type-guards.ts';
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');
const { values } = Object;

type PortfolioBootstrapContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  contractAddresses: EVMContractAddresses;
  zoeTools: GuestInterface<ZoeTools>;
  makePortfolioKit: (
    localAccount: LocalAccount,
    nobleAccount: NobleAccount,
  ) => GuestInterface<PortfolioKit>;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
};

export type PortfolioInstanceContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  contractAddresses: EVMContractAddresses;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
};

// XXX: push down to Orchestration API in NobleMethods, in due course
const makeSwapLockMessages = (
  nobleAddr: CosmosChainAddress,
  amountValue: bigint,
  {
    poolId = 0n,
    denom = 'uusdc',
    denomTo = 'uusdn',
    vault = 1, // VaultType.STAKED,
  } = {},
) => {
  const amount = `${amountValue}`;
  const msgSwap: MsgSwap = {
    signer: nobleAddr.value,
    amount: { denom, amount },
    routes: [{ poolId, denomTo }],
    // TODO: swap min multiplier?
    min: { denom: denomTo, amount },
  };
  const msgLock: MsgLock = {
    signer: nobleAddr.value,
    vault,
    // TODO: swap multiplier
    amount,
  };
  return { msgSwap, msgLock };
};

const createRemoteEVMAccount = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: BaseGmpArgs,
  reader: GuestInterface<PortfolioKit['reader']>,
  protocol: YieldProtocol,
) => {
  const { contractAddresses } = ctx;
  const { destinationEVMChain, keyword, amounts: gasAmounts } = gmpArgs;

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
    reader,
  );

  return reader.getGMPAddress(protocol);
};

const sendTokensViaCCTP = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  args: BaseGmpArgs,
  reader: GuestInterface<PortfolioKit>['reader'],
  protocol: YieldProtocol,
) => {
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;
  const { keyword, amounts, destinationEVMChain } = args;
  const amount = amounts[keyword];
  const denom = NonNullish(chainHubTools.getDenom(amount.brand));
  const denomAmount: DenomAmount = { denom, value: amount.value };

  const nobleAccount = reader.getNobleICA() as unknown as NobleAccount;
  const localAcct = reader.getLCA() as unknown as LocalAccount;

  trace('localTransfer', amount, 'to local', localAcct.getAddress().value);
  await zoeTools.localTransfer(seat, localAcct, amounts);
  try {
    await localAcct.transfer(nobleAccount.getAddress(), denomAmount);
    const caipChainId = axelarChainsMap[destinationEVMChain].caip;
    const remoteAccountAddress = await reader.getGMPAddress(protocol);
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
    await zoeTools.withdrawToSeat(localAcct, seat, amounts);
    // TODO: use X from @endo/errors
    const errorMsg = `⚠️ Noble transfer failed: ${err}`;
    throw new Error(errorMsg);
  }
};

const makeAxelarMemo = (
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

const sendGmp = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsContractCall,
  reader: GuestInterface<PortfolioKit>['reader'],
) => {
  mustMatch(gmpArgs, GMPArgsShape);
  const { axelarChainsMap, chainHubTools, zoeTools } = ctx;

  const axelar = await orch.getChain('axelar');
  const { chainId } = await axelar.getChainInfo();

  const localAccount = reader.getLCA() as unknown as LocalAccount;
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

const supplyToAave = async (
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
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await kit.reader.getGMPAddress('Aave');

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
    kit.reader,
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
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await kit.reader.getGMPAddress('Aave');

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
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256,address)',
          args: [contractAddresses.usdc, withdrawAmount, remoteEVMAddress],
          target: contractAddresses.aavePool,
        },
      ],
    }),
    kit.reader,
  );
};
/* c8 ignore end */

const supplyToCompound = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsTransferAmount,
  reader: GuestInterface<PortfolioKit>['reader'],
) => {
  const {
    destinationEVMChain,
    transferAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await reader.getGMPAddress('Compound');
  // XXX if we're not using it, why assert it here???
  assert(remoteEVMAddress, 'remoteEVMAddress must be defined');

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
    reader,
  );
};

/* c8 ignore start */
const withdrawFromCompound = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: GmpArgsWithdrawAmount,
  reader: GuestInterface<PortfolioKit>['reader'],
) => {
  const {
    destinationEVMChain,
    withdrawAmount,
    keyword,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx;

  const remoteEVMAddress = await reader.getGMPAddress('Compound');
  assert(remoteEVMAddress, 'remoteEVMAddress must be defined');

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
      contractInvocationData: [
        {
          functionSignature: 'withdraw(address,uint256)',
          args: [contractAddresses.usdc, withdrawAmount],
          target: contractAddresses.compound,
        },
      ],
    }),
    reader,
  );
};
/* c8 ignore end */

type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<any> }
  | { seat: ZCFSeat; keyword: string };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return `position${place.pos.getPositionId()}`;
  if ('account' in place) return coerceAccountId(place.account.getAddress());
  return `seat:${place.keyword}`;
};

const die = err => {
  throw err;
};

const trackFlow = (reporter: GuestInterface<PortfolioKit['reporter']>) => {
  const flowId = reporter.allocateFlowId();
  let depth = 0;

  const make = () => {
    const moveAssets = async (info: {
      how: string;
      amount: Amount<'nat'>;
      src: AssetPlace;
      dest: AssetPlace;
      handle: () => Promise<void>;
      recover?: (err: any) => Promise<never>; // must re-throw
    }) => {
      const { how, src, dest, amount, handle, recover = die } = info;
      depth += 1;
      trace(how, amount, placeLabel(src), '->', placeLabel(dest));
      reporter.publishFlowStatus(flowId, {
        depth,
        how,
        src: placeLabel(src),
        dest: placeLabel(dest),
        amount,
      });
      try {
        await handle();
        if ('pos' in src) {
          src.pos.recordTransferOut(amount);
        }
        if ('pos' in dest) {
          dest.pos.recordTransferIn(amount);
        }
      } catch (err) {
        console.error('⚠️ recover', how, err);
        const message = 'message' in err ? err.message : `${err}`;
        reporter.publishFlowStatus(flowId, {
          depth,
          how,
          src: placeLabel(src),
          dest: placeLabel(dest),
          amount,
          error: message,
        });
        await recover(err);
      } finally {
        depth -= 1;
      }
    };
    return moveAssets;
  };

  return make();
};

const addToUSDNPosition = async (
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  pos: USDNPosition,
  amount: Amount<'nat'>,
  kit: GuestInterface<PortfolioKit>,
) => {
  // XXX HostInterface<...> ???
  const ica = kit.reader.getNobleICA() as unknown as NobleAccount;
  // XXX HostInterface<...> ???
  const localAcct = kit.reader.getLCA() as unknown as LocalAccount;

  const denom = NonNullish(ctx.chainHubTools.getDenom(amount.brand));
  const denomAmount: DenomAmount = { denom, value: amount.value };
  const amounts = harden({ USDN: amount });
  const moveAssets = trackFlow(kit.reporter);

  await moveAssets({
    how: 'localTransfer',
    src: { seat, keyword: 'USDN' },
    dest: { account: localAcct },
    amount: amount,
    handle: async () => {
      await ctx.zoeTools.localTransfer(seat, localAcct, amounts);

      const there = ica.getAddress();
      await moveAssets({
        how: 'IBC transfer',
        src: { account: localAcct },
        dest: { account: ica },
        amount,
        handle: async () => {
          await localAcct.transfer(there, denomAmount);

          await moveAssets({
            how: 'Swap, Lock',
            amount,
            src: { account: ica },
            dest: { pos },
            handle: async () => {
              // NOTE: proposalShape guarantees that amount.brand is USDC
              const { msgSwap, msgLock } = makeSwapLockMessages(
                there,
                amount.value,
              );

              trace('executing', [msgSwap, msgLock]);
              const result = await ica.executeEncodedTx([
                Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
                Any.toJSON(MsgLock.toProtoMsg(msgLock)),
              ]);
              trace('TODO: decode Swap, Lock result; detect errors', result);
            },

            recover: async err => {
              console.error('⚠️ recover to local account.', amounts);
              const nobleAmount = { ...denomAmount, denom: 'uusdc' };
              await ica.transfer(localAcct.getAddress(), nobleAmount);
              // TODO: and what if this transfer fails?
              throw err;
            },
          });
        },
        recover: async err => {
          console.error('⚠️ recover to seat.', err);
          await ctx.zoeTools.withdrawToSeat(localAcct, seat, amounts);
          // TODO: and what if the withdrawToSeat fails?
          throw err;
        },
      });
    },
  });
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
) => {
  const { axelarChainsMap } = ctx;
  const { destinationEVMChain } = offerArgs;

  const proposal = seat.getProposal() as ProposalType['rebalance'];
  trace(
    'rebalance proposal',
    (proposal as any).give,
    (proposal as any).want,
    offerArgs,
  );

  if (!('give' in proposal)) {
    throw Error('TODO: withdraw');
  }

  const { give } = proposal;
  if (give.USDN) {
    const pos = kit.manager.provideUSDNPosition(); // TODO: get num from offerArgs?
    await addToUSDNPosition(ctx, seat, pos, give.USDN, kit);
  }

  const { entries } = Object;
  for (const [keyword, amount] of entries(give)) {
    if (!['Aave', 'Compound'].includes(keyword)) continue;
    const protocol = keyword as 'Aave' | 'Compound';
    (`${protocol}Gmp` in give && `${protocol}Account` in give) ||
      Fail`Gmp and Account needed for ${protocol}`;
    const [gmpKW, accountKW] =
      protocol === 'Aave'
        ? ['AaveGmp', 'AaveAccount']
        : ['CompoundGmp', 'CompoundAccount'];

    const { position: _TODO, isNew } = kit.manager.provideGMPPositionOn(
      protocol as YieldProtocol,
      axelarChainsMap[destinationEVMChain].caip,
    );

    if (isNew) {
      const gmpArgs = {
        destinationEVMChain,
        keyword: accountKW,
        amounts: { [accountKW]: give[accountKW] },
      };
      try {
        await createRemoteEVMAccount(
          orch,
          ctx,
          seat,
          gmpArgs,
          kit.reader,
          protocol,
        );
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
    await sendTokensViaCCTP(orch, ctx, seat, args, kit.reader, protocol);

    // Wait before supplying funds to aave - make sure tokens reach the remote EVM account
    kit.manager.waitKLUDGE(20n);

    const { value: transferAmount } = give[protocol] as Amount<'nat'>;
    const gmpArgs = {
      destinationEVMChain: offerArgs.destinationEVMChain,
      transferAmount,
      keyword: gmpKW,
      amounts: { [gmpKW]: give[gmpKW] },
    };
    switch (protocol) {
      case 'Aave':
        await supplyToAave(orch, ctx, seat, gmpArgs, kit);
        break;
      case 'Compound':
        await supplyToCompound(orch, ctx, seat, gmpArgs, kit.reader);
        break;
    }
  }
};

/**
 * Offer handler to make a portfolio and, optionally, open yield positions.
 *
 * ASSUME seat's proposal is guarded as per {@link makeProposalShapes}
 *
 * @returns {*} following continuing invitation pattern, with a topic
 * for each position opened, with the address in storagePath.
 */
export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: PortfolioBootstrapContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'], // TODO: USDN/USDC ratio
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const {
      makePortfolioKit,
      zoeTools,
      axelarChainsMap,
      chainHubTools,
      contractAddresses,
      inertSubscriber,
    } = ctx;
    const { destinationEVMChain } = offerArgs;
    const agoric = await orch.getChain('agoric');
    const localAccount = await agoric.makeAccount();
    const nobleChain = await orch.getChain('noble');
    // Always make a Noble ICA, since we need it for CCTP
    const nobleAccount = await nobleChain.makeAccount();

    const kit = makePortfolioKit(localAccount, nobleAccount);
    const reg = await localAccount.monitorTransfers(kit.tap);
    trace('Monitoring transfers for', localAccount.getAddress().value);
    // TODO: save reg somewhere???

    const { give } = seat.getProposal() as ProposalType['openPortfolio'];
    const portfolioCtx = {
      axelarChainsMap,
      chainHubTools,
      contractAddresses,
      keeper: { ...kit.reader, ...kit.manager },
      zoeTools,
      inertSubscriber,
    };

    if (!seat.hasExited()) {
      try {
        await rebalance(orch, portfolioCtx, seat, offerArgs, kit);
      } catch (err) {
        console.error('⚠️ rebalance failed', err);
        seat.fail(err);
      }
    }

    if (!seat.hasExited()) seat.exit();

    return harden({
      invitationMakers: kit.invitationMakers,
      publicTopics: [
        {
          description: 'Portfolio',
          storagePath: await kit.reader.getStoragePath(),
          subscriber: inertSubscriber, // TODO: portfolio info subscriber?
        },
      ] as GuestInterface<ResolvedPublicTopic<never>>[],
    });
    /* c8 ignore start */
  } catch (err) {
    // XXX async flow DX: stack traces don't cross vow boundaries?
    console.error('🚨 openPortfolio flow failed', err);
    throw err;
  }
  /* c8 ignore end */
}) satisfies OrchestrationFlow;
harden(openPortfolio);
