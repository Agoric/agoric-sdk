/// <reference types="ses" />
/* eslint-env node */

import { inspect } from 'node:util';

import type { Coin } from '@cosmjs/stargate';

import { Fail, X, annotateError, q } from '@endo/errors';
import { Nat } from '@endo/nat';
import { reflectWalletStore, getInvocationUpdate } from '@agoric/client-utils';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { RetryOptionsAndPowers } from '@agoric/client-utils/src/sync-tools.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import type { Bech32Address } from '@agoric/orchestration';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import {
  PublishedTxShape,
  type PendingTx,
  type TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';
import {
  flowIdFromKey,
  portfolioIdFromKey,
  PoolPlaces,
  PortfolioStatusShapeExt,
  type FlowDetail,
  type StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/tools/network/network.prod.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import {
  mustMatch,
  naturalCompare,
  partialMap,
  provideLazyMap,
  stripPrefix,
  tryNow,
} from '@agoric/internal';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import { makeWorkPool } from '@agoric/internal/src/work-pool.js';
import type { FlowStatus } from '@agoric/portfolio-api';

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient, SubscriptionResponse } from './cosmos-rpc.ts';
import {
  getCurrentBalance,
  getNonDustBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from './plan-deposit.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import {
  handlePendingTx,
  type EvmContext,
  type HandlePendingTxOpts,
} from './pending-tx-manager.ts';
import {
  parseStreamCell,
  parseStreamCellValue,
  readStorageMeta,
  readStreamCellValue,
  vstoragePathIsAncestorOf,
  vstoragePathIsParentOf,
  STALE_RESPONSE,
} from './vstorage-utils.ts';

const { entries, fromEntries, values } = Object;

// eslint-disable-next-line no-nested-ternary
const compareBigints = (a: bigint, b: bigint) => (a > b ? 1 : a < b ? -1 : 0);

const knownErrorProps = harden(['cause', 'errors', 'message', 'name', 'stack']);

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

type EventRecord = { blockHeight: bigint } & (
  | { type: 'kvstore'; event: CosmosEvent }
  | { type: 'transfer'; address: Bech32Address }
);

type VstorageEventDetail = {
  path: string;
  value: string;
  eventRecord: EventRecord;
};

type PendingTxRecord = { blockHeight: bigint; tx: PendingTx };

const makeVstoragePathPrefixes = (contractInstance: string) => ({
  portfoliosPathPrefix: `published.${contractInstance}.portfolios`,
  pendingTxPathPrefix: `published.${contractInstance}.pendingTxs`,
});

/** cf. golang/cosmos/x/vstorage/types/path_keys.go */
const EncodedKeySeparator = '\x00';
const PathSeparator = '.';

/**
 * TODO: Promote elsewhere, maybe @agoric/internal?
 * cf. golang/cosmos/x/vstorage/types/path_keys.go
 */
const encodedKeyToPath = (key: string) => {
  const encodedParts = key.split(EncodedKeySeparator);
  encodedParts.length > 1 || Fail`invalid encoded key ${q(key)}`;
  const path = encodedParts.slice(1).join(PathSeparator);
  return path;
};
const pathToEncodedKey = (path: string) => {
  const segments = path.split(PathSeparator);
  return `${segments.length}${EncodedKeySeparator}${segments.join(EncodedKeySeparator)}`;
};

const vstorageEntryFromCosmosEvent = (event: CosmosEvent) => {
  const attributes = tryNow(
    fromUniqueEntries,
    _err => Fail`attributes must be unique`,
    event.attributes?.map(({ key, value }) => [key, value]) || [],
  ) as Record<string, string>;

  if (attributes.store !== 'vstorage') return;
  const { key, value } = attributes;
  if (key === undefined || value === undefined) {
    throw Fail`missing "key" and/or "value"`;
  }

  const path = encodedKeyToPath(key);
  return { path, value };
};

export const makeVstorageEvent = (
  blockHeight: bigint,
  path: string,
  value: any,
  marshaller: SigningSmartWalletKit['marshaller'],
): { event: CosmosEvent; streamCellJson: string } => {
  const streamCellJson = JSON.stringify({
    blockHeight: String(blockHeight),
    values: [JSON.stringify(marshaller.toCapData(value))],
  });
  const eventAttrs = {
    store: 'vstorage',
    key: pathToEncodedKey(path),
    value: streamCellJson,
  };
  const event: CosmosEvent = {
    type: 'state_change',
    attributes: entries(eventAttrs).map(([k, v]) => ({ key: k, value: v })),
  };
  return { event, streamCellJson };
};

type Powers = {
  evmCtx: Omit<EvmContext, 'signingSmartWalletKit' | 'fetch' | 'cosmosRest'>;
  rpc: CosmosRPCClient;
  spectrum: SpectrumClient;
  cosmosRest: CosmosRestClient;
  signingSmartWalletKit: SigningSmartWalletKit;
  walletStore: ReturnType<typeof reflectWalletStore>;
  getWalletInvocationUpdate: (
    messageId: string | number,
    retryOpts?: RetryOptionsAndPowers,
  ) => ReturnType<typeof getInvocationUpdate>;
  now: typeof Date.now;
  gasEstimator: GasEstimator;
};

type ProcessPortfolioPowers = Pick<
  Powers,
  | 'cosmosRest'
  | 'spectrum'
  | 'signingSmartWalletKit'
  | 'walletStore'
  | 'getWalletInvocationUpdate'
  | 'gasEstimator'
> & {
  depositBrand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  portfolioKeyForDepositAddr: Map<Bech32Address, string>;
  vstoragePathPrefixes: {
    portfoliosPathPrefix: string;
    pendingTxPathPrefix: string;
  };
};

/**
 * Determines if a plan needs to be submitted for a given portfolio flow.
 * A plan is needed if:
 * - The flow does not have vstorage data (flowKeys does not contain flowKey), OR
 * - The flow exists but has status: 'init'
 *
 * @param portfolioKey - The portfolio key (e.g., "portfolio1")
 * @param flowKey - The flow key (e.g., "flow1")
 * @param flowKeys - Set of flow keys that have vstorage data
 * @param vstorage - Vstorage query interface
 * @param portfoliosPathPrefix - Prefix for portfolio vstorage paths
 * @param marshaller - Marshaller for reading vstorage data
 * @param readOpts - Options for reading vstorage
 * @param readOpts.minBlockHeight - Minimum block height for reading
 * @param readOpts.retries - Number of retries for reading
 * @returns Promise<boolean> - true if a plan needs to be submitted
 */
export const planNeeded = async (
  portfolioKey: string,
  flowKey: string,
  flowKeys: Set<string>,
  vstorage: SigningSmartWalletKit['query']['vstorage'],
  portfoliosPathPrefix: string,
  marshaller: SigningSmartWalletKit['marshaller'],
  readOpts: { minBlockHeight: bigint; retries: number },
): Promise<boolean> => {
  await null;
  // If vstorage has no data for this flow, a plan is needed
  if (!flowKeys.has(flowKey)) {
    return true;
  }

  // If vstorage has data, check if the status is 'init'
  const flowPath = `${portfoliosPathPrefix}.${portfolioKey}.flows.${flowKey}`;
  try {
    const flowStatusCapdata = await readStreamCellValue(
      vstorage,
      flowPath,
      readOpts,
    );
    const flowStatus = marshaller.fromCapData(flowStatusCapdata) as FlowStatus;
    // A plan is needed if the status is 'init'
    return flowStatus.state === 'init';
  } catch (err) {
    // If we can't read the flow status, assume a plan is not needed
    // (conservative approach - the flow data exists but we can't read it)
    console.warn(`⚠️ Could not read flow status for ${flowPath}`, err);
    return false;
  }
};

const processPortfolioEvents = async (
  portfolioEvents: VstorageEventDetail[],
  blockHeight: bigint,
  deferrals: EventRecord[],
  {
    cosmosRest,
    depositBrand,
    feeBrand,
    gasEstimator,
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate,
    spectrum,
    vstoragePathPrefixes,

    portfolioKeyForDepositAddr,
  }: ProcessPortfolioPowers,
) => {
  const { query, marshaller } = signingSmartWalletKit;
  const { portfoliosPathPrefix } = vstoragePathPrefixes;
  const { vstorage } = query;
  const setPortfolioKeyForDepositAddr = (addr: Bech32Address, key: string) => {
    const oldKey = portfolioKeyForDepositAddr.get(addr);
    if (!oldKey) {
      console.warn(`Adding ${addr} portfolioKey ${key}`);
    } else if (oldKey !== key) {
      // This permanent loss of $addr->oldKey association should never happen.
      const msg = `🚨 Overwriting ${addr} portfolioKey from ${oldKey} to ${key}`;
      console.error(msg);
    }
    portfolioKeyForDepositAddr.set(addr, key);
  };
  const startFlow = async (
    portfolioStatus: StatusFor['portfolio'],
    portfolioKey: string,
    flowKey: string,
    flowDetail: FlowDetail,
  ) => {
    const path = `${portfoliosPathPrefix}.${portfolioKey}`;
    const currentBalances = await getNonDustBalances(
      portfolioStatus,
      depositBrand,
      { cosmosRest, spectrum },
    );
    const errorContext: Record<string, unknown> = {
      flowDetail,
      currentBalances,
    };
    const plannerContext = {
      // @ts-expect-error "amount" is not present on all varieties of
      // FlowDetail, but we need it here when it is present (i.e., for types
      // "deposit" and "withdraw" and it's harmless otherwise.
      amount: flowDetail.amount,
      currentBalances,
      targetAllocation: portfolioStatus.targetAllocation,
      network: PROD_NETWORK,
      brand: depositBrand,
      feeBrand,
      gasEstimator,
    };

    try {
      let steps: MovementDesc[];
      const { type } = flowDetail;
      switch (type) {
        case 'deposit':
          steps = await planDepositToAllocations(plannerContext);
          break;
        case 'rebalance':
          steps = await planRebalanceToAllocations(plannerContext);
          break;
        case 'withdraw':
          steps = await planWithdrawFromAllocations(plannerContext);
          break;
        default: {
          const msg = `⚠️  Unknown flow type ${type} for ${path} in-progress flow ${flowKey}`;
          console.warn(msg);
          return;
        }
      }
      errorContext.steps = steps;

      const portfolioId = portfolioIdFromKey(portfolioKey as any);
      const flowId = flowIdFromKey(flowKey as any);
      const { policyVersion, rebalanceCount } = portfolioStatus;
      const planner = walletStore.get<PortfolioPlanner>('planner', {
        sendOnly: true,
      });
      const { tx, id } = await planner.resolvePlan(
        portfolioId,
        flowId,
        steps,
        policyVersion,
        rebalanceCount,
      );
      // The transaction has been submitted, but we won't know about a rejection
      // for at least another block.
      void getWalletInvocationUpdate(id as any).catch(err => {
        console.warn(
          `⚠️ Failure for ${path} in-progress flow ${flowKey} resolvePlan`,
          { policyVersion, rebalanceCount },
          steps,
          err,
        );
      });
      console.log(
        `Resolving ${path} in-progress flow ${flowKey}`,
        flowDetail,
        currentBalances,
        { portfolioId, flowId, steps, policyVersion, rebalanceCount },
        tx,
      );
    } catch (err) {
      annotateError(err, X`${errorContext}`);
      throw err;
    }
  };
  const handledPortfolioKeys = new Set<string>();
  // prettier-ignore
  const handlePortfolio = async (portfolioKey: string, eventRecord: EventRecord) => {
    if (handledPortfolioKeys.has(portfolioKey)) return;
    handledPortfolioKeys.add(portfolioKey);
    const path = `${portfoliosPathPrefix}.${portfolioKey}`;
    const readOpts = { minBlockHeight: eventRecord.blockHeight, retries: 4, };
    await null;
    try {
      const [statusCapdata, flowKeysResp] = await Promise.all([
        readStreamCellValue(vstorage, path, readOpts),
        readStorageMeta(vstorage, `${path}.flows`, 'children', readOpts),
      ]);
      const status = marshaller.fromCapData(statusCapdata);
      mustMatch(status, PortfolioStatusShapeExt, path);
      const { depositAddress } = status;
      if (depositAddress) {
        setPortfolioKeyForDepositAddr(depositAddress, portfolioKey);
      }
      // If any in-progress flows need activation (as indicated by not having
      // its own dedicated vstorage data or having status: 'init'), then find 
      // the first such flow and respond to it. Responding to the rest now is 
      // pointless because acceptance of the first submission would invalidate 
      // the others as stale, but we'll see them again when such acceptance 
      // prompts changes to the portfolio status.
      const flowKeys = new Set(flowKeysResp.result.children);
      for (const [flowKey, flowDetail] of entries(status.flowsRunning || {})) {
        // Check if a plan needs to be submitted for this flow
        const needsPlan = await planNeeded(
          portfolioKey,
          flowKey,
          flowKeys,
          vstorage,
          portfoliosPathPrefix,
          marshaller,
          readOpts,
        );
        if (!needsPlan) continue;
        await startFlow(status, portfolioKey, flowKey, flowDetail);
        return;
      }
    } catch (err) {
      const age = blockHeight - eventRecord.blockHeight;
      if (err.code === STALE_RESPONSE) {
        // Stale responses are an unfortunate possibility when connecting with
        // more than one follower node, but we expect to recover automatically.
        const msg = `⚠️  Deferring ${path} of age ${age} block(s)`;
        console.warn(msg, eventRecord);
      } else {
        const msg = `🚨 Deferring ${path} of age ${age} block(s)`;
        console.error(msg, eventRecord, err);
      }
      deferrals.push(eventRecord);
    }
  };

  await null;
  for (const portfolioEvent of portfolioEvents) {
    const { path, value: cellJson, eventRecord } = portfolioEvent;
    const defer = err => {
      const age = blockHeight - eventRecord.blockHeight;
      console.error(`🚨 Deferring ${path} of age ${age} block(s)`, err);
      deferrals.push(eventRecord);
    };
    if (path === portfoliosPathPrefix) {
      const streamCell = tryNow(parseStreamCell, defer, cellJson, path);
      if (!streamCell) continue;
      for (let i = 0; i < streamCell.values.length; i += 1) {
        try {
          const value = parseStreamCellValue(streamCell, i, path);
          const portfoliosData = marshaller.fromCapData(
            value,
          ) as StatusFor['portfolios'];
          if (portfoliosData.addPortfolio) {
            const portfolioKey = portfoliosData.addPortfolio;
            console.warn('Detected new portfolio', portfolioKey);
            await handlePortfolio(portfolioKey, eventRecord);
          }
        } catch (err) {
          defer(err);
        }
      }
    } else if (vstoragePathIsParentOf(portfoliosPathPrefix, path)) {
      const portfolioKey = stripPrefix(`${portfoliosPathPrefix}.`, path);
      await handlePortfolio(portfolioKey, eventRecord);
    }
  }
};

export const processPendingTxEvents = async (
  events: Array<{ path: string; value: string }>,
  handlePendingTxFn,
  txPowers: HandlePendingTxOpts,
) => {
  const {
    marshaller,
    error = () => {},
    log = () => {},
    vstoragePathPrefixes: { pendingTxPathPrefix },
  } = txPowers;
  for (const { path, value: cellJson } of events) {
    const errLabel = `🚨 Failed to process pending tx ${path}`;
    let data;
    try {
      // Extract txId from path (e.g., "published.ymax0.pendingTxs.tx1")
      const txId = stripPrefix(`${pendingTxPathPrefix}.`, path);
      log('Processing pendingTx event', path);

      const streamCell = parseStreamCell(cellJson, path);
      const value = parseStreamCellValue(streamCell, -1, path);
      data = marshaller.fromCapData(value);
      if (
        data?.status !== TxStatus.PENDING ||
        data.type === TxType.CCTP_TO_AGORIC
      )
        continue;
      mustMatch(data, PublishedTxShape, `${path} index -1`);
      const tx = { txId, ...data } as PendingTx;
      log('New pending tx', tx);
      // Tx resolution is non-blocking.
      void handlePendingTxFn(tx, txPowers).catch(err => error(errLabel, err));
    } catch (err) {
      error(errLabel, data, err);
    }
  }
};

export const pickBalance = (
  balances: Coin[] | undefined,
  depositAsset: AssetInfo,
) => {
  const deposited = balances?.find(({ denom }) => denom === depositAsset.denom);
  if (!deposited) {
    return undefined;
  }

  return AmountMath.make(
    depositAsset.brand as Brand<'nat'>,
    Nat(BigInt(deposited.amount)),
  );
};

/**
 * Process each initially-present pending transaction based on its age (i.e.,
 * scanning EVM logs if the transaction is old).
 */
export const processInitialPendingTransactions = async (
  initialPendingTxData: PendingTxRecord[],
  txPowers: HandlePendingTxOpts,
  handlePendingTxFn = handlePendingTx,
) => {
  const { error = () => {}, log = () => {}, cosmosRpc } = txPowers;

  log(`Processing ${initialPendingTxData.length} pending transactions`);

  // Cache timestamps for block heights to avoid duplicate RPC calls
  const blockHeightToTimestamp = new Map<bigint, Promise<number>>();

  await makeWorkPool(initialPendingTxData, undefined, async pendingTxRecord => {
    const { blockHeight, tx } = pendingTxRecord;
    const timestampMs = await provideLazyMap(
      blockHeightToTimestamp,
      blockHeight,
      async () => {
        const resp = await cosmosRpc.request('block', {
          height: `${blockHeight}`,
        });
        const date = new Date(resp.block.header.time);
        return date.getTime();
      },
    ).catch(err => {
      const msg = `🚨 Couldn't get block time for pending tx ${tx.txId} at height ${blockHeight}`;
      error(msg, err);
    });
    if (timestampMs === undefined) return;

    log(`Processing pending tx ${tx.txId} with lookback`);
    // TODO: Optimize blockchain scanning by reusing state across transactions.
    // For details, see: https://github.com/Agoric/agoric-sdk/issues/11945
    void handlePendingTxFn(tx, txPowers, timestampMs).catch(err => {
      const msg = ` Failed to process pending tx ${tx.txId} with lookback`;
      error(msg, pendingTxRecord, err);
    });
  }).done;
};

export const startEngine = async (
  {
    evmCtx,
    rpc,
    spectrum,
    cosmosRest,
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate,
    now,
    gasEstimator,
  }: Powers,
  {
    contractInstance,
    depositBrandName,
    feeBrandName,
  }: {
    contractInstance: string;
    depositBrandName: string;
    feeBrandName: string;
  },
) => {
  const vstoragePathPrefixes = makeVstoragePathPrefixes(contractInstance);
  const { portfoliosPathPrefix, pendingTxPathPrefix } = vstoragePathPrefixes;
  await null;
  const { query, marshaller } = signingSmartWalletKit;

  // Test balance querying (using dummy addresses for now).
  {
    const balanceQueryPowers = { spectrum, cosmosRest };
    const poolPlaceInfoByProtocol = new Map(
      values(PoolPlaces).map(info => [info.protocol, info]),
    );
    await Promise.all(
      [...poolPlaceInfoByProtocol.values()].map(async info => {
        await null;
        try {
          const { chainName } = info;
          const dummyAddress =
            chainName === 'noble'
              ? 'cosmos:testnoble:noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y'
              : (([caipChainId, addr]) => `${caipChainId}:${addr}`)(
                  entries(evmCtx.usdcAddresses)[0],
                );
          const accountIdByChain = { [chainName]: dummyAddress } as any;
          await getCurrentBalance(info, accountIdByChain, balanceQueryPowers);
        } catch (err) {
          const expandos = partialMap(Reflect.ownKeys(err), key =>
            knownErrorProps.includes(key as any) ? false : [key, err[key]],
          );
          console.warn(
            `⚠️ Could not query ${info.protocol} balance`,
            err,
            ...(expandos.length ? [fromEntries(expandos)] : []),
          );
        }
      }),
    );
  }

  const vbankAssets: AssetInfo[] = (
    await query.readPublished('agoricNames.vbankAsset')
  ).map(([_ibcDenom, asset]) => asset);
  const depositAsset =
    vbankAssets.find(asset => asset.issuerName === depositBrandName) ||
    Fail`Could not find vbankAsset for ${q(depositBrandName)}`;
  const feeAsset =
    vbankAssets.find(asset => asset.issuerName === feeBrandName) ||
    Fail`Could not find vbankAsset for ${q(feeBrandName)}`;

  const deferrals = [] as EventRecord[];

  const blockHeightFromSubscriptionResponse = (resp: SubscriptionResponse) => {
    const { type: respType, value: respData } = resp;
    switch (respType) {
      case 'tendermint/event/Tx':
        return BigInt((respData.TxResult as any).height);
      case 'tendermint/event/NewBlock':
        // https://pkg.go.dev/github.com/cometbft/cometbft/types#EventDataNewBlock
        return BigInt((respData.block as any).header.height);
      default: {
        console.error(
          `🚨 Attempting to read block height from unexpected response type ${respType}`,
          respData,
        );
        const obj = values(respData)[0];
        // @ts-expect-error
        return BigInt(obj.height ?? obj.blockHeight ?? obj.block_height);
      }
    }
  };

  // To avoid data gaps, establish subscriptions before gathering initial state.
  const subscriptionFilters = [
    // vstorage events are in BEGIN_BLOCK/END_BLOCK activity
    "tm.event = 'NewBlock'",
  ];
  const responses = rpc.subscribeAll(subscriptionFilters);
  const readyResult = await responses.next();
  if (readyResult.done !== false || readyResult.value !== undefined) {
    console.error('🚨 Unexpected non-undefined ready signal', readyResult);
  }
  // console.log('subscribed to events', subscriptionFilters);

  // TODO: Verify consumption of paginated data.
  const [pendingTxKeysResp, portfolioKeysResp] = await Promise.all(
    [pendingTxPathPrefix, portfoliosPathPrefix].map(async vstoragePath => {
      const opts = { kind: 'children' } as const;
      const resp = await query.vstorage.readStorageMeta(vstoragePath, opts);
      typeof resp.blockHeight === 'bigint' ||
        Fail`blockHeight ${resp.blockHeight} must be a bigint`;
      return resp;
    }),
  );
  const initialBlockHeight = [pendingTxKeysResp, portfolioKeysResp]
    .map(r => r.blockHeight as bigint)
    .reduce((max, h) => (h > max ? h : max));
  const [pendingTxKeys, portfolioKeys] = [
    pendingTxKeysResp.result.children,
    portfolioKeysResp.result.children,
  ];

  // TODO: Retry when data is associated with a block height lower than that of
  //       the first result from `responses`.
  const portfolioKeyForDepositAddr = new Map() as Map<Bech32Address, string>;
  const processPortfolioPowers: ProcessPortfolioPowers = Object.freeze({
    cosmosRest,
    gasEstimator,
    depositBrand: depositAsset.brand as Brand<'nat'>,
    feeBrand: feeAsset.brand as Brand<'nat'>,
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate,
    spectrum,
    vstoragePathPrefixes,

    portfolioKeyForDepositAddr,
  });
  await makeWorkPool(portfolioKeys, undefined, async portfolioKey => {
    const { streamCellJson, event } = makeVstorageEvent(
      0n,
      portfoliosPathPrefix,
      harden({ addPortfolio: portfolioKey }) as StatusFor['portfolios'],
      marshaller,
    );
    const eventRecord: EventRecord = {
      blockHeight: initialBlockHeight,
      type: 'kvstore',
      event,
    };
    await processPortfolioEvents(
      [{ path: portfoliosPathPrefix, value: streamCellJson, eventRecord }],
      initialBlockHeight,
      deferrals,
      processPortfolioPowers,
    );
  }).done;

  const txPowers: HandlePendingTxOpts = Object.freeze({
    ...evmCtx,
    cosmosRest,
    cosmosRpc: rpc,
    fetch,
    log: console.warn.bind(console),
    error: console.error.bind(console),
    marshaller,
    now,
    signingSmartWalletKit,
    vstoragePathPrefixes,
  });
  console.warn(`Found ${pendingTxKeys.length} pending transactions`);

  const initialPendingTxData: PendingTxRecord[] = [];
  await makeWorkPool(pendingTxKeys, undefined, async (txId: TxId) => {
    const path = `${pendingTxPathPrefix}.${txId}`;
    await null;
    let streamCellJson;
    let data;
    try {
      streamCellJson = await query.vstorage.readStorage(path, {
        kind: 'data',
      });
      const streamCell = parseStreamCell(streamCellJson.value, path);
      const marshalledData = parseStreamCellValue(streamCell, -1, path);
      data = marshaller.fromCapData(marshalledData);
      if (
        data?.status !== TxStatus.PENDING ||
        data.type === TxType.CCTP_TO_AGORIC
      )
        return;
      mustMatch(harden(data), PublishedTxShape, path);
      initialPendingTxData.push({
        blockHeight: BigInt(streamCell.blockHeight),
        tx: { txId, ...data },
      });
    } catch (err) {
      const errLabel = `🚨 Failed to read old pending tx ${path}`;
      console.error(errLabel, data || streamCellJson, err);
    }
  }).done;

  if (initialPendingTxData.length > 0) {
    // Process initial transactions in lookback mode upon planner startup
    await processInitialPendingTransactions(initialPendingTxData, txPowers);
  }

  // console.warn('consuming events');
  for await (const respContainer of responses) {
    const { query: _query, data: resp, events: eventRollups } = respContainer;
    const { type: respType, value: respData } = resp;
    if (!eventRollups) {
      console.warn('missing event rollups', respType);
      continue;
    }

    const respHeight = blockHeightFromSubscriptionResponse(resp);

    // Capture vstorage updates.
    const oldEventRecords = deferrals.splice(0).filter(deferral => {
      if (deferral.type === 'kvstore') return true;
      deferrals.push(deferral);
      return false;
    }) as Array<EventRecord & { type: 'kvstore' }>;
    const newEvents = entries(respData).flatMap(([key, value]) => {
      // We care about result_begin_block/result_end_block/etc.
      if (!key.startsWith('result_')) return [];
      const events = (value as any)?.events;
      if (!events) console.warn('missing events', respType, key);
      return events ?? [];
    }) as CosmosEvent[];
    const eventRecords = [
      ...oldEventRecords,
      ...newEvents.map(event => ({
        blockHeight: respHeight,
        type: 'kvstore' as const,
        event,
      })),
    ];
    const portfolioEvents = [] as VstorageEventDetail[];
    const pendingTxEvents = [] as VstorageEventDetail[];
    for (const eventRecord of eventRecords) {
      const { event } = eventRecord;

      // Filter for vstorage state_change events.
      // cf. golang/cosmos/types/events.go
      if (event.type !== 'state_change') continue;

      const vstorageEntry = tryNow(
        () => vstorageEntryFromCosmosEvent(event),
        // prettier-ignore
        err => console.error('🚨 invalid vstorage state_change', event.attributes, err),
      );
      if (!vstorageEntry) continue;
      const { path, value } = vstorageEntry;
      if (vstoragePathIsAncestorOf(portfoliosPathPrefix, path)) {
        portfolioEvents.push({ path, value, eventRecord });
      } else if (vstoragePathIsAncestorOf(pendingTxPathPrefix, path)) {
        pendingTxEvents.push({ path, value, eventRecord });
      }
    }

    // Process portfolio events in (blockHeight, vstoragePath) order.
    portfolioEvents.sort(
      (a, b) =>
        compareBigints(a.eventRecord.blockHeight, b.eventRecord.blockHeight) ||
        naturalCompare(a.path, b.path),
    );
    await processPortfolioEvents(
      portfolioEvents,
      respHeight,
      deferrals,
      processPortfolioPowers,
    );

    await processPendingTxEvents(pendingTxEvents, handlePendingTx, txPowers);

    console.log(
      inspect(
        {
          portfolioEvents,
          pendingTxEvents,
        },
        { depth: 10 },
      ),
    );
  }

  // We expect to run forever, but the server can terminate our connection.
  await null;
  const closeEvent = await Promise.race([rpc.closed(), Promise.resolve()]);
  if (closeEvent) {
    const { code, reason, wasClean } = closeEvent;
    const cleanly = q(wasClean ? 'cleanly' : 'not cleanly');
    Fail`⚠️ rpc.subscribeAll finished (${cleanly}) with code ${q(code)}: ${q(reason)}`;
  }
  Fail`⚠️ rpc.subscribeAll finished`;
};
harden(startEngine);
