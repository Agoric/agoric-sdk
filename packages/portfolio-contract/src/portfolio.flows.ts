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
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail } from '@endo/errors';
import type { YieldProtocol } from './constants.js';
import type { PortfolioKit, Position, USDNPosition } from './portfolio.exo.ts';
import type {
  AxelarChainsMap,
  BaseGmpArgs,
  GmpArgsContractCall,
  GmpArgsTransferAmount,
  GmpArgsWithdrawAmount,
  LocalAccount,
  NobleAccount,
  OfferArgsFor,
  ProposalType,
} from './type-guards.ts';
import { GMPArgsShape } from './type-guards.ts';
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');
const { add } = AmountMath;

type PortfolioBootstrapContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  zoeTools: GuestInterface<ZoeTools>;
  makePortfolioKit: (
    localAccount: LocalAccount,
    nobleAccount: NobleAccount,
  ) => GuestInterface<PortfolioKit>;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<unknown>['subscriber']>;
};

export type PortfolioInstanceContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
};

// XXX: push down to Orchestration API in NobleMethods, in due course
export const makeSwapLockMessages = (
  nobleAddr: CosmosChainAddress,
  usdcIn: bigint,
  {
    poolId = 0n,
    denom = 'uusdc',
    denomTo = 'uusdn',
    vault = 1, // VaultType.STAKED,
    usdnOut = undefined as bigint | undefined,
  } = {},
) => {
  const msgSwap = MsgSwap.fromPartial({
    signer: nobleAddr.value,
    amount: { denom, amount: `${usdcIn}` },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount: `${usdnOut || usdcIn}` },
  });
  if (!usdnOut) {
    const protoMessages = [Any.toJSON(MsgSwap.toProtoMsg(msgSwap))];
    return { msgSwap, protoMessages };
  }
  const msgLock = MsgLock.fromPartial({
    signer: nobleAddr.value,
    vault,
    amount: `${usdnOut}`,
  });
  const protoMessages = [
    Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
    Any.toJSON(MsgLock.toProtoMsg(msgLock)),
  ];
  return { msgSwap, msgLock, protoMessages };
};

const createRemoteEVMAccount = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  gmpArgs: BaseGmpArgs,
  reader: GuestInterface<PortfolioKit['reader']>,
  protocol: YieldProtocol,
) => {
  const {
    destinationEVMChain,
    keyword,
    gasRatio,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: contractAddresses.factory,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCallWithToken,
      keyword,
      amounts: gasAmounts,
      gasRatio,
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
  args: Omit<BaseGmpArgs, 'gasRatio'>,
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

export const makeAxelarMemo = (
  axelarChainsMap: AxelarChainsMap,
  gmpArgs: GmpArgsContractCall,
) => {
  const {
    contractInvocationData,
    destinationEVMChain,
    destinationAddress,
    keyword,
    gasRatio,
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
    // This amount specifies the outbound gas for sending GMP message
    amount: String(gasRatio * Number(gasAmounts[keyword].value)),
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
    gasRatio,
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
      type: AxelarGMPMessageType.ContractCallWithToken,
      keyword,
      amounts: gasAmounts,
      gasRatio,
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
    gasRatio,
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
      type: AxelarGMPMessageType.ContractCallWithToken,
      keyword,
      amounts: gasAmounts,
      gasRatio,
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
    gasRatio,
    amounts: gasAmounts,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];

  const remoteEVMAddress = await reader.getGMPAddress('Compound');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCallWithToken,
      keyword,
      amounts: gasAmounts,
      gasRatio,
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
    gasRatio,
  } = gmpArgs;
  const { contractAddresses } = ctx.axelarChainsMap[destinationEVMChain];

  const remoteEVMAddress = await reader.getGMPAddress('Compound');

  await sendGmp(
    orch,
    ctx,
    seat,
    harden({
      destinationAddress: remoteEVMAddress,
      destinationEVMChain,
      type: AxelarGMPMessageType.ContractCallWithToken,
      keyword,
      amounts: gasAmounts,
      gasRatio,
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
  kit: GuestInterface<PortfolioKit>,
  { USDN, NobleFees }: { USDN: Amount<'nat'>; NobleFees?: Amount<'nat'> },
  usdnOut: bigint = USDN.value,
) => {
  // XXX HostInterface<...> ???
  const ica = kit.reader.getNobleICA() as unknown as NobleAccount;
  // XXX HostInterface<...> ???
  const localAcct = kit.reader.getLCA() as unknown as LocalAccount;

  const amounts = harden({ USDN, ...(NobleFees ? { NobleFees } : {}) });
  const denom = NonNullish(ctx.chainHubTools.getDenom(USDN.brand));
  const volume: DenomAmount = { denom, value: USDN.value };
  const fees = NobleFees ? { denom, value: NobleFees.value } : undefined;
  const moveAssets = trackFlow(kit.reporter);

  const withFees = NobleFees ? add(USDN, NobleFees) : USDN;
  await moveAssets({
    how: 'localTransfer',
    src: { seat, keyword: 'USDN' },
    dest: { account: localAcct },
    amount: withFees,
    handle: async () => {
      await ctx.zoeTools.localTransfer(seat, localAcct, amounts);

      const there = ica.getAddress();
      await moveAssets({
        how: 'IBC transfer',
        src: { account: localAcct },
        dest: { account: ica },
        amount: withFees,
        handle: async () => {
          await localAcct.transfer(there, volume);

          await moveAssets({
            how: 'Swap, Lock',
            amount: USDN,
            src: { account: ica },
            dest: { pos },
            handle: async () => {
              // NOTE: proposalShape guarantees that amount.brand is USDC
              const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
                there,
                USDN.value,
                { usdnOut },
              );

              const swapOnlyTODO = protoMessages.slice(0, 1);
              trace('executing', [msgSwap, msgLock]);
              const result = await ica.executeEncodedTx(swapOnlyTODO);
              trace('TODO: decode Swap, Lock result; detect errors', result);
            },

            recover: async err => {
              console.error('⚠️ recover to local account.', amounts);
              const nobleAmount = { ...volume, denom: 'uusdc' };
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
    const { USDN, NobleFees } = give; // XXXX
    const { usdnOut } = offerArgs;
    const pos = kit.manager.provideUSDNPosition(); // TODO: get num from offerArgs?
    await addToUSDNPosition(ctx, seat, pos, kit, { USDN, NobleFees }, usdnOut);
  }

  const { entries } = Object;
  for (const [keyword, amount] of entries(give)) {
    if (!['Aave', 'Compound'].includes(keyword)) continue;
    const protocol = keyword as 'Aave' | 'Compound';
    (`${protocol}Gmp` in give && `${protocol}Account` in give) ||
      Fail`Gmp and Account needed for ${protocol}`;
    if (!destinationEVMChain)
      throw Fail`destinationEVMChain needed for ${protocol}`;
    if (!offerArgs[protocol]?.acctRatio)
      throw Fail`acctRatio needed for ${protocol}`;
    const [gmpKW, accountKW] =
      protocol === 'Aave'
        ? ['AaveGmp', 'AaveAccount']
        : ['CompoundGmp', 'CompoundAccount'];

    const { position: _TODO, isNew } = kit.manager.provideGMPPositionOn(
      protocol as YieldProtocol,
      axelarChainsMap[destinationEVMChain].caip,
    );

    if (isNew) {
      if (!offerArgs[protocol]?.acctRatio)
        throw Fail`acctRatio needed for ${protocol}`;

      const gmpArgs: BaseGmpArgs = {
        destinationEVMChain,
        keyword: accountKW,
        amounts: { [accountKW]: give[accountKW] },
        gasRatio: offerArgs[protocol].acctRatio,
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
    if (!offerArgs[protocol]?.gmpRatio)
      throw Fail`gmpRatio needed for ${protocol}`;

    const gmpArgs: GmpArgsTransferAmount = {
      destinationEVMChain,
      transferAmount,
      keyword: gmpKW,
      amounts: { [gmpKW]: give[gmpKW] },
      gasRatio: offerArgs[protocol]?.gmpRatio,
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
 * with a topic for the portfolio.
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
      inertSubscriber,
    } = ctx;
    // XXX should provideAccount() per chain as needed
    const agoric = await orch.getChain('agoric');
    const localAccount = await agoric.makeAccount();
    const nobleChain = await orch.getChain('noble');
    // Always make a Noble ICA, since we need it for CCTP
    const nobleAccount = await nobleChain.makeAccount();

    const kit = makePortfolioKit(localAccount, nobleAccount);
    const reg = await localAccount.monitorTransfers(kit.tap);
    trace('Monitoring transfers for', localAccount.getAddress().value);
    // TODO: save reg somewhere???

    const portfolioCtx = {
      axelarChainsMap,
      chainHubTools,
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

    const publicSubscribers: GuestInterface<PublicSubscribers> = {
      portfolio: {
        description: 'Portfolio',
        storagePath: await kit.reader.getStoragePath(),
        subscriber: inertSubscriber as any,
      },
    };
    return harden({
      invitationMakers: kit.invitationMakers,
      publicSubscribers,
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
