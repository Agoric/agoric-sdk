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
} from '@agoric/portfolio-api';
import { type TargetAllocation as PermittedAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { E, passStyleOf } from '@endo/far';
import { type ExecutionContext } from 'ava';
import {
  makeEip155ChainIdToAxelarChain,
  type EVMContractAddresses,
  type PortfolioPrivateArgs,
} from '../src/portfolio.contract.ts';
import { type AssetPlaceRef } from '../src/type-guards-steps.ts';
import { type StatusFor, type TargetAllocation } from '../src/type-guards.ts';
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
  const contents = {
    ...fromEntries([[key, info], ...posEntries]),
    ...byFlow,
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

  // The contract will issue a separate GMP for make account, not accounted in
  // the steps above, so ack it.
  if (separateMakeAccount) {
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
  }

  for (const _ of plan.flow) {
    await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
    await txResolver.drainPending();
  }

  return flowId;
};

const beefyTestMacro = test.macro({
  async exec(t, vaultKey: AssetPlaceRef) {
    const { trader1, common, txResolver } = await setupTrader(t);
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
  shared: Awaited<ReturnType<typeof setupPlanner>>,
  inputs: {
    fromChain: AxelarChain;
    depositAmount: NatAmount;
    allocations: PermittedAllocation[];
  },
  powers: Awaited<ReturnType<typeof makeEvmPlannerPowers>>['powers'],
) => {
  const { planner1, evmTrader } = powers;

  await planner1.redeem();
  const result = await evmTrader
    .forChain(inputs.fromChain)
    .openPortfolio(inputs.allocations, inputs.depositAmount.value);
  await ackNFA(shared.common.utils, -1);
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
      const [_ns, _ref, addr] = accountIdByChain?.agoric!.split(':') ?? [];
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
    const { trader1, common, txResolver } = await setupTrader(t);
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

export {
  range,
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
};
