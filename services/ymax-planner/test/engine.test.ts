/* eslint-disable @jessie.js/safe-await-separator */
import test from 'ava';
import type { ExecutionContext } from 'ava';

import type { DeliverTxResponse } from '@cosmjs/stargate';

import { Fail, q } from '@endo/errors';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type {
  FlowDetail,
  StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import {
  makeSigningSmartWalletKitFromClient,
  makeSmartWalletKitFromVstorageKit,
  makeVstorageKitFromVstorage,
  reflectWalletStore,
} from '@agoric/client-utils';
import type {
  QueryChildrenMetaResponse,
  QueryDataMetaResponse,
  SigningSmartWalletKit,
  VStorage,
  VstorageKit,
} from '@agoric/client-utils';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { partialMap, typedEntries } from '@agoric/internal';
import type { RecordFromTuple } from '@agoric/internal';
import { compareByCodePoints } from '@agoric/internal/src/kv-store.js';
import type { StreamCell } from '@agoric/internal/src/lib-chainStorage.js';
import {
  AmountMath,
  type Brand,
  type DisplayInfo,
  type Issuer,
  type NatAmount,
} from '@agoric/ertp';
import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import type { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import type { InvokeStoreEntryAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import type { Marshal } from '@endo/marshal';
import { Far } from '@endo/pass-style';
import type { Passable } from '@endo/pass-style';
import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import {
  makeVstorageEvent,
  pickBalance,
  processPortfolioEvents,
} from '../src/engine.ts';
import type {
  Powers,
  PortfoliosMemory,
  ProcessPortfolioPowers,
  VstorageEventDetail,
} from '../src/engine.ts';
import { setLogTarget } from '../src/logger.ts';
import {
  createMockEnginePowers,
  makeNotImplemented,
  makeNotImplementedAsync,
  makeStreamCellJsonFromText,
  mockGasEstimator,
} from './mocks.ts';

// #region client-utils mocks
// XXX these helpers belong somewhere else; maybe *in* packages/client-utils?

type PassableObj = Passable & object;
type FakeVstorageKitConfig = {
  blockHeight?: bigint;
  marshaller?: Pick<Marshal<string>, 'fromCapData' | 'toCapData'>;
};

/**
 * Fake a VstorageKit with an optional initial block height and marshaller.
 * Exported powers support advancing the block height and updating vstorage
 * contents, optionally using objects rather than strings and optionally
 * auto-wrapping contents in a StreamCell.
 */
const fakeVstorageKit = (config: FakeVstorageKitConfig = {}) => {
  let { blockHeight = 100n, marshaller = boardSlottingMarshaller<string>() } =
    config;
  const serialize = (value: PassableObj) =>
    JSON.stringify(marshaller.toCapData(value));
  const vstorageStrings = new Map<string, string | string[]>();
  const vstorageObjects = new Map<string, PassableObj | PassableObj[]>();
  const vstorageStreamCellHeights = new Map<string, bigint>();
  const getBlockHeight = () => blockHeight;
  const updateBlockHeight = (newHeight: bigint = blockHeight + 1n) => {
    newHeight > blockHeight ||
      Fail`blockHeight ${newHeight} must be greater than ${blockHeight}`;
    blockHeight = newHeight;
    return blockHeight;
  };
  // XXX Maybe StreamCell-wrapping should be default behavior, replacing `wrap`
  // with `raw`?
  type UpdateVstorage = {
    (path: string, method: 'delete'): void;
    (
      path: string,
      method: 'set' | 'append',
      data: { wrap?: boolean | bigint } & (
        | { string: string }
        | { object: PassableObj }
      ),
    ): void;
  };
  /**
   * Update vstorage data at the specified path.
   * If the method is "append" or `wrap` is not false, the resulting data will
   * be a StreamCell (using a bigint `wrap` as the height, otherwise using the
   * current block height).
   * Any inbound data will be hardened.
   * NB: Ancestor paths are not automatically created or deleted.
   */
  const updateVstorage = (path, method, data?) => {
    if (method === 'delete' || method === 'set') {
      vstorageStrings.delete(path);
      vstorageObjects.delete(path);
      vstorageStreamCellHeights.delete(path);
    }
    if (method === 'delete') return;

    const { wrap = false } = data;
    const newHeight = typeof wrap !== 'boolean' ? wrap : blockHeight;
    const value = harden(data.string ?? data.object);
    const store = typeof value === 'string' ? vstorageStrings : vstorageObjects;

    if (method === 'set') {
      if (wrap === false) {
        store.set(path, value);
      } else {
        store.set(path, [value]);
        vstorageStreamCellHeights.set(path, newHeight);
      }
      return;
    }

    method === 'append' || Fail`Unknown method ${q(method)}`;

    const oldData = vstorageStrings.get(path) ?? vstorageObjects.get(path);
    const oldHeight = vstorageStreamCellHeights.get(path);
    if (oldData !== undefined && newHeight === oldHeight) {
      // Append to the existing StreamCell for this height.
      store.has(path) ||
        Fail`Appending must preserve string vs. object representation`;
      (oldData as Array<typeof value>).push(value);
    } else {
      oldData === undefined ||
        oldHeight !== undefined ||
        Fail`Cannot append to a non-StreamCell`;
      // Create a new StreamCell.
      store.set(path, [value]);
      vstorageStreamCellHeights.set(path, newHeight);
    }
  };

  // Some agoricNames sub-collections must be present.
  for (const collectionName of ['brand', 'instance', 'vbankAsset']) {
    const path = `published.agoricNames.${collectionName}`;
    updateVstorage(path, 'set', { object: Object.entries({}), wrap: 1n });
  }

  // @ts-expect-error TS2322 cast
  const readStorageMeta: VStorage['readStorageMeta'] = async (
    path = 'published',
    { kind = 'children', height = 0 } = {},
  ) => {
    height === 0 ||
      BigInt(height) === blockHeight ||
      Fail`Invalid non-current height ${height}`;
    switch (kind) {
      case 'children': {
        const prefix = `${path}.`;
        const paths = [...vstorageStrings.keys(), ...vstorageObjects.keys()];
        const children = partialMap(paths.sort(compareByCodePoints), key => {
          if (!key.startsWith(prefix)) return;
          const suffix = key.slice(prefix.length);
          return suffix.includes('.') ? false : suffix;
        });
        return { blockHeight, result: { children } };
      }
      case 'data': {
        const data = vstorageStrings.get(path) ?? vstorageObjects.get(path);
        if (data === undefined) {
          return { blockHeight, result: { value: '' } };
        }
        const dataHeight = vstorageStreamCellHeights.get(path);
        if (dataHeight === undefined) {
          const value = typeof data === 'string' ? data : serialize(data);
          return { blockHeight, result: { value } };
        }
        const values =
          typeof data[0] === 'string'
            ? [...(data as string[])]
            : (data as PassableObj[]).map(obj => serialize(obj));
        const streamCell: StreamCell = harden({
          blockHeight: `${dataHeight}`,
          values,
        });
        return { blockHeight, result: { value: JSON.stringify(streamCell) } };
      }
    }
    Fail`Unsupported kind ${kind}`;
  };
  const vstorage: VStorage = {
    readStorageMeta,
    readStorage: async (path = 'published', opts) =>
      // @ts-expect-error TS2322 cast
      (await readStorageMeta(path, opts)).result,
    readLatest: async (path = 'published') =>
      (await readStorageMeta(path, { kind: 'data' })).result,
    keys: makeNotImplemented('keys'),
    readAt: makeNotImplemented('readAt'),
    readFully: makeNotImplemented('readFully'),
  };
  const realVstorageKit = makeVstorageKitFromVstorage({
    vstorage,
    networkConfig: { chainName: 'mockChainName', rpcAddrs: [] },
    marshaller,
  });
  const powers = { getBlockHeight, updateBlockHeight, updateVstorage };
  return { vstorageKit: realVstorageKit, powers };
};

type WithMockVstorageKit = {
  vstorageKitMocker?: ReturnType<typeof fakeVstorageKit>;
};
type FakeSmartWalletKitConfig<
  Mode extends 'exclusive' | 'inclusive' = 'exclusive',
> = Mode extends 'inclusive'
  ? FakeVstorageKitConfig & WithMockVstorageKit
  : FakeVstorageKitConfig | WithMockVstorageKit;
/**
 * Fake a SmartWalletKit with an optional VstorageKit mocking kit (or the
 * components to build one).
 * Exported powers include those of the VstorageKit mocking kit.
 */
const fakeSmartWalletKit = async (config: FakeSmartWalletKitConfig = {}) => {
  const {
    blockHeight,
    marshaller,
    vstorageKitMocker = fakeVstorageKit({ blockHeight, marshaller }),
  } = config as FakeSmartWalletKitConfig<'inclusive'>;
  const {
    vstorageKit,
    powers: { getBlockHeight, updateBlockHeight, updateVstorage },
  } = vstorageKitMocker;
  const realSwk = await makeSmartWalletKitFromVstorageKit(vstorageKit);
  const powers = { getBlockHeight, updateBlockHeight, updateVstorage };
  return { smartWalletKit: realSwk, powers };
};

let agoricAddressCount = 0;
let txCount = 0;
type WithMockSmartWalletKit = {
  smartWalletKitMocker?: Awaited<ReturnType<typeof fakeSmartWalletKit>>;
};
type FakeSigningSmartWalletKitConfig<
  Mode extends 'exclusive' | 'inclusive' = 'exclusive',
> = (Mode extends 'inclusive'
  ? FakeSmartWalletKitConfig<Mode> & WithMockSmartWalletKit
  : FakeSmartWalletKitConfig<Mode> | WithMockSmartWalletKit) & {
  address?: string;
};
/**
 * Fake a SigningSmartWalletKit with an optional SmartWalletKit mocking kit (or
 * the components to build one) and/or address.
 * Exported powers include those of the SmartWalletKit mocking kit and a
 * function exposing the log of activity submitted to the bridge.
 */
const fakeSigningSmartWalletKit = async (
  config: FakeSigningSmartWalletKitConfig = {},
) => {
  const {
    blockHeight,
    marshaller,
    vstorageKitMocker,
    smartWalletKitMocker = await fakeSmartWalletKit({
      blockHeight,
      marshaller,
      vstorageKitMocker,
    }),
    address = `agoric1mockaddress${++agoricAddressCount}`,
  } = config as FakeSigningSmartWalletKitConfig<'inclusive'>;
  const {
    smartWalletKit,
    powers: { getBlockHeight, updateBlockHeight, updateVstorage },
  } = smartWalletKitMocker;
  const { storedWalletState: _storedWalletState, ...swk } = smartWalletKit;
  const client: any = new Proxy(
    {},
    {
      get: (_target: object, key: string | symbol) =>
        Fail`This dummy SigningStargateClient has no ${q(key)}`,
    },
  );
  const realSswk = await makeSigningSmartWalletKitFromClient({
    smartWalletKit,
    address,
    client,
  });

  const bridgeSends = [] as RecordFromTuple<
    Parameters<SigningSmartWalletKit['sendBridgeAction']>,
    ['action', 'fee', 'memo', 'signerData']
  >[];
  const getBridgeSends = () => harden([...bridgeSends]);
  const sendBridgeAction: SigningSmartWalletKit['sendBridgeAction'] = async (
    action,
    fee,
    memo,
    signerData,
  ) => {
    const transactionHash = `txhash${++txCount}`;
    bridgeSends.push({ action, fee, memo, signerData });
    const height = Number(getBlockHeight());
    return new Proxy(
      { code: 0, height, transactionHash },
      {
        get: (target: object, key: string | symbol) => {
          if (key === 'then') return undefined;
          if (Object.hasOwn(target, key)) return target[key];
          Fail`Not implemented: DeliverTxResponse ${q(key)}`;
        },
      },
    ) as DeliverTxResponse;
  };

  const signingSmartWalletKit: SigningSmartWalletKit = {
    ...swk,
    query: realSswk.query,
    address,
    executeOffer: makeNotImplemented('executeOffer'),
    sendBridgeAction,
  };
  const powers = {
    getBlockHeight,
    getBridgeSends,
    updateBlockHeight,
    updateVstorage,
  };
  return { signingSmartWalletKit, powers };
};
// #endregion client-utils mocks

let lastIbcId = 100;
const mockAsset = (
  name: string,
): AssetInfo & { brand: Brand<'nat'>; boardId: string } => {
  // avoid VatData but provide boardSlottingMarshaller-friendly brands
  const boardId = `${name}-brand-slot`;
  const brand = Far(`${name} brand`, {
    getBoardId: () => boardId,
  }) as unknown as Brand<'nat'>;
  const issuer = Far(`${name} issuer`) as Issuer<'nat'>;
  const displayInfo: DisplayInfo = harden({
    assetKind: 'nat',
    decimalPlaces: 6,
  });
  const denom = `ibc/${++lastIbcId}`;
  return harden({
    brand,
    denom,
    issuer,
    displayInfo,
    issuerName: name,
    proposedName: name,

    boardId,
  });
};

const depositAsset = mockAsset('USDC');
const { boardId: depositBoardId, brand: depositBrand } = depositAsset;
const { boardId: feeBoardId, brand: feeBrand } = mockAsset('Fee');
const defaultMarshallerEntries: Pick<Map<string, unknown>, 'get'> = new Map([
  [depositBoardId, depositBrand],
  [feeBoardId, feeBrand],
]);
const defaultMarshaller = boardSlottingMarshaller<string>(
  slot => defaultMarshallerEntries.get(slot) || Fail`Unknown slot ${slot}`,
);

let caipAddressCount = 0;
/**
 * Fake a single portfolio and its containing environment.
 */
const fakePortfolioKit = async ({
  accounts,
  otherBalances = {},
}: {
  accounts?: Partial<Record<SupportedChain, NatAmount>>;
  otherBalances?: Record<string, NatAmount>;
} = {}) => {
  const {
    signingSmartWalletKit,
    powers: {
      getBlockHeight,
      getBridgeSends,
      updateBlockHeight,
      updateVstorage,
    },
  } = await fakeSigningSmartWalletKit({ marshaller: defaultMarshaller });
  const walletStore = reflectWalletStore(signingSmartWalletKit, {
    setTimeout: makeNotImplemented('reflectWalletStore setTimeout'),
  });

  const portfoliosPathPrefix = 'mockPortfoliosRootPath';
  const portfolioId = 123;
  const portfolioPath = `${portfoliosPathPrefix}.portfolio${portfolioId}`;

  const powers: Powers & ProcessPortfolioPowers = {
    ...createMockEnginePowers(),
    signingSmartWalletKit,
    walletStore,
    isDryRun: true,
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix },
  };

  const initialPortfolioStatus: StatusFor['portfolio'] = {
    policyVersion: 1,
    rebalanceCount: 0,
    positionKeys: [],
    accountIdByChain: {},
    flowCount: 0,
  };
  if (accounts) {
    initialPortfolioStatus.accountIdByChain = {};
    powers.spectrumChainIds = {};
    powers.usdcTokensByChain = {};
    for (const [chainName, _balanceAmount] of typedEntries(accounts)) {
      initialPortfolioStatus.accountIdByChain[chainName] =
        `mocked:${chainName}:mockaddr${++caipAddressCount}`;
      powers.spectrumChainIds[chainName] = chainName;
      powers.usdcTokensByChain[chainName] = `usdc-on-${chainName}`;
    }
    powers.spectrumBlockchain = {
      getBalances: async ({ accounts: accountQueries }) => {
        if (!Array.isArray(accountQueries)) accountQueries = [accountQueries];
        const balances = accountQueries.map(({ chain, address, token }) => {
          const microBalance =
            token === powers.usdcTokensByChain[chain as any]
              ? accounts[chain as any].value
              : otherBalances[token as any].value;
          const balance = Number(microBalance) / 1e6;
          return { chain, address, token, balance: `${balance}` };
        });
        return { balances };
      },
    };
    powers.spectrumPools = {
      getBalances: makeNotImplementedAsync('spectrumPools.getBalances'),
    };
  }
  updateVstorage(portfolioPath, 'set', {
    object: initialPortfolioStatus,
    wrap: true,
  });

  return {
    blockHeight: getBlockHeight(),
    portfolioId,
    portfolioPath,
    initialPortfolioStatus,
    powers,
    testPowers: {
      getBlockHeight,
      getBridgeSends,
      updateBlockHeight,
      updateVstorage,
    },
  };
};

const makeVstorageEventDetail = (
  blockHeight: bigint,
  path: string,
  value: any,
  marshaller: typeof defaultMarshaller = defaultMarshaller,
): VstorageEventDetail => {
  const { streamCellJson, event } = makeVstorageEvent(
    blockHeight,
    path,
    value,
    marshaller,
  );
  const eventRecord = { blockHeight, type: 'kvstore' as const, event };
  return { path, value: streamCellJson, eventRecord };
};

test('ignore additional balances', t => {
  const balances = [
    { amount: '50', denom: depositAsset.denom },
    { amount: '123', denom: 'ubld' },
  ];

  const actual = pickBalance(balances, depositAsset);
  t.deepEqual(actual, { brand: depositBrand, value: 50n });
});

// #region processPortfolioEvents
// Internal use of AsyncLocalStorage seems to require serial test execution.
test.serial(
  'processPortfolioEvents only resolves flows for new portfolio states',
  async t => {
    const kit = await fakePortfolioKit({
      accounts: { noble: AmountMath.make(depositBrand, 0n) },
      otherBalances: { usdn: AmountMath.make(depositBrand, 0n) },
    });
    const { portfolioId, portfolioPath, initialPortfolioStatus, powers } = kit;
    const { getBridgeSends, updateBlockHeight, updateVstorage } =
      kit.testPowers;

    const flowId = 5;
    const portfolioStatus = {
      ...initialPortfolioStatus,
      rebalanceCount: 0,
      positionKeys: ['USDN'],
      targetAllocation: {
        USDN: 1n,
      },
      flowCount: 1,
      flowsRunning: {
        [`flow${flowId}`]: {
          type: 'deposit',
          amount: AmountMath.make(depositBrand, 1_000_000n),
        },
      },
    };
    const writePortfolioStatus = () => {
      updateVstorage(portfolioPath, 'set', {
        object: { ...portfolioStatus },
        wrap: true,
      });
    };
    writePortfolioStatus();

    const memory: any = { deferrals: [] as any[] };
    const processNextBlock = async () => {
      const blockHeight = updateBlockHeight();
      portfolioStatus.rebalanceCount += 1;
      writePortfolioStatus();
      const vstorageEventDetail = makeVstorageEventDetail(
        blockHeight,
        portfolioPath,
        harden({ ...portfolioStatus }),
      );
      await processPortfolioEvents(
        [vstorageEventDetail],
        blockHeight,
        memory,
        powers,
      );
    };
    await processNextBlock();
    await processNextBlock();

    const bridgeActions = getBridgeSends().map(invocation => invocation.action);
    arrayIsLike(
      t,
      bridgeActions,
      [bridgeActions[0]],
      'planner invoked exactly once',
    );
    t.like(bridgeActions[0], {
      method: 'invokeEntry',
      message: {
        targetName: 'planner',
        method: 'resolvePlan',
      },
    });
    const { message } = bridgeActions[0] as InvokeStoreEntryAction;
    arrayIsLike(
      t,
      message.args,
      [
        portfolioId,
        flowId,
        message.args[2],
        portfolioStatus.policyVersion,
        message.args[4],
      ],
      'resolvePlan args',
    );
    t.true(Array.isArray(message.args[2]));
    t.true(
      (message.args[2] as unknown[]).length > 0,
      'planner receives non-empty steps',
    );
    t.is(memory.snapshots?.get(`portfolio${portfolioId}`)?.repeats, 1);
    t.is(powers.portfolioKeyForDepositAddr.size, 0);
  },
);

test.serial('startFlow logs include traceId prefix', async t => {
  debugger;
  const kit = await fakePortfolioKit({
    accounts: { noble: AmountMath.make(depositBrand, 1_000_000n) },
  });
  const {
    blockHeight,
    portfolioId,
    portfolioPath,
    initialPortfolioStatus,
    powers,
  } = kit;
  const { updateVstorage } = kit.testPowers;

  const flowId = 2;
  const portfolioStatus = harden({
    ...initialPortfolioStatus,
    flowCount: 1,
    flowsRunning: {
      [`flow${flowId}`]: {
        type: 'withdraw',
        amount: AmountMath.make(depositBrand, 1_000_000n),
      },
    },
  });
  updateVstorage(portfolioPath, 'set', { object: portfolioStatus, wrap: true });

  const portfolioKey = `portfolio${portfolioId}`;
  const flowKey = `flow${flowId}`;
  const tracePrefix = `[${portfolioKey}.${flowKey}] `;

  const captured: Array<{ level: 'debug' | 'info'; args: any[] }> = [];
  const originalLogTarget = console;
  try {
    setLogTarget({
      ...console,
      debug: (...args: any[]) => captured.push({ level: 'debug', args }),
      info: (...args: any[]) => captured.push({ level: 'info', args }),
    });

    const vstorageEventDetail = makeVstorageEventDetail(
      blockHeight,
      portfolioPath,
      portfolioStatus,
    );
    await processPortfolioEvents(
      [vstorageEventDetail],
      blockHeight,
      { deferrals: [] },
      powers,
    );
  } finally {
    setLogTarget(originalLogTarget);
  }

  const tracedLogs = captured.filter(
    ({ level, args }) =>
      ['debug', 'info'].includes(level) && args[0] === tracePrefix,
  );
  t.true(tracedLogs.length >= 2, 'captured start and completion logs');
  t.true(
    tracedLogs.every(entry => entry.args[0] === tracePrefix),
    'all traced logs include the trace prefix',
  );
});

/**
 * Characterize a single-portfolio processPortfolioEvents scenario that is
 * expected to reject the pending flow. Fields are used in this documented
 * order.
 */
type RejectionConfig = {
  /** PortfolioStatus accountIdByChain keys and their corresponding balances. */
  portfolioAccounts?: Partial<Record<SupportedChain, NatAmount>>;
  mutatePortfolioKit?: (
    kit: Awaited<ReturnType<typeof fakePortfolioKit>>,
  ) => void;
  /** The first pending FlowDetail. */
  flow: FlowDetail;
  portfolioStatusOverrides?: Partial<StatusFor['portfolio']>;
  /** The rejectPlan reason string, or a regular expression for matching it. */
  expectedReason: string | RegExp;
};

const testRejection = test.macro(
  async (t: ExecutionContext, config: RejectionConfig) => {
    const {
      portfolioAccounts,
      mutatePortfolioKit,
      flow,
      portfolioStatusOverrides,
      expectedReason,
    } = config;
    const kit = await fakePortfolioKit({ accounts: portfolioAccounts });
    mutatePortfolioKit?.(kit);

    const {
      blockHeight,
      portfolioId,
      portfolioPath,
      initialPortfolioStatus,
      powers,
    } = kit;
    const { getBridgeSends, updateVstorage } = kit.testPowers;

    const flowId = 1;
    const portfolioStatus = harden({
      ...initialPortfolioStatus,
      flowCount: 1,
      flowsRunning: {
        [`flow${flowId}`]: flow,
      },
      ...portfolioStatusOverrides,
    });
    updateVstorage(portfolioPath, 'set', {
      object: portfolioStatus,
      wrap: true,
    });

    const expectedInvocation: InvokeStoreEntryAction['message'] = {
      targetName: 'planner',
      method: 'rejectPlan',
      args: [
        portfolioId,
        flowId,
        // @ts-expect-error A regular expression will be replaced before use.
        expectedReason,
        portfolioStatus.policyVersion,
        portfolioStatus.rebalanceCount,
      ],
    };

    const vstorageEventDetail = makeVstorageEventDetail(
      blockHeight,
      portfolioPath,
      portfolioStatus,
    );
    const memory: PortfoliosMemory = { deferrals: [] };
    await processPortfolioEvents(
      [vstorageEventDetail],
      blockHeight,
      memory,
      powers,
    );
    const bridgeActions = getBridgeSends().map(invocation => invocation.action);
    if (typeof expectedReason !== 'string') {
      const actualReason = (bridgeActions as InvokeStoreEntryAction[])[0]
        ?.message?.args?.[2];
      t.regex(actualReason as string, expectedReason);
      expectedInvocation.args[2] = actualReason;
    }
    arrayIsLike(t, bridgeActions, [
      { method: 'invokeEntry', message: expectedInvocation },
    ]);
  },
);

test.serial('no-step flows are rejected', testRejection, {
  flow: {
    type: 'deposit',
    amount: AmountMath.make(depositBrand, 1_000_000n),
  },
  expectedReason: 'Nothing to do for this operation.',
});

test.serial('invalid targetAllocation is rejected', testRejection, {
  portfolioStatusOverrides: { targetAllocation: { USDN: 0n } },
  flow: {
    type: 'deposit',
    amount: AmountMath.make(depositBrand, 1_000_000n),
  },
  expectedReason: 'Total target allocation weights must be positive.',
});

// Try to withdraw $1 when all links have minimum throughput $10.
test.serial('unsolvable flow is rejected', testRejection, {
  portfolioAccounts: {
    Ethereum: AmountMath.make(depositBrand, 2_000_000n),
  },
  mutatePortfolioKit: kit => {
    for (const link of kit.powers.network.links) link.min = 10_000_000n;
  },
  flow: {
    type: 'withdraw',
    amount: AmountMath.make(depositBrand, 1_000_000n),
  },
  expectedReason: /^No feasible solution\b/,
});

// Try to withdraw $2 from a total of $1.
test.serial('excessive withdrawal is rejected', testRejection, {
  portfolioAccounts: {
    Ethereum: AmountMath.make(depositBrand, 1_000_000n),
  },
  flow: {
    type: 'withdraw',
    amount: AmountMath.make(depositBrand, 2_000_000n),
  },
  expectedReason: 'Insufficient funds for withdrawal.',
});
// #endregion processPortfolioEvents
