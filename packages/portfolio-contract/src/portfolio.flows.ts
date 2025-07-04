/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */
import type { GuestInterface } from '@agoric/async-flow';
import {
  decodeAddressHook
} from '@agoric/cosmic-proto/address-hooks.js';
import { type Amount } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type {
  CaipChainId,
  CosmosChainAddress,
  Denom,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail } from '@endo/errors';
import { RebalanceStrategy, type YieldProtocol } from './constants.js';
import type { AccountInfoFor, PortfolioKit } from './portfolio.exo.ts';
import { changeUSDCPosition } from './pos-usdn.flows.ts';
import type { Position } from './pos.exo.ts';
import type {
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
// TODO: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');
const { keys } = Object;

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>; // TODO: move to type-guards as external interface?

type PortfolioBootstrapContext = {
  contractAddresses: EVMContractAddresses;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  zoeTools: GuestInterface<ZoeTools>;
  makePortfolioKit: () => GuestInterface<PortfolioKit>;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<unknown>['subscriber']>;
};

export type PortfolioInstanceContext = {
  contractAddresses: EVMContractAddresses;
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
  kit: GuestInterface<PortfolioKit>,
  protocol: YieldProtocol,
) => {
  const { destinationEVMChain, keyword, amounts: gasAmounts } = gmpArgs;
  const contractAddresses = ctx.contractAddresses[destinationEVMChain];

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

const sendTokensViaCCTP = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  args: BaseGmpArgs,
  kit: GuestInterface<PortfolioKit>,
  protocol: YieldProtocol,
) => {
  const { chainHubTools, zoeTools } = ctx;
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
    const evmChain = await orch.getChain(destinationEVMChain);
    const info = await evmChain.getChainInfo();
    const caipChainId: CaipChainId = `${info.namespace}:${info.reference}`;
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

export const makeAxelarMemo = async (
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
  const { chainHubTools, zoeTools } = ctx;

  const axelar = await orch.getChain('axelar');
  const { chainId } = await axelar.getChainInfo();

  const { lca: localAccount } = await provideAccountInfo(orch, 'agoric', kit);
  const { keyword, amounts: gasAmounts, destinationEVMChain } = gmpArgs;
  const natAmount = gasAmounts[keyword];
  const denom = await chainHubTools.getDenom(natAmount.brand);
  assert(denom, 'denom must be defined');
  const denomAmount = {
    denom,
    value: natAmount.value,
  };

  try {
    await zoeTools.localTransfer(seat, localAccount, gasAmounts);
    const memo = await makeAxelarMemo(destinationEVMChain, gmpArgs);
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
  const contractAddresses = ctx.contractAddresses[destinationEVMChain];
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
  const contractAddresses = ctx.contractAddresses[destinationEVMChain];
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

const supplyToCompound = async (
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
  const contractAddresses = ctx.contractAddresses[destinationEVMChain];
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
  const contractAddresses = ctx.contractAddresses[destinationEVMChain];
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
/* c8 ignore end */

type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<any> }
  | { seat: ZCFSeat; keyword: string };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return place.pos.getPoolKey();
  if ('account' in place) return coerceAccountId(place.account.getAddress());
  return `seat:${place.keyword}`;
};

type AssetMovement = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlace;
  dest: AssetPlace;
  apply: () => Promise<void>;
  recover: () => Promise<void>;
};
const moveStatus = ({ how, src, dest, amount }: AssetMovement) => ({
  how,
  src: placeLabel(src),
  dest: placeLabel(dest),
  amount,
});
const errmsg = (err: any) => ('message' in err ? err.message : `${err}`);

export const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
) => {
  const flowId = reporter.allocateFlowId();
  let step = 1;
  try {
    for (const move of moves) {
      trace(step, moveStatus(move));
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move) });
      await move.apply();
      const { amount, src, dest } = move;
      if ('pos' in src) {
        src.pos.recordTransferOut(amount);
      }
      if ('pos' in dest) {
        dest.pos.recordTransferIn(amount);
      }
      step += 1;
    }
    // TODO: delete the flow storage node
    // reporter.publishFlowStatus(flowId, { complete: true });
  } catch (err) {
    console.error('⚠️ step', step, ' failed', err);
    const failure = moves[step - 1];
    const errStep = step;
    while (step > 1) {
      step -= 1;
      const move = moves[step - 1];
      const how = `unwind: ${move.how}`;
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move), how });
      try {
        await move.recover();
      } catch (err) {
        console.error('⚠️ unwind step', step, ' failed', err);
        // if a recover fails, we just give up and report `where` the assets are
        const { dest: where, ...ms } = moveStatus(move);
        const final = { step, ...ms, how, where, error: errmsg(err) };
        reporter.publishFlowStatus(flowId, final);
        throw err;
      }
    }
    reporter.publishFlowStatus(flowId, {
      step: errStep,
      ...moveStatus(failure),
      error: errmsg(err),
    });
    throw err;
  }
};

export const provideCosmosAccount = async <C extends 'agoric' | 'noble'>(
  orch: Orchestrator,
  chainName: C,
  kit: GuestInterface<PortfolioKit>, // Guest<T>?
): Promise<AccountInfoFor[C]> => {
  await null;
  let promiseMaybe = kit.manager.reserveAccount(chainName);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<AccountInfoFor[C]>;
  }

  // We have the map entry reserved
  switch (chainName) {
    case 'noble': {
      const nobleChain = await orch.getChain('noble');
      const ica: NobleAccount = await nobleChain.makeAccount();
      const info: AccountInfoFor['noble'] = {
        namespace: 'cosmos',
        chainName: 'noble' as const,
        ica,
      };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    case 'agoric': {
      const agoricChain = await orch.getChain('agoric');
      const lca = await agoricChain.makeAccount();
      const reg = await lca.monitorTransfers(kit.tap);
      trace('Monitoring transfers for', lca.getAddress().value);
      const info: AccountInfoFor['agoric'] = {
        namespace: 'cosmos',
        chainName,
        lca,
        reg,
      };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    default:
      throw Error('unreachable');
  }
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
) => {
  const { destinationEVMChain } = offerArgs;

  const proposal = seat.getProposal() as ProposalType['rebalance'];
  trace('rebalance proposal', proposal.give, proposal.want, offerArgs);

  if (keys(proposal.want).length > 0) {
    throw Error('TODO: withdraw');
  }

  const { give } = proposal;
  if ('USDN' in give && give.USDN) {
    await changeUSDCPosition(give, offerArgs, orch, kit, ctx, seat);
  }

  const { entries } = Object;
  for (const [keyword, amount] of entries(give)) {
    if (!['Aave', 'Compound'].includes(keyword)) continue;
    const protocol = keyword as 'Aave' | 'Compound';
    (`${protocol}Gmp` in give && `${protocol}Account` in give) ||
      Fail`Gmp and Account needed for ${protocol}`;
    if (!destinationEVMChain)
      throw Fail`destinationEVMChain needed for ${protocol}`;
    const [gmpKW, accountKW] =
      protocol === 'Aave'
        ? ['AaveGmp', 'AaveAccount']
        : ['CompoundGmp', 'CompoundAccount'];

    const evmChain = await orch.getChain(destinationEVMChain);
    const info = await evmChain.getChainInfo();
    const caip: CaipChainId = `${info.namespace}:${info.reference}`;
    const { position: _TODO, isNew } = kit.manager.provideGMPPositionOn(
      protocol as YieldProtocol,
      caip,
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
  }
};

export const rebalanceFromTransfer = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  packet: VTransferIBCEvent['packet'],
  kit: PortfolioKit,
): Promise<{
  parsed: Awaited<ReturnType<LocalAccount['parseInboundTransfer']>> | null;
  handled: boolean;
}> => {
  await null;
  const { reader } = kit;

  const lca = reader.getLocalAccount();
  const parsed = await lca.parseInboundTransfer(packet);
  if (!parsed) {
    return harden({ parsed: null, handled: false });
  }
  trace('rebalanceFromTransfer parsed', parsed);

  const {
    amount,
    extra: { receiver },
  } = parsed;
  const { baseAddress, query } = decodeAddressHook(receiver);
  const { rebalance: strategy } = query;
  if (strategy === undefined) {
    return harden({ parsed, handled: false });
  }

  switch (strategy) {
    // Preset strategy is currently hardcoded to PreserveExistingProportions
    // XXX make it more dynamic, such as taking into account any prior
    // explicit earmarking of inbound transfers.
    case RebalanceStrategy.Preset:
    case RebalanceStrategy.PreserveExistingProportions: {
      // XXX implement PreserveExistingProportions
      trace(
        'rebalanceFromTransfer PreserveExistingProportions',
        amount,
        query,
        baseAddress,
      );
      throw harden({
        msg: 'rebalanceFromTransfer unimplemented PreserveExistingProportions strategy',
        amount,
        query,
        baseAddress,
      });
    }
    default: {
      Fail`unknown rebalance strategy ${strategy} for ${amount} in ${baseAddress}`;
    }
  }

  // Don't continue with the transfer, since we handled it.
  return harden({ parsed, handled: true });
}) satisfies OrchestrationFlow;

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
      contractAddresses,
      chainHubTools,
      inertSubscriber,
    } = ctx;
    const kit = makePortfolioKit();
    await provideCosmosAccount(orch, 'agoric', kit);

    const portfolioCtx = {
      contractAddresses,
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
