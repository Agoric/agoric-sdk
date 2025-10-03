/// <reference types="ses" />
/* eslint-env node */

import { inspect } from 'node:util';

import type { Coin } from '@cosmjs/stargate';

import { Fail, X, annotateError, q } from '@endo/errors';
import { Nat } from '@endo/nat';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import type { Bech32Address } from '@agoric/orchestration';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';

import {
  PublishedTxShape,
  type PendingTx,
  type TxId,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
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

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient, SubscriptionResponse } from './cosmos-rpc.ts';
import {
  getCurrentBalance,
  getCurrentBalances,
  handleDeposit,
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

/** @see {@link ../../../packages/portfolio-contract/src/planner.exo.ts} */
type ResolvePlanArgs = {
  portfolioId: number;
  flowId: number;
  steps: MovementDesc[];
  policyVersion: number;
  rebalanceCount: number;
};

export const PORTFOLIOS_PATH_PREFIX = 'published.ymax0.portfolios';
export const PENDING_TX_PATH_PREFIX = 'published.ymax0.pendingTxs';

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
  now: typeof Date.now;
  gasEstimator: GasEstimator;
};

type ProcessPortfolioPowers = Pick<
  Powers,
  'cosmosRest' | 'spectrum' | 'signingSmartWalletKit' | 'gasEstimator'
> & {
  depositBrand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  portfolioKeyForDepositAddr: Map<Bech32Address, string>;
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
    spectrum,

    portfolioKeyForDepositAddr,
  }: ProcessPortfolioPowers,
) => {
  const { query, marshaller } = signingSmartWalletKit;
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
    const path = `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}`;
    const currentBalances = await getCurrentBalances(
      portfolioStatus,
      depositBrand,
      { cosmosRest, spectrum },
    );
    const plannerContext = {
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
      if (type === 'withdraw') {
        steps = await planWithdrawFromAllocations({
          ...plannerContext,
          amount: flowDetail.amount,
        });
      } else if (type === 'other') {
        steps = await planRebalanceToAllocations(plannerContext);
      } else {
        const msg = `⚠️  Unknown flow type ${type} for ${path} in-progress flow ${flowKey}`;
        console.warn(msg);
        return;
      }
  
      const resolvePlanArgs: ResolvePlanArgs = {
        portfolioId: portfolioIdFromKey(portfolioKey as any),
        flowId: flowIdFromKey(flowKey as any),
        steps,
        policyVersion: portfolioStatus.policyVersion,
        rebalanceCount: portfolioStatus.rebalanceCount,
      };
      // TODO: Incorporate `reflectWalletStore` type safety into
      // SigningSmartWalletKit and use that here.
      // const planner = signingSmartWalletKit.get<PortfolioPlanner>('planner');
      // const { tx } =
      //   await planner.resolvePlan(portfolioId, flowId, steps, policyVersion, rebalanceCount);
      const result = await signingSmartWalletKit.sendBridgeAction({
        method: 'invokeEntry',
        message: {
          targetName: 'planner',
          method: 'resolvePlan',
          args: Object.values(resolvePlanArgs),
        },
      });
      console.log(
        `Resolving ${path} in-progress flow ${flowKey}`,
        flowDetail,
        currentBalances,
        resolvePlanArgs,
        result,
      );
    } catch (err) {
      annotateError(err, X`currentBalances: ${currentBalances}`);
      throw err;
    }
  };
  const handledPortfolioKeys = new Set<string>();
  // prettier-ignore
  const handlePortfolio = async (portfolioKey: string, eventRecord: EventRecord) => {
    if (handledPortfolioKeys.has(portfolioKey)) return;
    handledPortfolioKeys.add(portfolioKey);
    const path = `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}`;
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
      // its own dedicated vstorage data), then find the first such flow and
      // respond to it. Responding to the rest now is pointless because
      // acceptance of the first submission would invalidate the others as
      // stale, but we'll see them again when such acceptance prompts changes
      // to the portfolio status.
      const flowKeys = new Set(flowKeysResp.result.children);
      for (const [flowKey, flowDetail] of entries(status.flowsRunning || {})) {
        // If vstorage has data for this flow then we've already responded.
        if (flowKeys.has(flowKey)) continue;
        await startFlow(status, portfolioKey, flowKey, flowDetail);
        return;
      }
      // If rebalanceCount is 0, then no plan has been submitted for this
      // policyVersion so we synthesize an activity record for its deposit
      // address to trigger a rebalance.
      // Otherwise, we assume that the update was a response to such a
      // submission.
      // TODO: Remove this in favor of driving everything through flows.
      if (depositAddress && status.rebalanceCount === 0) {
        deferrals.push({
          blockHeight: eventRecord.blockHeight,
          type: 'transfer' as const,
          address: depositAddress,
        });
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
    if (path === PORTFOLIOS_PATH_PREFIX) {
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
    } else if (vstoragePathIsParentOf(PORTFOLIOS_PATH_PREFIX, path)) {
      const portfolioKey = stripPrefix(`${PORTFOLIOS_PATH_PREFIX}.`, path);
      await handlePortfolio(portfolioKey, eventRecord);
    }
  }
};

export const processPendingTxEvents = async (
  events: Array<{ path: string; value: string }>,
  handlePendingTxFn,
  txPowers: HandlePendingTxOpts,
) => {
  const { marshaller, error = () => {}, log = () => {} } = txPowers;
  for (const { path, value: cellJson } of events) {
    const errLabel = `🚨 Failed to process pending tx ${path}`;
    let data;
    try {
      // Extract txId from path (e.g., "published.ymax0.pendingTxs.tx1")
      const txId = stripPrefix(`${PENDING_TX_PATH_PREFIX}.`, path);
      log('Processing pendingTx event', path);

      const streamCell = parseStreamCell(cellJson, path);
      const value = parseStreamCellValue(streamCell, -1, path);
      data = marshaller.fromCapData(value);
      if (data?.status !== TxStatus.PENDING) continue;
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
    now,
    gasEstimator,
  }: Powers,
  {
    depositBrandName,
    feeBrandName,
  }: { depositBrandName: string; feeBrandName: string },
) => {
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
    // transactions
    "tm.event = 'Tx'",
  ];
  const responses = rpc.subscribeAll(subscriptionFilters);
  const readyResult = await responses.next();
  if (readyResult.done !== false || readyResult.value !== undefined) {
    console.error('🚨 Unexpected non-undefined ready signal', readyResult);
  }
  // console.log('subscribed to events', subscriptionFilters);

  // TODO: Verify consumption of paginated data.
  const [pendingTxKeysResp, portfolioKeysResp] = await Promise.all(
    [PENDING_TX_PATH_PREFIX, PORTFOLIOS_PATH_PREFIX].map(async vstoragePath => {
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
    spectrum,

    portfolioKeyForDepositAddr,
  });
  await makeWorkPool(portfolioKeys, undefined, async portfolioKey => {
    const { streamCellJson, event } = makeVstorageEvent(
      0n,
      PORTFOLIOS_PATH_PREFIX,
      harden({ addPortfolio: portfolioKey }) as StatusFor['portfolios'],
      marshaller,
    );
    const eventRecord: EventRecord = {
      blockHeight: initialBlockHeight,
      type: 'kvstore',
      event,
    };
    await processPortfolioEvents(
      [{ path: PORTFOLIOS_PATH_PREFIX, value: streamCellJson, eventRecord }],
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
  });
  console.warn(`Found ${pendingTxKeys.length} pending transactions`);

  const initialPendingTxData: PendingTxRecord[] = [];
  await makeWorkPool(pendingTxKeys, undefined, async (txId: TxId) => {
    const path = `${PENDING_TX_PATH_PREFIX}.${txId}`;
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
      if (data?.status !== TxStatus.PENDING) return;
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
      if (vstoragePathIsAncestorOf(PORTFOLIOS_PATH_PREFIX, path)) {
        portfolioEvents.push({ path, value, eventRecord });
      } else if (vstoragePathIsAncestorOf(PENDING_TX_PATH_PREFIX, path)) {
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

    // Detect activity against portfolio deposit addresses.
    const oldAddrActivity = deferrals.splice(0).filter(deferral => {
      if (deferral.type === 'transfer') return true;
      deferrals.push(deferral);
      return false;
    }) as Array<EventRecord & { type: 'transfer' }>;
    const newActiveAddresses: Bech32Address[] = [
      ...new Set([
        ...((eventRollups['coin_received.receiver'] as Bech32Address[]) || []),
        ...((eventRollups['coin_spent.spender'] as Bech32Address[]) || []),
        ...((eventRollups['transfer.recipient'] as Bech32Address[]) || []),
        ...((eventRollups['transfer.sender'] as Bech32Address[]) || []),
      ]),
    ];
    const addrsWithActivity = [
      ...oldAddrActivity,
      ...newActiveAddresses.map(address => ({
        blockHeight: respHeight,
        type: 'transfer' as const,
        address,
      })),
    ];
    const depositAddrsWithActivity = new Map(
      partialMap(addrsWithActivity, eventRecord => {
        const { address: addr } = eventRecord;
        const portfolioKey = portfolioKeyForDepositAddr.get(addr);
        return portfolioKey ? [addr, { portfolioKey, eventRecord }] : undefined;
      }),
    );

    const addrBalances = new Map() as Map<Bech32Address, Coin[]>;
    await makeWorkPool(addrsWithActivity, undefined, async eventRecord => {
      const { address: addr } = eventRecord;
      // TODO: Switch to an API that exposes block height, so we can detect stale
      // data and push to `deferrals`.
      // cf. https://github.com/Agoric/agoric-sdk/pull/11630
      const balancesResp = await cosmosRest.getAccountBalances('agoric', addr);
      addrBalances.set(addr, balancesResp.balances);
    }).done;
    console.log(
      inspect(
        {
          addrsWithActivity,
          addrBalances,
          depositAddrsWithActivity,
          portfolioEvents,
          pendingTxEvents,
        },
        { depth: 10 },
      ),
    );

    // Respond to deposits.
    const portfolioOps = await Promise.all(
      [...depositAddrsWithActivity.entries()].map(
        async ([addr, { portfolioKey, eventRecord }]) => {
          const amount = pickBalance(addrBalances.get(addr), depositAsset);
          if (!amount) {
            console.warn(`No ${q(depositAsset.issuerName)} at ${addr}`);
            return;
          }

          const unprefixedPortfolioPath = stripPrefix(
            'published.',
            `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}`,
          );

          await null;
          try {
            // TODO: Use an API that exposes block height to detect stale data.
            const stepsRecord = await handleDeposit(
              unprefixedPortfolioPath as any,
              amount,
              feeAsset.brand as Brand<'nat'>,
              {
                readPublished: query.readPublished,
                spectrum,
                cosmosRest,
                gasEstimator,
              },
            );

            const portfolioId = portfolioIdFromKey(portfolioKey as any);
            return { portfolioId, stepsRecord };
          } catch (err) {
            console.warn(
              `⚠️ Failed to handle ${portfolioKey} deposit; deferring`,
              err,
            );
            deferrals.push(eventRecord);
          }
        },
      ),
    );

    for (const { portfolioId, stepsRecord } of portfolioOps.filter(x => !!x)) {
      if (!stepsRecord) continue;
      const { policyVersion, rebalanceCount, steps } = stepsRecord;
      const result = await signingSmartWalletKit.sendBridgeAction(
        harden({
          method: 'invokeEntry',
          message: {
            targetName: 'planner',
            method: 'submit',
            args: [portfolioId, steps, policyVersion, rebalanceCount],
          },
        }),
      );
      console.log('result', result);
    }
  }

  console.warn('Terminating...');
};
harden(startEngine);
