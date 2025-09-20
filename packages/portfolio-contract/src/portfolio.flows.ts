/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { type Amount, type Brand, type NatAmount } from '@agoric/ertp';
import { makeTracer, type TraceLogger } from '@agoric/internal';
import type {
  AccountId,
  Denom,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import {
  AxelarChain,
  SupportedChain,
  type YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail, q } from '@endo/errors';
import type { AxelarId, GmpAddresses } from './portfolio.contract.ts';
import type {
  AccountInfoFor,
  GMPAccountInfo,
  PortfolioKit,
} from './portfolio.exo.ts';
import {
  AaveProtocol,
  BeefyProtocol,
  CCTP,
  CCTPfromEVM,
  CompoundProtocol,
  provideEVMAccount,
  type EVMContext,
} from './pos-gmp.flows.ts';
import {
  agoricToNoble,
  nobleToAgoric,
  protocolUSDN,
} from './pos-usdn.flows.ts';
import type { Position } from './pos.exo.ts';
import type { ResolverKit } from './resolver/resolver.exo.js';
import {
  getChainNameOfPlaceRef,
  getKeywordOfPlaceRef,
  type AssetPlaceRef,
  type MovementDesc,
  type OfferArgsFor,
} from './type-guards-steps.ts';
import {
  PoolPlaces,
  type EVMContractAddressesMap,
  type PoolKey,
  type ProposalType,
} from './type-guards.ts';
// XXX: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const { keys, entries } = Object;

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;

export type PortfolioInstanceContext = {
  axelarIds: AxelarId;
  contracts: EVMContractAddressesMap;
  gmpAddresses: GmpAddresses;
  usdc: { brand: Brand<'nat'>; denom: Denom };
  gmpFeeInfo: { brand: Brand<'nat'>; denom: Denom };
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
  resolverClient: GuestInterface<ResolverKit['client']>;
  contractAccount: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>;
};

type PortfolioBootstrapContext = PortfolioInstanceContext & {
  makePortfolioKit: () => GuestInterface<PortfolioKit>;
};

type AccountsByChain = {
  agoric: AccountInfoFor['agoric'];
  noble?: AccountInfoFor['noble'];
} & Partial<Record<AxelarChain, GMPAccountInfo>>;

type AssetMovement = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  apply: (
    accounts: AccountsByChain,
    tracer: TraceLogger,
  ) => Promise<{ srcPos?: Position; destPos?: Position }>;
  recover: (accounts: AccountsByChain, tracer: TraceLogger) => Promise<void>;
};

const moveStatus = ({ apply: _a, recover: _r, ...data }: AssetMovement) => data;
const errmsg = (err: any) => ('message' in err ? err.message : `${err}`);

export type TransportDetail<
  How extends string,
  S extends SupportedChain,
  D extends SupportedChain,
  CTX = unknown,
  RecoverCTX = CTX,
> = {
  how: How;
  connections: { src: S; dest: D }[];
  apply: (
    ctx: CTX,
    amount: NatAmount,
    src: AccountInfoFor[S],
    dest: AccountInfoFor[D],
  ) => Promise<void>;
  recover: (
    ctx: RecoverCTX,
    amount: NatAmount,
    src: AccountInfoFor[S],
    dest: AccountInfoFor[D],
  ) => Promise<void>;
};

export type ProtocolDetail<
  P extends YieldProtocol,
  C extends SupportedChain,
  CTX = unknown,
> = {
  protocol: P;
  chains: C[];
  supply: (
    ctx: CTX,
    amount: NatAmount,
    src: AccountInfoFor[C],
  ) => Promise<void>;
  withdraw: (
    ctx: CTX,
    amount: NatAmount,
    dest: AccountInfoFor[C],
    claim?: boolean,
  ) => Promise<void>;
};

/**
 * **Failure Handling**: Attempts to unwind failed operations, but recovery
 * itself can fail. In that case, publishes final asset location to vstorage
 * and gives up. Clients must manually rebalance to recover.
 */
const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
  flowId: number,
  traceFlow: TraceLogger,
  accounts: AccountsByChain,
) => {
  await null; // cf. wiki:NoNestedAwait
  reporter.publishFlowSteps(
    flowId,
    moves.map(({ apply: _a, recover: _r, ...data }) => data),
  );

  let step = 1;
  try {
    for (const move of moves) {
      const traceStep = traceFlow.sub(`step${step}`);
      traceStep('starting', moveStatus(move));
      const { amount, how } = move;
      reporter.publishFlowStatus(flowId, { state: 'run', step, how });
      const { srcPos, destPos } = await move.apply(accounts, traceStep);
      traceStep('done:', how);

      if (srcPos) {
        srcPos.recordTransferOut(amount);
      }
      if (destPos) {
        destPos.recordTransferIn(amount);
      }
      step += 1;
    }
    reporter.publishFlowStatus(flowId, { state: 'done' });
    // TODO(#NNNN): delete the flow storage node
  } catch (err) {
    traceFlow('⚠️ step', step, ' failed', err);
    const failure = moves[step - 1];
    const errStep = step;
    while (step > 1) {
      step -= 1;
      const traceStep = traceFlow.sub(`step${step}`);
      const move = moves[step - 1];
      const how = `unwind: ${move.how}`;
      reporter.publishFlowStatus(flowId, { state: 'undo', step, how });
      try {
        await move.recover(accounts, traceStep);
      } catch (errInUnwind) {
        traceStep('⚠️ unwind failed', errInUnwind);
        // if a recover fails, we just give up and report `where` the assets are
        const { dest: where } = move;
        reporter.publishFlowStatus(flowId, {
          state: 'fail',
          step,
          how,
          error: errmsg(errInUnwind),
          where,
        });
        throw errInUnwind;
      }
    }
    reporter.publishFlowStatus(flowId, {
      state: 'fail',
      step: errStep,
      how: failure.how,
      error: errmsg(err),
    });
    throw err;
  }
};

const provideCosmosAccount = async <C extends 'agoric' | 'noble'>(
  orch: Orchestrator,
  chainName: C,
  kit: GuestInterface<PortfolioKit>, // Guest<T>?
  tracePortfolio: TraceLogger,
): Promise<AccountInfoFor[C]> => {
  await null;
  const traceChain = tracePortfolio.sub(chainName);
  const promiseMaybe = kit.manager.reserveAccount(chainName);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<AccountInfoFor[C]>;
  }

  // We have the map entry reserved - use critical section pattern
  try {
    switch (chainName) {
      case 'noble': {
        const nobleChain = await orch.getChain('noble');
        traceChain('makeAccount()');
        const ica: NobleAccount = await nobleChain.makeAccount();
        traceChain('result:', coerceAccountId(ica.getAddress()));
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
        const lcaIn = await agoricChain.makeAccount();
        const reg = await lca.monitorTransfers(kit.tap);
        traceChain('Monitoring transfers for', lca.getAddress().value);
        const info: AccountInfoFor['agoric'] = {
          namespace: 'cosmos',
          chainName,
          lca,
          lcaIn,
          reg,
        };
        kit.manager.resolveAccount(info);
        return info as AccountInfoFor[C];
      }
      default:
        throw Error('unreachable');
    }
  } catch (reason) {
    traceChain('failed to make', reason);
    kit.manager.releaseAccount(chainName, reason);
    throw reason;
  }
};

const getAssetPlaceRefKind = (
  ref: AssetPlaceRef,
): 'pos' | 'accountId' | 'depositAddr' | 'seat' => {
  if (keys(PoolPlaces).includes(ref)) return 'pos';
  if (getKeywordOfPlaceRef(ref)) return 'seat';
  if (getChainNameOfPlaceRef(ref)) return 'accountId';
  if (ref === '+agoric') return 'depositAddr';
  throw Fail`bad ref: ${ref}`;
};

type Way =
  | { how: 'localTransfer' }
  | { how: 'withdrawToSeat' }
  | { how: 'send' }
  | { how: 'IBC'; src: 'agoric'; dest: 'noble' }
  | { how: 'IBC'; src: 'noble'; dest: 'agoric' }
  | { how: 'CCTP'; dest: AxelarChain }
  | { how: 'CCTP'; src: AxelarChain }
  | {
      how: YieldProtocol;
      /** pool we're supplying */
      poolKey: PoolKey;
      /** chain with account where assets will come from */
      src: SupportedChain;
    }
  | {
      how: YieldProtocol;
      /** pool we're withdrawing from */
      poolKey: PoolKey;
      /** chain with account where assets will go */
      dest: SupportedChain;
      claim?: boolean;
    };

// exported only for testing
export const wayFromSrcToDesc = (moveDesc: MovementDesc): Way => {
  const { src } = moveDesc;
  const { dest } = moveDesc;

  const srcKind = getAssetPlaceRefKind(src);
  switch (srcKind) {
    case 'pos': {
      const destName = getChainNameOfPlaceRef(dest);
      if (!destName)
        throw Fail`src pos must have account as dest ${q(moveDesc)}`;
      const poolKey = src as PoolKey;
      const { protocol } = PoolPlaces[poolKey];
      const feeRequired = ['Compound', 'Aave', 'Beefy'];
      moveDesc.fee ||
        !feeRequired.includes(protocol) ||
        Fail`missing fee ${q(moveDesc)}`;
      // XXX check that destName is in protocol.chains
      return {
        how: protocol,
        poolKey,
        dest: destName,
        claim: moveDesc.claim,
      };
    }

    case 'seat':
      ['@agoric', '+agoric'].includes(dest) ||
        Fail`src seat must have agoric account as dest ${q(moveDesc)}`;
      return { how: 'localTransfer' };

    case 'depositAddr':
      dest === '@agoric' || Fail`src +agoric must have dest @agoric`;
      return { how: 'send' };

    case 'accountId': {
      const srcName = getChainNameOfPlaceRef(src);
      assert(srcName);
      const destKind = getAssetPlaceRefKind(dest);
      switch (destKind) {
        case 'seat':
          return { how: 'withdrawToSeat' }; // XXX check that src is agoric
        case 'accountId': {
          const destName = getChainNameOfPlaceRef(dest);
          assert(destName);
          if (keys(AxelarChain).includes(destName)) {
            srcName === 'noble' || Fail`src for ${q(destName)} must be noble`;
            return { how: 'CCTP', dest: destName as AxelarChain };
          }
          if (keys(AxelarChain).includes(srcName)) {
            destName === 'noble' || Fail`dest for ${q(srcName)} must be noble`;
            return { how: 'CCTP', src: srcName as AxelarChain };
          }
          if (srcName === 'agoric' && destName === 'noble') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else if (srcName === 'noble' && destName === 'agoric') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else {
            throw Fail`no route between chains: ${q(moveDesc)}`;
          }
        }
        case 'pos': {
          const poolKey = dest as PoolKey;
          const { protocol } = PoolPlaces[poolKey];
          return { how: protocol, poolKey, src: srcName };
        }
        default:
          throw Fail`unreachable:${destKind} ${dest}`;
      }
    }
    default:
      throw Fail`unreachable: ${srcKind} ${src}`;
  }
};

const stepFlow = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  moves: MovementDesc[],
  kit: GuestInterface<PortfolioKit>,
  traceP: TraceLogger,
) => {
  const todo: AssetMovement[] = [];

  const makeEVMCtx = async (
    chain: AxelarChain,
    move: MovementDesc,
    lca: LocalAccount,
  ) => {
    const [axelar, feeAccount] = await Promise.all([
      orch.getChain('axelar'),
      ctx.contractAccount,
    ]);
    const { denom } = ctx.gmpFeeInfo;
    const fee = { denom, value: move.fee ? move.fee.value : 0n };
    const { axelarIds, gmpAddresses } = ctx;

    const evmCtx: EVMContext = harden({
      addresses: ctx.contracts[chain],
      lca,
      gmpFee: fee,
      gmpChain: axelar,
      axelarIds,
      gmpAddresses,
      resolverClient: ctx.resolverClient,
      feeAccount,
    });
    return evmCtx;
  };
  const makeEVMPoolCtx = async (
    chain: AxelarChain,
    move: MovementDesc,
    lca: LocalAccount,
    poolKey: PoolKey,
  ): Promise<EVMContext & { poolKey: PoolKey }> => {
    const evmCtx = await makeEVMCtx(chain, move, lca);
    return harden({ ...evmCtx, poolKey });
  };

  const makeEVMProtocolStep = <P extends 'Compound' | 'Aave' | 'Beefy'>(
    way: Way & { how: P },
    move: MovementDesc,
  ): AssetMovement => {
    // XXX move this check up to wayFromSrcToDesc
    const chainName = 'src' in way ? way.src : way.dest;
    assert(keys(AxelarChain).includes(chainName));
    const evmChain = chainName as AxelarChain;

    const pImpl = {
      Compound: CompoundProtocol,
      Aave: AaveProtocol,
      Beefy: BeefyProtocol,
    }[way.how];

    const { amount } = move;
    return harden({
      how: way.how,
      amount,
      src: move.src,
      dest: move.dest,
      apply: async ({ [evmChain]: gInfo, agoric }) => {
        assert(gInfo, evmChain);
        const accountId: AccountId = `${gInfo.chainId}:${gInfo.remoteAddress}`;
        const { poolKey, how } = way;
        const pos = kit.manager.providePosition(poolKey, how, accountId);
        const { lca } = agoric;
        const evmCtx = await makeEVMPoolCtx(evmChain, move, lca, poolKey);
        await null;
        if ('src' in way) {
          await pImpl.supply(evmCtx, amount, gInfo);
          return { destPos: pos };
        } else {
          await pImpl.withdraw(evmCtx, amount, gInfo, way.claim);
          return { srcPos: pos };
        }
      },
      recover: async ({ [evmChain]: gInfo }) => {
        assert(gInfo, evmChain);
        await null;
        if ('src' in way) {
          assert.fail('last step. cannot recover');
        } else {
          const { lca } = agoric;
          const { poolKey } = way;
          const evmCtx = await makeEVMPoolCtx(evmChain, move, lca, poolKey);
          await pImpl.supply(evmCtx, amount, gInfo);
        }
      },
    });
  };

  const { reporter } = kit;
  const flowId = reporter.allocateFlowId();
  const traceFlow = traceP.sub(`flow${flowId}`);

  traceFlow('checking', moves.length, 'moves');
  for (const [i, move] of entries(moves)) {
    const traceMove = traceP.sub(`move${i}`);
    // @@@ traceMove('wayFromSrcToDesc?', move);
    const way = wayFromSrcToDesc(move);
    const { amount } = move;
    switch (way.how) {
      case 'localTransfer': {
        const src = { seat, keyword: 'Deposit' };
        const amounts = harden({ Deposit: amount });
        todo.push({
          how: 'localTransfer',
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ agoric }) => {
            const { lca, lcaIn } = agoric;
            const account = move.dest === '+agoric' ? lcaIn : lca;
            await ctx.zoeTools.localTransfer(src.seat, account, amounts);
            return {};
          },
          recover: async ({ agoric }) => {
            const { lca, lcaIn } = agoric;
            const account = move.dest === '+agoric' ? lcaIn : lca;
            await ctx.zoeTools.withdrawToSeat(account, seat, amounts);
          },
        });
        break;
      }

      case 'withdrawToSeat': {
        const amounts = { Cash: amount };
        todo.push({
          how: 'withdrawToSeat',
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ agoric }) => {
            await ctx.zoeTools.withdrawToSeat(agoric.lca, seat, amounts);
            return {};
          },
          recover: async ({ agoric }) => {
            await ctx.zoeTools.localTransfer(seat, agoric.lca, amounts);
          },
        });
        break;
      }

      case 'send':
        todo.push({
          how: 'send',
          amount,
          src: move.src,
          dest: move.dest,
          apply: async ({ agoric }) => {
            const { lca, lcaIn } = agoric;
            await lcaIn.send(lca.getAddress(), amount);
            return {};
          },
          recover: async () => {
            traceMove('recover send is noop; not sending back to deposit LCA');
          },
        });
        break;

      case 'IBC': {
        assert(
          (way.src === 'agoric' && way.dest === 'noble') ||
            (way.src === 'noble' && way.dest === 'agoric'),
          `bug in wayFromSrcToDesc`,
        );
        const { how } = way.src === 'agoric' ? agoricToNoble : nobleToAgoric;
        const ctxI = { usdc: ctx.usdc };
        todo.push({
          how,
          amount,
          src: move.src,
          dest: move.dest,
          apply: async ({ agoric, noble }) => {
            assert(noble, 'nobleMentioned'); // per nobleMentioned below
            await null;
            if (way.src === 'agoric') {
              await agoricToNoble.apply(ctxI, amount, agoric, noble);
            } else {
              await nobleToAgoric.apply(ctxI, amount, noble, agoric);
            }
            return {};
          },
          recover: async ({ agoric, noble }) => {
            assert(noble); // per nobleMentioned below
            await null;
            if (way.src === 'agoric') {
              await agoricToNoble.recover(ctxI, amount, agoric, noble);
            } else {
              await nobleToAgoric.recover(ctxI, amount, noble, agoric);
            }
          },
        });

        break;
      }

      case 'CCTP': {
        const outbound = 'dest' in way;
        const { how } = outbound ? CCTP : CCTPfromEVM;
        const evmChain = outbound ? way.dest : way.src;

        todo.push({
          how,
          amount,
          src: move.src,
          dest: move.dest,
          apply: async ({ [evmChain]: gInfo, noble }) => {
            // If an EVM account is in a move, it's available
            // in the accounts arg, along with noble.
            assert(gInfo && noble, evmChain);
            await null;
            if (outbound) {
              await CCTP.apply(ctx, amount, noble, gInfo);
            } else {
              const evmCtx = await makeEVMCtx(evmChain, move, agoric.lca);
              await CCTPfromEVM.apply(evmCtx, amount, gInfo, noble);
            }
            return {};
          },
          recover: async ({ [evmChain]: gInfo, noble }) => {
            assert(gInfo && noble, evmChain);
            await null;
            if (outbound) {
              await CCTP.recover(ctx, amount, noble, gInfo);
            } else {
              await CCTPfromEVM.recover(ctx, amount, gInfo, noble);
            }
          },
        });

        break;
      }

      case 'USDN': {
        const vault = way.poolKey === 'USDNVault' ? 1 : undefined;
        const ctxU = { usdnOut: move?.detail?.usdnOut, vault };

        const isSupply = 'src' in way;

        todo.push({
          how: way.how,
          src: move.src,
          dest: move.dest,
          amount,
          apply: async ({ noble }) => {
            assert(noble); // per nobleMentioned below
            const acctId = coerceAccountId(noble.ica.getAddress());
            const pos = kit.manager.providePosition('USDN', 'USDN', acctId);
            await null;
            if (isSupply) {
              await protocolUSDN.supply(ctxU, amount, noble);
              return { destPos: pos };
            } else {
              await protocolUSDN.withdraw(ctxU, amount, noble, way.claim);
              return { srcPos: pos };
            }
          },
          recover: async ({ noble }) => {
            assert(noble); // per nobleMentioned below
            await null;
            if (isSupply) {
              Fail`no recovery from supply (final step)`;
            } else {
              await protocolUSDN.supply(ctxU, amount, noble);
            }
          },
        });

        break;
      }

      case 'Compound':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Compound' }, move));
        break;

      case 'Aave':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Aave' }, move));
        break;

      case 'Beefy':
        todo.push(makeEVMProtocolStep(way as Way & { how: 'Beefy' }, move));
        break;

      default:
        throw Fail`unreachable: ${way}`;
    }
  }

  const agoric = await provideCosmosAccount(orch, 'agoric', kit, traceFlow);

  /** run thunk(); on failure, report to vstorage */
  const forChain = async <T>(
    chain: SupportedChain,
    thunk: () => Promise<T>,
  ) => {
    await null;
    try {
      const result = await thunk();
      return result;
    } catch (err) {
      traceFlow('failed to make account for', chain, err);
      reporter.publishFlowStatus(flowId, {
        state: 'fail',
        step: 0,
        how: `makeAccount: ${chain}`,
        error: err && typeof err === 'object' ? err.message : `${err}`,
      });
      throw err;
    }
  };

  const evmAccts = await (async () => {
    const axelar = await orch.getChain('axelar');
    const { axelarIds } = ctx;

    const chainToAcct: Partial<Record<AxelarChain, GMPAccountInfo>> = {};
    const evmChains = Object.keys(AxelarChain) as unknown[];

    for (const move of moves) {
      const gmp = {
        chain: axelar,
        fee: move.fee?.value || 0n,
        axelarIds,
        evmGas: move.detail?.evmGas || 0n,
      };
      for (const ref of [move.src, move.dest]) {
        const maybeChain = getChainNameOfPlaceRef(ref);
        if (!evmChains.includes(maybeChain)) continue;
        const chain = maybeChain as AxelarChain;
        const info = await forChain(chain, () =>
          provideEVMAccount(chain, gmp, agoric.lca, ctx, kit),
        );
        chainToAcct[chain] = info;
      }
    }
    return harden(chainToAcct);
  })();

  traceFlow('EVM accounts ready', keys(evmAccts));
  const nobleMentioned = moves.some(m => [m.src, m.dest].includes('@noble'));
  const nobleInfo = await (nobleMentioned || keys(evmAccts).length > 0
    ? forChain('noble', () =>
        provideCosmosAccount(orch, 'noble', kit, traceFlow),
      )
    : undefined);
  const accounts: AccountsByChain = {
    agoric,
    ...(nobleInfo && { noble: nobleInfo }),
    ...evmAccts,
  };
  traceFlow('accounts for trackFlow', keys(accounts));

  await trackFlow(reporter, todo, flowId, traceFlow, accounts);
  traceFlow('stepFlow done');
};

/**
 * Rebalance portfolio positions between yield protocols.
 * More generally: move assets as instructed by client.
 *
 * **Non-Atomic Operations**: Cross-chain flows are not atomic. If operations
 * fail partway through, assets may be left in intermediate accounts.
 * Recovery is attempted but can also fail, leaving assets "stranded".
 *
 * **Client Recovery**: If rebalancing fails, check flow status in vstorage
 * and call rebalance() again to move assets to desired destinations.
 *
 * **Input Validation**: ASSUME caller validates args
 *
 * @param orch
 * @param ctx
 * @param seat - proposal guarded as per {@link makeProposalShapes}
 * @param offerArgs - guarded as per {@link makeOfferArgsShapes}
 * @param kit
 */
export const rebalance = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
) => {
  const id = kit.reader.getPortfolioId();
  const traceP = makeTracer('rebalance').sub(`portfolio${id}`);
  const proposal = seat.getProposal() as ProposalType['rebalance'];
  traceP('proposal', proposal.give, proposal.want, offerArgs);

  await null;
  try {
    if (offerArgs.targetAllocation) {
      kit.manager.setTargetAllocation(offerArgs.targetAllocation);
    } else if ((offerArgs.flow || []).some(step => step.dest === '+agoric')) {
      // steps include a deposit that the planner should respond to
      kit.manager.incrPolicyVersion();
    }

    if (offerArgs.flow) {
      await stepFlow(orch, ctx, seat, offerArgs.flow, kit, traceP);
    }

    if (!seat.hasExited()) {
      seat.exit();
    }
  } catch (err) {
    if (!seat.hasExited()) {
      seat.fail(err);
    }
    throw err;
  }
}) satisfies OrchestrationFlow;

export const parseInboundTransfer = (async (
  _orch: Orchestrator,
  _ctx: PortfolioInstanceContext,
  packet: VTransferIBCEvent['packet'],
  kit: PortfolioKit,
): Promise<Awaited<ReturnType<LocalAccount['parseInboundTransfer']>>> => {
  const { reader } = kit;

  const lca = reader.getLocalAccount();
  const parsed = await lca.parseInboundTransfer(packet);
  return parsed;
}) satisfies OrchestrationFlow;

/**
 * Offer handler to make a portfolio and, optionally, open yield positions.
 *
 * **Input Validation**: ASSUME caller validates args
 *
 * @param orch
 * @param ctx
 * @param seat - proposal guarded as per {@link makeProposalShapes}
 * @param offerArgs - guarded as per {@link makeOfferArgsShapes}
 * returns following continuing invitation pattern,
 * with a topic for the portfolio.
 */
export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: PortfolioBootstrapContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'],
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  const trace = makeTracer('openPortfolio');
  try {
    const { makePortfolioKit, ...ctxI } = ctx;
    const { inertSubscriber } = ctxI;
    const kit = makePortfolioKit();
    const id = kit.reader.getPortfolioId();
    const traceP = trace.sub(`portfolio${id}`);
    traceP('portfolio opened');
    await provideCosmosAccount(orch, 'agoric', kit, traceP);

    if (!seat.hasExited()) {
      try {
        await rebalance(orch, ctxI, seat, offerArgs, kit);
      } catch (err) {
        traceP('⚠️ rebalance failed', err);
        if (!seat.hasExited()) seat.fail(err);
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
    trace('🚨 openPortfolio flow failed', err);
    throw err;
  }
  /* c8 ignore end */
}) satisfies OrchestrationFlow;
harden(openPortfolio);

export const makeLCA = (async (orch: Orchestrator): Promise<LocalAccount> => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
}) satisfies OrchestrationFlow;
harden(makeLCA);
