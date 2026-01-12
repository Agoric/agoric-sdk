/// <reference types="ses" />
/* eslint-env node */

import type { InspectOptions } from 'node:util';
import { inspect } from 'node:util';

import type { Coin } from '@cosmjs/stargate';

import { Fail, annotateError, q } from '@endo/errors';
import { Nat } from '@endo/nat';
import { reflectWalletStore, getInvocationUpdate } from '@agoric/client-utils';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { RetryOptionsAndPowers } from '@agoric/client-utils/src/sync-tools.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import type { Bech32Address, CaipChainId } from '@agoric/orchestration';
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
import type {
  FlowDetail,
  PoolKey as InstrumentId,
  PoolKey,
  StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import {
  flowIdFromKey,
  FlowStatusShape,
  PoolPlaces,
  portfolioIdFromKey,
  PortfolioStatusShapeExt,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { NoSolutionError } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import {
  mustMatch,
  naturalCompare,
  partialMap,
  provideLazyMap,
  stripPrefix,
  tryNow,
  typedEntries,
} from '@agoric/internal';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import { makeWorkPool } from '@agoric/internal/src/work-pool.js';
import type {
  FlowKey,
  FundsFlowPlan,
  PortfolioKey,
  SupportedChain,
} from '@agoric/portfolio-api';

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient, SubscriptionResponse } from './cosmos-rpc.ts';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { Sdk as SpectrumPoolsSdk } from './graphql/api-spectrum-pools/__generated/sdk.ts';
import { logger, runWithFlowTrace } from './logger.ts';
import type {
  EvmChain,
  EvmContext,
  HandlePendingTxOpts,
} from './pending-tx-manager.ts';
import { handlePendingTx } from './pending-tx-manager.ts';
import type { BalanceQueryPowers } from './plan-deposit.ts';
import {
  getCurrentBalance,
  getNonDustBalances,
  planDepositToAllocations,
  planRebalanceToAllocations,
  planWithdrawFromAllocations,
} from './plan-deposit.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import { UserInputError, type EvmProviders } from './support.ts';
import {
  encodedKeyToPath,
  pathToEncodedKey,
  parseStreamCell,
  parseStreamCellValue,
  readStorageMeta,
  readStreamCellValue,
  STALE_RESPONSE,
  vstoragePathIsAncestorOf,
  vstoragePathIsParentOf,
} from './vstorage-utils.ts';
import type { ReadStorageMetaOptions } from './vstorage-utils.ts';

const { fromEntries, values } = Object;

// eslint-disable-next-line no-nested-ternary
const compareBigints = (a: bigint, b: bigint) => (a > b ? 1 : a < b ? -1 : 0);

const stdoutIsTty = process.stdout.isTTY;
const stderrIsTty = process.stderr.isTTY;
const inspectOptsForStdout: InspectOptions = { depth: 4, colors: stdoutIsTty };
const inspectOptsForStderr: InspectOptions = { depth: 4, colors: stderrIsTty };
const inspectForStdout = (obj: unknown, options?: InspectOptions) =>
  inspect(obj, { ...inspectOptsForStdout, ...options });
const inspectForStderr = (obj: unknown, options?: InspectOptions) =>
  inspect(obj, { ...inspectOptsForStderr, ...options });

const knownErrorProps = harden(['cause', 'errors', 'message', 'name', 'stack']);

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

type EventRecord = { blockHeight: bigint } & (
  | { type: 'kvstore'; event: CosmosEvent }
  | { type: 'transfer'; address: Bech32Address }
);

export type VstorageEventDetail = {
  path: string;
  value: string;
  eventRecord: EventRecord;
};

type PendingTxRecord = { blockHeight: bigint; tx: PendingTx };

const makeVstoragePathPrefixes = (contractInstance: string) => ({
  portfoliosPathPrefix: `published.${contractInstance}.portfolios`,
  pendingTxPathPrefix: `published.${contractInstance}.pendingTxs`,
});

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
  const event: CosmosEvent = {
    type: 'state_change',
    attributes: [
      { key: 'store', value: 'vstorage' },
      { key: 'key', value: pathToEncodedKey(path) },
      { key: 'value', value: streamCellJson },
    ],
  };
  return { event, streamCellJson };
};

export type Powers = {
  evmCtx: Omit<EvmContext, 'signingSmartWalletKit' | 'fetch' | 'cosmosRest'>;
  rpc: CosmosRPCClient;
  spectrum: SpectrumClient;
  spectrumBlockchain?: SpectrumBlockchainSdk;
  spectrumPools?: SpectrumPoolsSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  spectrumPoolIds: Partial<Record<InstrumentId, string>>;
  cosmosRest: CosmosRestClient;
  network: NetworkSpec;
  signingSmartWalletKit: SigningSmartWalletKit;
  walletStore: ReturnType<typeof reflectWalletStore>;
  getWalletInvocationUpdate: (
    messageId: string | number,
    retryOpts?: RetryOptionsAndPowers,
  ) => ReturnType<typeof getInvocationUpdate>;
  now: typeof Date.now;
  gasEstimator: GasEstimator;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
  erc4626Vaults: Partial<Record<PoolKey, `0x${string}`>>;
  chainNameToChainIdMap: Partial<Record<EvmChain, CaipChainId>>;
};

export type ProcessPortfolioPowers = Pick<
  Powers,
  | 'cosmosRest'
  | 'network'
  | 'spectrum'
  | 'spectrumBlockchain'
  | 'spectrumPools'
  | 'spectrumChainIds'
  | 'spectrumPoolIds'
  | 'signingSmartWalletKit'
  | 'walletStore'
  | 'getWalletInvocationUpdate'
  | 'gasEstimator'
  | 'usdcTokensByChain'
  | 'erc4626Vaults'
  | 'chainNameToChainIdMap'
> & {
  isDryRun?: boolean;
  depositBrand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  portfolioKeyForDepositAddr: Map<Bech32Address, string>;
  vstoragePathPrefixes: {
    portfoliosPathPrefix: string;
  };
  evmProviders: EvmProviders;
};

export type PortfoliosMemory = {
  deferrals: EventRecord[];
  snapshots?: Map<string, { fingerprint: string; repeats: number }>;
};

const fingerprintPortfolioState = (
  status: StatusFor['portfolio'],
  activeFlowKeys: Set<string>,
  { marshaller }: { marshaller: SigningSmartWalletKit['marshaller'] },
): string => {
  // Ignore rebalanceCount, which can increment from one of our submissions even
  // if nothing actually changes.
  const { rebalanceCount: _rebalanceCount, ...statusFields } = status;
  const sortedFlowKeys = [...activeFlowKeys].sort((a, b) =>
    naturalCompare(a, b),
  );
  // Rely on the determinism of @endo/marshal.
  const fingerprint = marshaller.toCapData(
    harden({ statusFields, activeFlowKeys: sortedFlowKeys }),
  );
  return fingerprint.body;
};

export const processPortfolioEvents = async (
  portfolioEvents: VstorageEventDetail[],
  blockHeight: bigint,
  memory: PortfoliosMemory,
  {
    isDryRun,
    cosmosRest,
    depositBrand,
    feeBrand,
    gasEstimator,
    network,
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate,
    spectrum,
    spectrumBlockchain,
    spectrumPools,
    spectrumChainIds,
    spectrumPoolIds,
    usdcTokensByChain,
    vstoragePathPrefixes,
    erc4626Vaults,
    evmProviders,
    chainNameToChainIdMap,

    portfolioKeyForDepositAddr,
  }: ProcessPortfolioPowers,
) => {
  const { deferrals } = memory;
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
  const balanceQueryPowers: BalanceQueryPowers = {
    cosmosRest,
    spectrum,
    spectrumBlockchain,
    spectrumPools,
    spectrumChainIds,
    spectrumPoolIds,
    usdcTokensByChain,
    erc4626Vaults,
    evmProviders,
    chainNameToChainIdMap,
  };
  type ReadVstorageSimpleOpts = Pick<
    ReadStorageMetaOptions<'data'>,
    'minBlockHeight' | 'retries'
  >;
  const isActiveFlow = async (
    portfolioKey: PortfolioKey,
    flowKey: FlowKey,
    opts?: ReadVstorageSimpleOpts,
  ) => {
    const path = `${portfoliosPathPrefix}.${portfolioKey}.flows.${flowKey}`;
    const capdata = await readStreamCellValue(vstorage, path, opts);
    const flowStatus = marshaller.fromCapData(capdata);
    mustMatch(flowStatus, FlowStatusShape, path);
    return flowStatus.state === 'run';
  };
  const startFlow = async (
    portfolioStatus: StatusFor['portfolio'],
    portfolioKey: PortfolioKey,
    flowKey: FlowKey,
    flowDetail: FlowDetail,
  ) => {
    const path = `${portfoliosPathPrefix}.${portfolioKey}`;
    const portfolioId = portfolioIdFromKey(portfolioKey);
    const flowId = flowIdFromKey(flowKey);
    const scope = [portfolioId, flowId] as const;
    const { policyVersion, rebalanceCount, targetAllocation } = portfolioStatus;
    const versions = [policyVersion, rebalanceCount] as const;

    const currentBalances = await getNonDustBalances(
      portfolioStatus,
      depositBrand,
      balanceQueryPowers,
    );
    const logContext = {
      path,
      flowKey,
      flowDetail,
      currentBalances,
      policyVersion,
      rebalanceCount,
      targetAllocation,
    };
    const settle = async <M extends string & keyof PortfolioPlanner>(
      methodName: M,
      args: PortfolioPlanner[M] extends (...args: infer Args) => any
        ? Args
        : never,
      extraDetails?: object,
    ) => {
      const txOpts = { sendOnly: true };
      const planReceiver = walletStore.get<PortfolioPlanner>('planner', txOpts);
      const { tx, id } = await planReceiver[methodName]!(...args);
      // tx has been submitted, but we won't know its fate until a future block.
      if (!isDryRun) {
        void getWalletInvocationUpdate(id as any).catch(err => {
          logger.warn(`⚠️ Failure for ${methodName}`, args, err);
        });
      }
      const details = inspectForStdout({ ...logContext, ...extraDetails });
      logger.info(methodName, flowDetail, currentBalances, details, tx);
    };

    const plannerContext = {
      ...logContext,
      // @ts-expect-error "amount" is not present on all varieties of
      // FlowDetail, but we need it here when it is present (i.e., for types
      // "deposit" and "withdraw" and it's harmless otherwise.
      amount: flowDetail.amount,
      network,
      brand: depositBrand,
      feeBrand,
      gasEstimator,
    };
    try {
      let plan: FundsFlowPlan;
      const { type } = flowDetail;
      switch (type) {
        case 'deposit':
          plan = await planDepositToAllocations(plannerContext);
          break;
        case 'rebalance':
          plan = await planRebalanceToAllocations(plannerContext);
          break;
        case 'withdraw':
          plan = await planWithdrawFromAllocations(plannerContext);
          break;
        default:
          logger.warn(`⚠️  Unknown flow type ${type}`);
          return;
      }
      (logContext as any).plan = plan;

      if (plan.flow.length > 0) {
        const planOrSteps = plan.order ? plan : plan.flow;
        await settle('resolvePlan', [...scope, planOrSteps, ...versions], {
          plan,
        });
      } else {
        const reason = 'Nothing to do for this operation.';
        await settle('rejectPlan', [...scope, reason, ...versions]);
      }
    } catch (err) {
      annotateError(err, inspect(logContext, { depth: 4 }));
      if (err instanceof UserInputError || err instanceof NoSolutionError) {
        await settle('rejectPlan', [...scope, err.message, ...versions], {
          cause: err,
        }).catch(err2 => {
          throw AggregateError([err, err2]);
        });
      } else {
        throw err;
      }
    }
  };
  const handledPortfolioKeys = new Set<string>();
  // prettier-ignore
  const handlePortfolio = async (portfolioKey: PortfolioKey, eventRecord: EventRecord) => {
    if (handledPortfolioKeys.has(portfolioKey)) return;
    handledPortfolioKeys.add(portfolioKey);
    const path = `${portfoliosPathPrefix}.${portfolioKey}`;
    const readOpts: ReadVstorageSimpleOpts = {
      minBlockHeight: eventRecord.blockHeight,
      retries: 4,
    };
    await null;
    try {
      const [statusCapdata, flowKeysResp] = await Promise.all([
        readStreamCellValue(vstorage, path, readOpts),
        readStorageMeta(vstorage, `${path}.flows`, 'children', readOpts),
      ]);
      const status = marshaller.fromCapData(statusCapdata);
      mustMatch(status, PortfolioStatusShapeExt, path);
      const flowKeys = new Set(flowKeysResp.result.children);

      const { depositAddress } = status;
      if (depositAddress) {
        setPortfolioKeyForDepositAddr(depositAddress, portfolioKey);
      }

      // If this (portfolio, flows) data hasn't changed since our last
      // successful submission, there's no point in trying again.
      memory.snapshots ||= new Map();
      const oldState = memory.snapshots.get(portfolioKey);
      const oldFingerprint = oldState?.fingerprint;
      const fingerprint = fingerprintPortfolioState(status, flowKeys, { marshaller });
      if (fingerprint === oldFingerprint) {
        assert(oldState);
        if (!oldState.repeats) console.warn(`⚠️  Ignoring unchanged ${path}`);
        oldState.repeats += 1;
        return;
      }

      // If any in-progress flows need activation (as indicated by lacking a
      // dedicated vstorage node) and there is not already a running flow, then
      // find the first such flow and respond to it. Responding to the rest now
      // is pointless because acceptance of the first submission would
      // invalidate the others as stale, but we'll see them again when such
      // acceptance prompts changes to the portfolio status.
      for (const [flowKey, flowDetail] of typedEntries(status.flowsRunning || {})) {
        // If vstorage has a node for this flow then we've already responded.
        if (flowKeys.has(flowKey)) {
          if (await isActiveFlow(portfolioKey, flowKey, readOpts)) return;
          continue;
        }
        await runWithFlowTrace(
          portfolioKey, flowKey,
          () => startFlow(status, portfolioKey, flowKey, flowDetail),
        );
        break;
      }
      memory.snapshots.set(portfolioKey, { fingerprint, repeats: 0 });
    } catch (err) {
      const age = blockHeight - eventRecord.blockHeight;
      if (err.code === STALE_RESPONSE) {
        // Stale responses are an unfortunate possibility when connecting with
        // more than one follower node, but we expect to recover automatically.
        const msg = `⚠️  Deferring ${path} of age ${age} block(s)`;
        console.warn(msg, inspectForStderr(eventRecord));
      } else {
        const msg = `🚨 Deferring ${path} of age ${age} block(s) for error: ${err.message}`;
        console.error(msg, inspectForStderr(eventRecord), err);
      }
      deferrals.push(eventRecord);
    }
  };

  await null;
  for (const portfolioEvent of portfolioEvents) {
    const { path, value: cellJson, eventRecord } = portfolioEvent;
    const defer = err => {
      const age = blockHeight - eventRecord.blockHeight;
      const msg = `🚨 Deferring ${path} of age ${age} block(s) for error: ${err?.message}`;
      console.error(msg, err);
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
      const portfolioKey = stripPrefix(
        `${portfoliosPathPrefix}.`,
        path,
      ) as PortfolioKey;
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
    pendingTxAbortControllers,
  } = txPowers;
  for (const { path, value: cellJson } of events) {
    const errLabel = `🚨 Failed to process pending tx ${path}`;
    let data;
    try {
      // Extract txId from path (e.g., "published.ymax0.pendingTxs.tx1")
      const txId = stripPrefix(`${pendingTxPathPrefix}.`, path) as TxId;
      log('Processing pendingTx event', path);

      const streamCell = parseStreamCell(cellJson, path);
      const value = parseStreamCellValue(streamCell, -1, path);
      data = marshaller.fromCapData(value);

      // If transaction is no longer PENDING, abort any ongoing watchers
      if (data.status !== TxStatus.PENDING) {
        const abortController = pendingTxAbortControllers.get(txId);
        if (abortController) {
          const reason = `Aborting watcher for ${txId} - status changed to ${data?.status}`;
          log(reason);
          abortController.abort(reason);
          pendingTxAbortControllers.delete(txId);
        }
        continue;
      }

      if (data.type === TxType.CCTP_TO_AGORIC) continue;

      mustMatch(data, PublishedTxShape, `${path} index -1`);
      const tx = { txId, ...data } as PendingTx;
      log('New pending tx', tx);

      const abortController = provideLazyMap(
        pendingTxAbortControllers,
        txId,
        () => txPowers.makeAbortController(),
      );

      // Tx resolution is non-blocking.
      void handlePendingTxFn(tx, {
        ...txPowers,
        signal: abortController.signal,
      }).finally(() => {
        pendingTxAbortControllers.delete(txId);
      });
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
  const {
    error = () => {},
    log = () => {},
    cosmosRpc,
    pendingTxAbortControllers,
  } = txPowers;

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

    const abortController = provideLazyMap(
      pendingTxAbortControllers,
      tx.txId,
      () => txPowers.makeAbortController(),
    );

    // TODO: Optimize blockchain scanning by reusing state across transactions.
    // For details, see: https://github.com/Agoric/agoric-sdk/issues/11945
    void handlePendingTxFn(tx, {
      ...txPowers,
      txTimestampMs: timestampMs,
      signal: abortController.signal,
    }).finally(() => {
      pendingTxAbortControllers.delete(tx.txId);
    });
  }).done;
};

export const startEngine = async (
  powers: Powers,
  {
    isDryRun,
    contractInstance,
    depositBrandName,
    feeBrandName,
  }: {
    isDryRun?: boolean;
    contractInstance: string;
    depositBrandName: string;
    feeBrandName: string;
  },
) => {
  const { evmCtx, cosmosRest, now, rpc, signingSmartWalletKit } = powers;
  const vstoragePathPrefixes = makeVstoragePathPrefixes(contractInstance);
  const { portfoliosPathPrefix, pendingTxPathPrefix } = vstoragePathPrefixes;
  await null;
  const { query, marshaller } = signingSmartWalletKit;

  // Test balance querying (using dummy addresses for now).
  {
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
                  typedEntries(evmCtx.usdcAddresses)[0],
                );
          const accountIdByChain = { [chainName]: dummyAddress } as any;
          await getCurrentBalance(info, accountIdByChain, {
            ...powers,
            evmProviders: evmCtx.evmProviders,
          });
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
  const portfoliosMemory: PortfoliosMemory = { deferrals };

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
    ...powers,
    isDryRun,
    depositBrand: depositAsset.brand as Brand<'nat'>,
    feeBrand: feeAsset.brand as Brand<'nat'>,
    vstoragePathPrefixes,
    portfolioKeyForDepositAddr,
    evmProviders: evmCtx.evmProviders,
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
      portfoliosMemory,
      processPortfolioPowers,
    );
  }).done;

  // Map to track AbortControllers for each pending transaction
  // This allows aborting watchers when transactions are manually resolved
  const pendingTxAbortControllers = new Map<TxId, AbortController>();

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
    pendingTxAbortControllers,
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
    const newEvents = typedEntries(respData).flatMap(([key, value]) => {
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
      portfoliosMemory,
      processPortfolioPowers,
    );

    await processPendingTxEvents(pendingTxEvents, handlePendingTx, txPowers);

    console.log(
      inspectForStdout({
        blockHeight: respHeight,
        portfolioEvents,
        pendingTxEvents,
      }),
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
