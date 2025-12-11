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
  };
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
    const value = harden(data.string ?? data.object);
    const store = typeof value === 'string' ? vstorageStrings : vstorageObjects;

    if (method === 'set') {
      if (wrap === false) {
        store.set(path, value);
      } else {
        store.set(path, [value]);
        vstorageStreamCellHeights.set(path, wrap === true ? blockHeight : wrap);
      }
      return;
    }

    const oldData = vstorageStrings.get(path) ?? vstorageObjects.get(path);
    if (oldData === undefined) {
      store.set(path, [value]);
      vstorageStreamCellHeights.set(path, wrap === true ? blockHeight : wrap);
      return;
    }
    vstorageStreamCellHeights.has(path) ||
      Fail`Cannot append to a non-StreamCell`;
    store.has(path) ||
      Fail`Appending must preserve string vs. object representation`;
    (oldData as Array<typeof value>).push(value);
  };

  // agoricNames cannot start empty.
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
const fakePortfolioKit = async ({
  accounts,
}: { accounts?: Partial<Record<SupportedChain, NatAmount>> } = {}) => {
  const {
    signingSmartWalletKit,
    powers: { getBlockHeight, getBridgeSends, updateVstorage },
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
    for (const [chainName, balanceAmount] of typedEntries(accounts)) {
      initialPortfolioStatus.accountIdByChain[chainName] =
        `mocked:${chainName}:mockaddr${++caipAddressCount}`;
      powers.spectrumChainIds[chainName] = chainName;
      powers.usdcTokensByChain[chainName] = `usdc-on-${chainName}`;
    }
    powers.spectrumBlockchain = {
      getBalances: async ({ accounts: accountQueries }) => {
        if (!Array.isArray(accountQueries)) accountQueries = [accountQueries];
        const balances = accountQueries.map(({ chain, address, token }) => {
          const balance = Number(accounts[chain as any].value) / 1e6;
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
    testPowers: { getBridgeSends, updateVstorage },
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
    const portfoliosPathPrefix = 'published.ymaxTest.portfolios';
    const portfolioKey = 'portfolio5';

    /** Updated as the test progresses. */
    let currentBlockHeight = 30n;
    const portfolioStatus: StatusFor['portfolio'] = {
      positionKeys: ['USDN'],
      flowCount: 1,
      accountIdByChain: {
        noble: 'cosmos:noble:noble1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      },
      policyVersion: 1,
      rebalanceCount: 0,
      targetAllocation: {
        USDN: 1n,
      },
      flowsRunning: {
        flow1: {
          type: 'deposit',
          amount: AmountMath.make(depositBrand, 1_000_000n),
        },
      },
    };
    const portfolioDataKey = `${portfoliosPathPrefix}.${portfolioKey} data`;
    const vstorageData: Record<string, string[] | string> = {
      [portfolioDataKey]: '<uninitialized>',
      [`${portfoliosPathPrefix}.${portfolioKey}.flows children`]: [],
    };
    const advanceBlock = () => {
      currentBlockHeight += 1n;
      portfolioStatus.rebalanceCount += 1;
      const newStatus = harden({ ...portfolioStatus });
      const newStreamCell = {
        blockHeight: `${currentBlockHeight}`,
        values: [JSON.stringify(defaultMarshaller.toCapData(newStatus))],
      };
      vstorageData[portfolioDataKey] = JSON.stringify(newStreamCell);
    };

    const readStorageMeta: VStorage['readStorageMeta'] = async (
      path,
      { kind } = {},
    ) => {
      const data =
        (vstorageData[`${path} ${kind}`] as any) ||
        Fail`Unexpected vstorage query: ${path} ${kind}`;

      const base = { blockHeight: currentBlockHeight };
      let resp: QueryChildrenMetaResponse | QueryDataMetaResponse | undefined;
      if (kind === 'children') resp = { ...base, result: { children: data } };
      if (kind === 'data') resp = { ...base, result: { value: data } };
      return (resp as any) || Fail`Unreachable`;
    };
    const sswkQuery = { vstorage: { readStorageMeta } };

    const signingSmartWalletKit = {
      marshaller: defaultMarshaller,
      query: sswkQuery,
    } as any;

    const recordedSteps: MovementDesc[][] = [];
    const planner: PortfolioPlanner = {
      ...({} as any),
      resolvePlan: (_portfolioId, _flowId, steps) => {
        recordedSteps.push(steps as MovementDesc[]);
        return { tx: { mock: true }, id: 'tx-recorded' };
      },
    };

    const portfolioKeyForDepositAddr = new Map();
    const getAccountBalance: CosmosRestClient['getAccountBalance'] = async (
      _chainKey,
      _address,
      denom,
    ) => ({ amount: '0', denom });
    const powers = {
      ...createMockEnginePowers(),
      cosmosRest: { getAccountBalance } as any,
      signingSmartWalletKit,
      walletStore: { get: () => planner } as any,
      gasEstimator: mockGasEstimator,
      isDryRun: true,
      depositBrand,
      feeBrand,
      portfolioKeyForDepositAddr,
      vstoragePathPrefixes: { portfoliosPathPrefix },
    };

    const memory: any = { deferrals: [] as any[] };
    const processNextBlock = async () => {
      advanceBlock();
      const event = {
        path: `${portfoliosPathPrefix}.${portfolioKey}`,
        value: vstorageData[portfolioDataKey] as string,
        eventRecord: {
          blockHeight: currentBlockHeight,
          type: 'kvstore' as const,
          event: { type: 'state_change', attributes: [] },
        },
      };
      await processPortfolioEvents([event], currentBlockHeight, memory, powers);
    };
    await processNextBlock();
    await processNextBlock();

    t.is(recordedSteps.length, 1, 'planner invoked exactly once');
    t.true(recordedSteps[0]!.length > 0, 'planner receives non-empty steps');
    t.is(memory.snapshots?.get(portfolioKey)?.repeats, 1);
    t.is(powers.portfolioKeyForDepositAddr.size, 0);
  },
);

test.serial('startFlow logs include traceId prefix', async t => {
  const portfoliosPathPrefix = 'published.ymaxTest.portfolios';
  const portfolioKey = 'portfolio6';
  const flowKey = 'flow2';
  const tracePrefix = `[${portfolioKey}.${flowKey}] `;

  const currentBlockHeight = 10n;
  const portfolioStatus: StatusFor['portfolio'] = harden({
    positionKeys: ['USDN'],
    flowCount: 1,
    accountIdByChain: {
      noble: 'cosmos:noble:noble1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    },
    policyVersion: 1,
    rebalanceCount: 0,
    targetAllocation: {
      USDN: 1n,
    },
    flowsRunning: {
      [flowKey]: {
        type: 'deposit',
        amount: AmountMath.make(depositBrand, 1_000_000n),
      },
    },
  });
  const portfolioDataKey = `${portfoliosPathPrefix}.${portfolioKey} data`;
  const streamCell = {
    blockHeight: `${currentBlockHeight}`,
    values: [JSON.stringify(defaultMarshaller.toCapData(portfolioStatus))],
  };
  const vstorageData: Record<string, string[] | string> = {
    [portfolioDataKey]: JSON.stringify(streamCell),
    [`${portfoliosPathPrefix}.${portfolioKey}.flows children`]: [],
  };

  // @ts-expect-error mock
  const readStorageMeta: VStorage['readStorageMeta'] = async (
    path,
    { kind } = {},
  ) => {
    const data =
      (vstorageData[`${path} ${kind}`] as any) ||
      Fail`Unexpected vstorage query: ${path} ${kind}`;

    const base = { blockHeight: currentBlockHeight };
    if (kind === 'children') return { ...base, result: { children: data } };
    if (kind === 'data') return { ...base, result: { value: data } };
    throw Fail`Unreachable`;
  };
  const sswkQuery = { vstorage: { readStorageMeta } };

  const signingSmartWalletKit = {
    marshaller: defaultMarshaller,
    query: sswkQuery,
  } as any;

  const planner: PortfolioPlanner = {
    ...({} as any),
    resolvePlan: async () => ({
      tx: { mock: true },
      id: 'tx1',
    }),
  };

  const getAccountBalance: CosmosRestClient['getAccountBalance'] = async (
    _chainKey,
    _address,
    denom,
  ) => ({ amount: '0', denom });
  const powers = {
    ...createMockEnginePowers(),
    cosmosRest: { getAccountBalance } as any,
    signingSmartWalletKit,
    walletStore: { get: () => planner } as any,
    gasEstimator: mockGasEstimator,
    isDryRun: true,
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix },
  };

  const captured: Array<{ level: 'debug' | 'info'; args: any[] }> = [];
  const originalLogTarget = console;
  try {
    setLogTarget({
      ...console,
      debug: (...args: any[]) => captured.push({ level: 'debug', args }),
      info: (...args: any[]) => captured.push({ level: 'info', args }),
    });

    await processPortfolioEvents(
      [
        {
          path: `${portfoliosPathPrefix}.${portfolioKey}`,
          value: vstorageData[portfolioDataKey] as string,
          eventRecord: {
            blockHeight: currentBlockHeight,
            type: 'kvstore' as const,
            event: { type: 'state_change', attributes: [] },
          },
        },
      ],
      currentBlockHeight,
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
  expectedReason: 'Nothing to do for this operation',
});

test.serial('invalid targetAllocation is rejected', testRejection, {
  portfolioStatusOverrides: { targetAllocation: { USDN: 0n } },
  flow: {
    type: 'deposit',
    amount: AmountMath.make(depositBrand, 1_000_000n),
  },
  expectedReason: 'allocation weights must sum > 0',
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
  expectedReason: 'total after delta must not be negative',
});
// #endregion processPortfolioEvents
