/**
 * @file Shared helpers for the portfolio.contract.*.test.ts suites.
 *
 * Extracted verbatim from portfolio.contract.test.ts so the suite can be split
 * across files (AVA runs one worker per file) without duplicating setup.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import assert from 'node:assert/strict';
import { type NatAmount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import { fromTypedEntries, objectMap, typedEntries } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema as rawDocumentStorageSchema,
  type makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import {
  eventLoopIteration,
  testInterruptedSteps,
  type TestStep,
} from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import {
  AxelarChain,
  InstrumentId,
  type FundsFlowPlan,
  type PortfolioAutoFeatures,
} from '@agoric/portfolio-api';
import { type TargetAllocation as PermittedAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { MapStore } from '@agoric/store';
import type { Baggage } from '@agoric/vat-data';
import type { ZoeService } from '@agoric/zoe';
import { Fail } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { E, passStyleOf } from '@endo/far';
import { type ExecutionContext } from 'ava';
import {
  makeEip155ChainIdToAxelarChain,
  type EVMContractAddresses,
  type PortfolioPrivateArgs,
} from '../src/portfolio.contract.ts';
import {
  type AssetPlaceRef,
  type MovementDesc,
  type OfferArgsFor,
} from '../src/type-guards-steps.ts';
import {
  type ProposalType,
  type StatusFor,
  type TargetAllocation,
} from '../src/type-guards.ts';
import {
  makeEvmTraderKit,
  provideMakePrivateArgs,
  setupTrader,
  simulateAckTransferToAxelar,
  simulateCCTPAck,
} from './contract-setup.ts';
import {
  contractsMock,
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
} from './mocks.ts';
import { makeStorageTools } from './supports.ts';
import { timeAsync, timeSync } from './test-timing.ts';

const { fromEntries, keys, values } = Object;

const evmTraderPrivateKeys = [
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
] as const;

const range = (n: number) => [...Array(n).keys()];

type FakeStorage = ReturnType<typeof makeFakeStorageKit>;
type PortfolioStatus = StatusFor['portfolio'];
type RunningFlows = NonNullable<PortfolioStatus['flowsRunning']>;
type RunningFlowKey = keyof RunningFlows;
type RunningFlowDetail = RunningFlows[RunningFlowKey];
type EvmTraderKit = Awaited<ReturnType<typeof makeEvmTraderKit>>;
type DirectPlannerClient = ReturnType<typeof makeDirectPlannerClient>;

const pendingTxOpts = {
  pattern: `${ROOT_STORAGE_PATH}.`,
  replacement: 'published.',
  node: `pendingTxs`,
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

const snapshotTimed = (t: ExecutionContext, value: unknown, message?: string) =>
  timeSync(t, `snapshot${message ? `:${message}` : ''}`, () =>
    t.snapshot(value, message),
  );

const documentStorageSchemaTimed = (
  t: ExecutionContext,
  storage: Parameters<typeof rawDocumentStorageSchema>[1],
  opts: Parameters<typeof rawDocumentStorageSchema>[2],
) =>
  timeAsync(t, 'documentStorageSchema', () =>
    rawDocumentStorageSchema(t, storage, opts),
  );

const getRunningFlowEntries = (
  flowsRunning: RunningFlows = {},
): [RunningFlowKey, RunningFlowDetail][] =>
  Object.entries(flowsRunning) as [RunningFlowKey, RunningFlowDetail][];

const getTargetAllocationEntries = (
  targetAllocation: TargetAllocation,
): [InstrumentId, bigint][] =>
  Object.entries(targetAllocation) as [InstrumentId, bigint][];

const getFlowHistory = (
  portfolioKey: string,
  flowCount: number,
  storage: FakeStorage,
) => {
  const flowPaths = range(flowCount).map(
    ix => `${portfolioKey}.flows.flow${ix + 1}`,
  );
  const flowEntries: [string, StatusFor['flow'][]][] = flowPaths.flatMap(p =>
    storage.data.has(p) ? [[p, storage.getDeserialized(p)]] : [],
  );
  const stepsEntries = flowPaths
    .map(fp => `${fp}.steps`)
    .flatMap(fsp =>
      storage.data.has(fsp) ? [[fsp, storage.getDeserialized(fsp).at(-1)]] : [],
    );
  const zipped = flowEntries.flatMap((e, ix) =>
    stepsEntries[ix] ? [e, stepsEntries[ix]] : [e],
  );
  return {
    flowPaths,
    byFlow: fromEntries(zipped),
  };
};

/** current vstorage for portfolio, positions; full history for flows */
const getPortfolioInfo = (key: string, storage: FakeStorage) => {
  const info: StatusFor['portfolio'] = storage.getDeserialized(key).at(-1);
  const { positionKeys, flowCount } = info;
  const posPaths = positionKeys.map(k => `${key}.positions.${k}`);
  const posEntries = posPaths.map(p => [p, storage.getDeserialized(p).at(-1)]);
  const { flowPaths, byFlow } = getFlowHistory(key, flowCount, storage);
  const agentsPath = `${key}.agents`;
  const agentsEntries = storage.data.has(agentsPath)
    ? [[agentsPath, storage.getDeserialized(agentsPath).at(-1)]]
    : [];
  const contents = {
    ...fromEntries([[key, info], ...posEntries]),
    ...byFlow,
    ...fromEntries(agentsEntries),
  };
  return { contents, positionPaths: posPaths, flowPaths };
};

const ackNFA = (utils, ix = 0) =>
  utils.transmitVTransferEvent('acknowledgementPacket', ix);

const makeDirectPlannerClient = (zoe, creatorFacet) => {
  let planner;
  return harden({
    redeem: async () => {
      const invitation = await E(creatorFacet).makePlannerInvitation();
      const seat = await E(zoe).offer(invitation);
      planner = await E(seat).getOfferResult();
    },
    get stub() {
      assert(planner);
      return planner;
    },
  });
};

type Trader = Awaited<ReturnType<typeof setupTrader>>['trader1'];

/**
 * Offer args as tests used to write them, with the steps in the offer. The
 * contract no longer accepts them there; see makePlannedTrader.
 */
type PlannedOfferArgs<K extends 'openPortfolio' | 'rebalance'> =
  OfferArgsFor[K] & { flow?: MovementDesc[] };

const isAccountOrSeatRef = (ref: string) => /^[@<+]/.test(ref);

/** A target allocation weighted by how much a flow moves into each instrument. */
const allocationOfFlow = (flow: MovementDesc[]): TargetAllocation => {
  const weights = new Map<string, bigint>();
  for (const { dest, amount } of flow) {
    if (isAccountOrSeatRef(dest)) continue;
    weights.set(dest, (weights.get(dest) ?? 0n) + amount.value);
  }
  // Any instrument will do when the flow only reaches accounts.
  if (weights.size === 0) return harden({ USDN: 1n });
  return harden(fromEntries(weights)) as TargetAllocation;
};

/**
 * Offers can't carry a plan: only the planner supplies a flow's steps.
 * This wraps a trader so a test can still say which steps a flow
 * runs, as tests used to do through the offer. Each offer goes out without
 * the steps, and the test's planner resolves the flow it starts with them.
 *
 * - `openPortfolio` with a `Deposit` sends a `targetAllocation` (derived from
 *   the steps unless given) so that the open starts a deposit flow.
 *   Without a `Deposit`, the open starts no flow, so the steps run in a
 *   `SimpleRebalance` once the portfolio is open.
 * - `rebalance` uses `SimpleRebalance`. Without steps, the planner resolves
 *   the flow with none.
 */
const makePlannedTrader = (
  trader: Trader,
  providePlanner: () => Promise<DirectPlannerClient['stub']>,
) => {
  /** The plan of the latest call, which may only be requested later on. */
  let lastPlanned: Promise<number> = Promise.resolve(0);
  /** Note the start of a call that plans a flow, so whenPlanned waits for it. */
  const notePlanning = () => {
    const kit = makePromiseKit<number>();
    // Callers see failures through the offer; don't also report them here.
    kit.promise.catch(() => {});
    lastPlanned = kit.promise;
    return kit;
  };

  /** Resolve the portfolio's next flow awaiting steps with `flow`. */
  const resolveNextFlow = async (flow: MovementDesc[]) => {
    const stub = await providePlanner();
    for (let attempt = 0; attempt < 200; attempt += 1) {
      await eventLoopIteration();
      let status: PortfolioStatus;
      try {
        status = await trader.getPortfolioStatus();
      } catch {
        continue; // portfolio not known or published yet
      }
      const { flowsRunning, policyVersion, rebalanceCount } = status;
      const awaiting = getRunningFlowEntries(flowsRunning).find(
        ([, detail]) => detail.awaitingSteps,
      );
      if (!awaiting) continue;
      const flowId = Number(awaiting[0].replace('flow', ''));
      const plan: FundsFlowPlan = { flow };
      await E(stub).resolvePlan(
        trader.getPortfolioId(),
        flowId,
        plan,
        policyVersion,
        rebalanceCount,
      );
      return flowId;
    }
    throw Error('no flow awaiting steps');
  };

  /** Make an offer, and concurrently resolve the flow it starts with `flow`. */
  const offerAndPlan = async <T>(
    planning: ReturnType<typeof notePlanning>,
    offer: () => Promise<T>,
    flow: MovementDesc[],
  ) => {
    const plannedP = resolveNextFlow(flow);
    planning.resolve(plannedP);
    const [result] = await Promise.all([offer(), plannedP]);
    return result;
  };

  /**
   * The planner rejects plans that reach instruments outside the target
   * allocation, so add any such instrument, weighted by what the steps move.
   */
  const allocationCovering = async (
    flow: MovementDesc[],
  ): Promise<TargetAllocation | undefined> => {
    const { targetAllocation: current = {} } =
      await trader.getPortfolioStatus();
    const added = typedEntries(allocationOfFlow(flow)).filter(
      ([key]) => !(key in current) && flow.some(({ dest }) => dest === key),
    );
    if (added.length === 0) return undefined;
    return harden({ ...current, ...fromTypedEntries(added) });
  };

  const rebalanceWith = async (
    planning: ReturnType<typeof notePlanning>,
    t: ExecutionContext,
    proposal: ProposalType['rebalance'],
    { flow = [], ...offerArgs }: PlannedOfferArgs<'rebalance'>,
  ) => {
    const { Deposit } = (proposal.give ?? {}) as { Deposit?: NatAmount };
    const { Cash } = (proposal.want ?? {}) as { Cash?: NatAmount };
    if (!Deposit && !Cash) {
      const targetAllocation =
        offerArgs.targetAllocation ?? (await allocationCovering(flow));
      const args = targetAllocation ? { targetAllocation } : {};
      return offerAndPlan(
        planning,
        () => trader.simpleRebalance(t, proposal, args),
        flow,
      );
    }
    offerArgs.targetAllocation === undefined ||
      Fail`no targetAllocation with a Deposit or Cash`;
    const offer = () =>
      Deposit ? trader.deposit(t, Deposit) : trader.withdraw(t, Cash!);
    return offerAndPlan(planning, offer, flow);
  };

  /**
   * For callers that only have a proposal, like the CSV-driven scenarios.
   * The planner only accepts `<Deposit>` in a deposit flow and `<Cash>` in a
   * withdraw flow, so this uses the invitation that starts the matching flow:
   * Deposit, Withdraw, or else SimpleRebalance. Prefer `deposit` / `withdraw`
   * when the intent is known.
   */
  const rebalance = async (
    t: ExecutionContext,
    proposal: ProposalType['rebalance'],
    offerArgs: PlannedOfferArgs<'rebalance'> = {},
  ) => rebalanceWith(notePlanning(), t, proposal, offerArgs);

  const openPortfolio = async (
    t: ExecutionContext,
    give: ProposalType['openPortfolio']['give'],
    { flow, ...offerArgs }: PlannedOfferArgs<'openPortfolio'> = {},
  ) => {
    if (!flow) return trader.openPortfolio(t, give, offerArgs);
    const planning = notePlanning();
    try {
      if (!give.Deposit) {
        // An open can't withdraw, so pay out any `<Cash>` steps separately,
        // with the payouts the single offer would have had.
        const cashOut = flow
          .filter(({ dest }) => dest === '<Cash>')
          .map(({ amount }) => amount);
        const want = cashOut.length
          ? { Cash: cashOut.reduce((a, b) => AmountMath.add(a, b)) }
          : {};
        const opened = await trader.openPortfolio(t, give, offerArgs);
        const done = await rebalanceWith(
          planning,
          t,
          { give: {}, want } as ProposalType['rebalance'],
          { flow },
        );
        return { ...opened, payouts: { ...opened.payouts, ...done.payouts } };
      }
      const targetAllocation =
        offerArgs.targetAllocation ?? allocationOfFlow(flow);
      const offer = () =>
        trader.openPortfolio(t, give, { ...offerArgs, targetAllocation });
      return await offerAndPlan(planning, offer, flow);
    } catch (reason) {
      planning.reject(reason);
      throw reason;
    }
  };

  /**
   * Wait until the planner has resolved the latest flow's steps and the flow
   * has had a chance to start them. The steps arrive a few turns after the
   * offer, so wait for this before acknowledging what the steps send.
   */
  const whenPlanned = async () => {
    const flowId = await lastPlanned;
    await eventLoopIteration();
    return flowId;
  };

  /** Deposit through the Deposit invitation; the planner runs `flow`. */
  const deposit = async (
    t: ExecutionContext,
    Deposit: NatAmount,
    flow: MovementDesc[] = [],
  ) =>
    rebalanceWith(notePlanning(), t, { give: { Deposit }, want: {} }, { flow });

  /** Withdraw through the Withdraw invitation; the planner runs `flow`. */
  const withdraw = async (
    t: ExecutionContext,
    Cash: NatAmount,
    flow: MovementDesc[] = [],
  ) => rebalanceWith(notePlanning(), t, { give: {}, want: { Cash } }, { flow });

  return harden({
    ...trader,
    openPortfolio,
    rebalance,
    deposit,
    withdraw,
    whenPlanned,
  });
};

/**
 * Like setupTrader, but `trader1` is wrapped by makePlannedTrader with its
 * own planner, so tests can name the steps of the flows its offers start.
 */
/**
 * A planner for makePlannedTrader, redeemed on first use. Reuses `planner`
 * when given, e.g. setupPlanner's `planner1`, whether or not it is redeemed.
 */
const makePlannerProvider = (
  zoe: ZoeService,
  creatorFacet: Parameters<typeof makeDirectPlannerClient>[1],
  planner: DirectPlannerClient = makeDirectPlannerClient(zoe, creatorFacet),
) => {
  let redeemed: Promise<void> | undefined;
  return async () => {
    try {
      return planner.stub;
    } catch {
      await (redeemed ||= planner.redeem());
      return planner.stub;
    }
  };
};

/**
 * Like setupTrader, but its traders are wrapped by makePlannedTrader with a
 * shared planner, so tests can name the steps of the flows their offers start.
 */
const setupPlannedTrader = async (...args: Parameters<typeof setupTrader>) => {
  const setup = await setupTrader(...args);
  const { zoe, started, trader1, trader2, makeFundedTrader } = setup;
  const providePlanner = makePlannerProvider(zoe, started.creatorFacet);
  const plan = (trader: Trader) => makePlannedTrader(trader, providePlanner);
  return {
    ...setup,
    trader1: plan(trader1),
    trader2: trader2 && plan(trader2),
    makeFundedTrader: async () => plan(await makeFundedTrader()),
    providePlanner,
  };
};

const resolveDepositPlan = async (
  {
    portfolioId: pId,
    overrideTargetAllocation,
    separateMakeAccount,
  }: {
    portfolioId: number;
    overrideTargetAllocation?: TargetAllocation;
    separateMakeAccount?: boolean;
  },
  powers: Pick<
    Awaited<ReturnType<typeof setupPlanner>>,
    'planner1' | 'txResolver' | 'common'
  > & {
    evmTrader: EvmTraderKit['evmTrader'];
  },
) => {
  const { planner1, evmTrader, txResolver, common } = powers;
  const { usdc, bld } = common.brands;

  const status = await evmTrader.getPortfolioStatus();
  const { flowsRunning = {}, policyVersion, rebalanceCount } = status;
  const targetAllocation = overrideTargetAllocation ?? status.targetAllocation;
  const [[flowKey, detail]] = getRunningFlowEntries(flowsRunning);
  if (detail.type !== 'deposit')
    throw new Error(`Unexpected flow ${detail.type}`);

  const fromChain = detail.fromChain! as AxelarChain;
  if (!fromChain) throw new Error('deposit detail missing fromChain');
  if (!(fromChain in contractsMock)) {
    throw new Error(`unexpected fromChain for EVM deposit: ${fromChain}`);
  }

  const totalAllocation = getTargetAllocationEntries(targetAllocation!).reduce(
    (sum, [instrument, portion]) => {
      if (
        instrument !== `@${fromChain}` &&
        !instrument.endsWith(`_${fromChain}`)
      )
        throw new Error(
          `Test allocation instrument ${instrument} must stay on deposit chain ${fromChain}`,
        );
      return sum + portion;
    },
    0n,
  );

  const sync = [policyVersion, rebalanceCount] as const;
  const flowId = Number(flowKey.replace('flow', ''));
  const planDepositAmount = AmountMath.make(usdc.brand, detail.amount.value);
  const fee = bld.units(100);
  const plan: FundsFlowPlan = {
    flow: [
      {
        src: `+${fromChain}`,
        dest: `@${fromChain}`,
        amount: planDepositAmount,
        fee,
      },
      ...Object.entries(targetAllocation!).flatMap(
        ([instrument, portion]: [InstrumentId | `@${AxelarChain}`, bigint]) =>
          instrument === `@${fromChain}`
            ? []
            : ({
                src: `@${fromChain}`,
                dest: instrument,
                amount: AmountMath.make(
                  usdc.brand,
                  (portion * planDepositAmount.value) / totalAllocation,
                ),
                fee,
              } as const),
      ),
    ],
  };
  await E(planner1.stub).resolvePlan(pId, flowId, plan, ...sync);

  // Acknowledge each distinct outgoing IBC transfer the flow issues. A deposit
  // flow that opens a portfolio from an EVM wallet provisions the Noble account
  // lazily, so its step-flow issues an extra transfer (the Noble Forwarding
  // Account registration) alongside the account-creation GMP. Both appear
  // together, so acking "the newest un-acknowledged transfer" (rather than
  // always the very last one) drives each to completion. The outgoing-transfer
  // log is append-only, so an absolute index is a stable identity for a
  // transfer already acknowledged.
  const ackedTransferIndices = new Set<number>();
  const countOutgoingTransfers = () => {
    let count = 0;
    for (;;) {
      try {
        common.utils.outgoingTransferAt(count);
      } catch {
        return count;
      }
      count += 1;
    }
  };
  const ackNewestUnacknowledgedTransfer = async () => {
    await eventLoopIteration();
    const total = countOutgoingTransfers();
    for (let index = total - 1; index >= 0; index -= 1) {
      if (ackedTransferIndices.has(index)) continue;
      ackedTransferIndices.add(index);
      await common.utils.transmitVTransferEvent('acknowledgementPacket', index);
      return;
    }
  };

  const flowStillRunning = async () => {
    const pstat = await evmTrader.getPortfolioStatus();
    return !!pstat.flowsRunning?.[flowKey];
  };

  // The contract will issue a separate GMP for make account, not accounted in
  // the steps above, so ack it.
  if (separateMakeAccount) {
    await ackNewestUnacknowledgedTransfer();
    await txResolver.drainPending();
  }

  // Drive the flow to completion: acknowledge each outgoing transfer and settle
  // pending GMP/CCTP transactions until the flow leaves flowsRunning. Lazy Noble
  // provisioning issues its transfer partway through the flow, so a fixed
  // per-step ack count is not enough; loop until the flow is done, bounded well
  // above the number of transfers any deposit plan issues.
  const maxDrainRounds = plan.flow.length + 4;
  for (let round = 0; round < maxDrainRounds; round += 1) {
    if (!(await flowStillRunning())) break;
    await ackNewestUnacknowledgedTransfer();
    await txResolver.drainPending();
  }

  return flowId;
};

const beefyTestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, txResolver } = await setupPlannedTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);

    const actualP = trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
          { src: '@Arbitrum', dest: vaultKey, amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration(); // let IBC message go out
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    t.log('ackd send to Axelar to create account');

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );
    const actual = await actualP;

    t.log('=== Portfolio completed');
    const result = actual.result as any;
    t.is(passStyleOf(result.invitationMakers), 'remotable');

    t.is(keys(result.publicSubscribers).length, 1);
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const { storage } = common.bootstrap;
    const { contents } = getPortfolioInfoTimed(t, storagePath, storage);
    snapshotTimed(t, contents, 'vstorage');
    await documentStorageSchemaTimed(t, storage, pendingTxOpts);
    snapshotTimed(t, actual.payouts, 'refund payouts');
  },
  title(providedTitle = '', vaultKey: AssetPlaceRef) {
    return `${providedTitle} ${vaultKey}`.trim();
  },
});

const setupPlanner = async (
  t: ExecutionContext,
  overrides: Partial<
    PortfolioPrivateArgs & {
      useRouter: boolean;
      useVerifiedSigner: boolean;
      includeEvmKit: boolean;
    }
  > = {},
): Promise<
  Awaited<ReturnType<typeof setupTrader>> & {
    planner1: DirectPlannerClient;
    readPublished: ReturnType<typeof makeStorageTools>['readPublished'];
  } & Partial<EvmTraderKit>
> => {
  const {
    useRouter,
    useVerifiedSigner,
    includeEvmKit = false,
    ...restOverrides
  } = overrides;
  const {
    common,
    zoe,
    started,
    makeFundedTrader,
    postalService,
    trader1,
    txResolver,
    timerService,
    contractBaggage,
  } = await timeAsync(t, 'setupPlanner:setupTrader', () =>
    setupTrader(t, undefined, restOverrides),
  );
  const { storage } = common.bootstrap;
  const { readPublished } = makeStorageTools(storage);
  const planner1 = makeDirectPlannerClient(zoe, started.creatorFacet);
  const evmKit = includeEvmKit
    ? await timeAsync(t, 'setupPlanner:makeEvmTraderKit', () =>
        makeEvmTraderKit(
          {
            common,
            zoe,
            started,
            postalService,
            timerService,
            contractBaggage,
          },
          {
            useRouter,
            useVerifiedSigner,
          },
        ),
      )
    : {};
  return {
    common,
    zoe,
    started,
    makeFundedTrader,
    trader1,
    planner1,
    postalService,
    readPublished,
    txResolver,
    timerService,
    contractBaggage,
    ...evmKit,
  };
};

const setupEvmPlanner = async (
  t,
  overrides: Partial<PortfolioPrivateArgs & { useRouter: boolean }> = {},
): Promise<Awaited<ReturnType<typeof setupPlanner>> & EvmTraderKit> => {
  const powers = await setupPlanner(t, { ...overrides, includeEvmKit: true });
  assert(powers.evmTrader);
  assert(powers.evmAccount);
  return powers as Awaited<ReturnType<typeof setupPlanner>> & EvmTraderKit;
};

const getPortfolioInfoTimed = (
  t: ExecutionContext,
  key: string,
  storage: FakeStorage,
) => timeSync(t, 'getPortfolioInfo', () => getPortfolioInfo(key, storage));

const makeEvmPlannerPowers = async (
  t: ExecutionContext,
  shared: Awaited<ReturnType<typeof setupPlanner>>,
  ix: number,
  useRouter: boolean,
  useVerifiedSigner: boolean,
) => {
  const baseLabel = useRouter ? 'routed' : 'legacy';
  const label = useVerifiedSigner ? `${baseLabel} - smart account` : baseLabel;
  const planner1 = makeDirectPlannerClient(
    shared.zoe,
    shared.started.creatorFacet,
  );
  const evmKit = await timeAsync(t, `makeEvmTraderKit:${label}`, () =>
    makeEvmTraderKit(shared, {
      useRouter,
      useVerifiedSigner,
      privateKey: evmTraderPrivateKeys[ix],
    }),
  );
  return { label, powers: { ...shared, planner1, ...evmKit } };
};

const doOpenEvmPortfolio = async (
  _shared: Awaited<ReturnType<typeof setupPlanner>>,
  inputs: {
    fromChain: AxelarChain;
    depositAmount: NatAmount;
    allocations: PermittedAllocation[];
    features?: Required<PortfolioAutoFeatures>;
  },
  powers: Awaited<ReturnType<typeof makeEvmPlannerPowers>>['powers'],
) => {
  const { planner1, evmTrader } = powers;

  await planner1.redeem();
  const result = await evmTrader
    .forChain(inputs.fromChain)
    .openPortfolio(inputs.allocations, inputs.depositAmount.value, {
      features: inputs.features,
    });
  await eventLoopIteration();
  const flowNum = await resolveDepositPlan(
    { portfolioId: evmTrader.getPortfolioId() },
    powers,
  );

  return { ...result, flowNum };
};

const setupEvmRemoteAccountConfigTest = (
  mapContractEntry: (
    value: `0x${string}` | undefined,
    key: keyof EVMContractAddresses,
    chain: AxelarChain,
  ) => `0x${string}` | undefined = value => value,
) => {
  const makePrivateArgs = provideMakePrivateArgs({} as any, undefined as any);
  const { chainInfo, contracts: originalContracts } = makePrivateArgs();
  const chainIdToAxelarChain = makeEip155ChainIdToAxelarChain(chainInfo);

  const contracts = objectMap(
    originalContracts,
    (addresses, chain) =>
      fromTypedEntries(
        typedEntries(addresses).flatMap(([key, value]) => {
          // `value` is typed `EVMContractAddressesMap[K][string]` via
          // the indexed access from typedEntries; TypeScript can't
          // narrow that to `\`0x${string}\` | undefined` without the
          // explicit cast, even though every concrete entry in the
          // EVMContractAddressesMap union has that value shape.
          const mappedValue = mapContractEntry(
            value as `0x${string}` | undefined,
            key as keyof EVMContractAddresses,
            chain,
          );
          return mappedValue ? [[key, mappedValue]] : [];
        }),
      ) as EVMContractAddresses,
  );

  return {
    chainIdToAxelarChain,
    contracts,
  };
};

const makeCreateAndDepositScenarioRunner = (
  t: ExecutionContext,
  powers: Awaited<ReturnType<typeof setupPlanner>>,
) => {
  const { common, makeFundedTrader, planner1, readPublished, started } = powers;
  const { usdc } = common.brands;

  type Input = {
    trader1: Awaited<ReturnType<typeof makeFundedTrader>>;
    traderP: Promise<void>;
    plannerP: Promise<void>;
    pId: number;
  };

  let nextPortfolioId = 0;

  return async (
    testOpts: {
      restartOverrides?: Partial<PortfolioPrivateArgs>;
    } = {},
  ) => {
    await planner1.redeem();

    // makeFundedTrader creates an external, single-use trader fixture; no
    // portfolio exists yet, so restarting around it exercises no recovery path.
    // Run it as per-run setup rather than as an interruption boundary. (It is a
    // single-use actor — openPortfolio throws once a portfolio is open — so it
    // must be created fresh per run, which `setup` does.)
    const setup = async (): Promise<Partial<Input>> => {
      const trader1 = await makeFundedTrader();
      t.log('trader1 created');
      return { trader1 };
    };

    const allSteps: TestStep[] = typedEntries({
      startOpenPortfolio: async (opts, label) => {
        const Deposit = usdc.units(1_000);
        const traderP = (async () => {
          await opts.trader1?.openPortfolio(
            t,
            { Deposit },
            { targetAllocation: { USDN: 1n } },
          );
          t.log(`${label} trader created with deposit`, Deposit);
        })();

        const pId = nextPortfolioId;
        nextPortfolioId += 1;
        await ackNFA(common.utils, -1);
        return { ...opts, traderP, pId };
      },
      resolvePlan: (opts, label) => {
        const plannerP = (async () => {
          const getStatus = async pId => {
            const x = await readPublished(`portfolios.portfolio${pId}`);
            return x as unknown as StatusFor['portfolio'];
          };

          const pId = opts.pId!;
          const {
            flowsRunning = {},
            policyVersion,
            rebalanceCount,
          } = await getStatus(pId);
          t.is(
            keys(flowsRunning).length,
            1,
            `${label} flowsRunning for ${pId}`,
          );
          const [[flowId, detail]] = getRunningFlowEntries(flowsRunning);
          const fId = Number(flowId.replace('flow', ''));

          if (detail.type !== 'deposit') throw t.fail(detail.type);

          const amount = AmountMath.make(usdc.brand, detail.amount.value);
          const plan: FundsFlowPlan = {
            flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
          };
          await E(planner1.stub).resolvePlan(
            pId,
            fId,
            plan,
            policyVersion,
            rebalanceCount,
          );
          t.log(`${label} planner resolved plan`);
        })();

        return { ...opts, plannerP };
      },
      syncTraderAndPlanner: async (opts, label) => {
        await Promise.all([opts.traderP, opts.plannerP]);
        t.log(`${label} trader and planner synced`);
        return opts;
      },
    } satisfies Record<string, TestStep<Input>[1]>);

    // verifyBankIO only reads (inspectBankBridge, getPortfolioStatus) and
    // asserts; it mutates nothing, so it is an outcome check rather than an
    // interruption boundary. Run it as a postcondition after each completed run.
    const verifyBankIO = async (
      _t: ExecutionContext,
      opts: Partial<Input>,
      label: string,
    ) => {
      const bankTraffic = common.utils.inspectBankBridge();
      const { accountIdByChain } =
        (await opts.trader1?.getPortfolioStatus()) ?? {};
      const agoricAccountId = accountIdByChain?.agoric;
      if (!agoricAccountId)
        throw t.fail(`${label}: portfolio status missing agoric accountId`);
      const [_ns, _ref, addr] = agoricAccountId.split(':');
      const myVBankIO = bankTraffic.filter(obj =>
        [obj.sender, obj.recipient].includes(addr),
      );
      t.log(`${label} bankBridge for`, addr, myVBankIO);
      t.like(myVBankIO, [{ type: 'VBANK_GIVE', amount: '1000000000' }]);
    };

    const interrupt =
      testOpts.restartOverrides &&
      (async () => {
        await t.throwsAsync(
          async () => {
            const privateArgs = common.utils.makePrivateArgs(
              testOpts.restartOverrides,
            );
            await E(started.adminFacet).restartContract(privateArgs);
          },
          { message: 'upgrade not faked' },
        );
      });
    await testInterruptedSteps(t, allSteps, interrupt, {
      setup,
      postcondition: verifyBankIO,
    });
  };
};

const erc4626TestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, txResolver } = await setupPlannedTrader(t);
    const { usdc, bld, poc26 } = common.brands;

    const amount = usdc.units(3_333.33);
    const feeAcct = bld.make(100n);
    const feeCall = bld.make(100n);

    const actualP = trader1.openPortfolio(
      t,
      { Deposit: amount, Access: poc26.make(1n) },
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Ethereum', amount, fee: feeAcct },
          { src: '@Ethereum', dest: vaultKey, amount, fee: feeCall },
        ],
      },
    );

    await eventLoopIteration(); // let IBC message go out
    await ackNFA(common.utils);
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -2);
    t.log('ackd send to Axelar to create account');

    await simulateCCTPAck(common.utils).finally(() =>
      txResolver
        .drainPending()
        .then(() => simulateAckTransferToAxelar(common.utils)),
    );
    const actual = await actualP;

    t.log('=== Portfolio completed');
    const result = actual.result as any;
    t.is(passStyleOf(result.invitationMakers), 'remotable');

    t.is(keys(result.publicSubscribers).length, 1);
    const { storagePath } = result.publicSubscribers.portfolio;
    t.log(storagePath);
    const { contents } = getPortfolioInfoTimed(
      t,
      storagePath,
      common.bootstrap.storage,
    );
    snapshotTimed(t, contents, 'vstorage');
    snapshotTimed(t, actual.payouts, 'refund payouts');
  },
  title(providedTitle = '', vaultKey: AssetPlaceRef) {
    return `${providedTitle} ${vaultKey}`.trim();
  },
});

/**
 * Make a portfolio's stored kit look like one stored by the first release,
 * before facets other than `manager` were added to the kind. Upgrades don't
 * add facets to kits already stored.
 */
const stripStoredPortfolioKit = (contractBaggage: Baggage, id: number) => {
  const portfolios: MapStore<number, { manager: unknown }> = contractBaggage
    .get('contract')
    .get('portfolios');
  const { manager } = portfolios.get(id);
  portfolios.set(id, harden({ manager }));
};

export {
  range,
  stripStoredPortfolioKit,
  evmTraderPrivateKeys,
  pendingTxOpts,
  snapshotTimed,
  documentStorageSchemaTimed,
  getRunningFlowEntries,
  getTargetAllocationEntries,
  getFlowHistory,
  getPortfolioInfo,
  ackNFA,
  makeDirectPlannerClient,
  makePlannedTrader,
  setupPlannedTrader,
  makePlannerProvider,
  resolveDepositPlan,
  beefyTestMacro,
  setupPlanner,
  setupEvmPlanner,
  getPortfolioInfoTimed,
  makeEvmPlannerPowers,
  doOpenEvmPortfolio,
  setupEvmRemoteAccountConfigTest,
  makeCreateAndDepositScenarioRunner,
  erc4626TestMacro,
  fromEntries,
  keys,
  values,
};
export type {
  FakeStorage,
  PortfolioStatus,
  RunningFlows,
  RunningFlowKey,
  RunningFlowDetail,
  EvmTraderKit,
  DirectPlannerClient,
  PlannedOfferArgs,
};
