/// <reference types="ses" />
/* eslint-env node */

import { inspect } from 'node:util';

import type { Coin } from '@cosmjs/stargate';

import { Fail, q } from '@endo/errors';
import { Nat } from '@endo/nat';
import type { SigningSmartWalletKit, VStorage } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import type { Bech32Address } from '@agoric/orchestration';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';

import {
  PublishedTxShape,
  type PendingTx,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import {
  PoolPlaces,
  PortfolioStatusShapeExt,
  type StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import { mustMatch, partialMap, tryNow } from '@agoric/internal';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import { makeWorkPool } from '@agoric/internal/src/work-pool.js';

import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient, SubscriptionResponse } from './cosmos-rpc.ts';
import { getCurrentBalance, handleDeposit } from './plan-deposit.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import { handlePendingTx, type EvmContext } from './pending-tx-manager.ts';
import {
  parseStreamCell,
  parseStreamCellValue,
  readStreamCellValue,
  vstoragePathIsAncestorOf,
  vstoragePathIsParentOf,
  STALE_RESPONSE,
} from './vstorage-utils.ts';

const { entries, fromEntries, values } = Object;

const knownErrorProps = harden(['cause', 'errors', 'message', 'name', 'stack']);

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

type EventRecord = { blockHeight: bigint } & (
  | { type: 'kvstore'; event: CosmosEvent }
  | { type: 'transfer'; address: Bech32Address }
);

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

export const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${q(prefix)}`;
  return str.slice(prefix.length);
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
};

const processPortfolioEvents = async (
  portfolioEvents: Array<{
    path: string;
    value: string;
    eventRecord: EventRecord;
  }>,
  blockHeight: bigint,
  deferrals: EventRecord[],
  {
    marshaller,
    vstorage,
    portfolioKeyForDepositAddr,
  }: {
    marshaller: SigningSmartWalletKit['marshaller'];
    vstorage: VStorage;
    portfolioKeyForDepositAddr: Map<Bech32Address, string>;
  },
) => {
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
  const handlePortfolio = async (
    portfolioKey: string,
    eventRecord: EventRecord,
  ) => {
    const path = `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}`;
    await null;
    try {
      const statusCapdata = await readStreamCellValue(vstorage, path, {
        minBlockHeight: eventRecord.blockHeight,
        retries: 4,
      });
      const status = marshaller.fromCapData(statusCapdata);
      mustMatch(status, PortfolioStatusShapeExt, path);
      const { depositAddress } = status;
      if (!depositAddress) return;
      setPortfolioKeyForDepositAddr(depositAddress, portfolioKey);
      // TODO: Detect and address unhandled `status.policyVersion`.
      // https://github.com/Agoric/agoric-sdk/issues/11805
      // https://github.com/Agoric/agoric-sdk/pull/11917
      const needsAction = true;
      if (needsAction) {
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
  powers: EvmContext & {
    marshaller: SigningSmartWalletKit['marshaller'];
    log?: typeof console.log;
    error?: typeof console.error;
  },
) => {
  const { marshaller, error = () => {}, ...txPowers } = powers;
  const { log = () => {} } = powers;
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

export const startEngine = async (
  { evmCtx, rpc, spectrum, cosmosRest, signingSmartWalletKit }: Powers,
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
      case 'tendermint/event/NewBlockHeader':
        return BigInt((respData.header as any).height);
      case 'tendermint/event/Tx':
        return BigInt((respData.TxResult as any).height);
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
    "tm.event = 'NewBlockHeader'",
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
      { marshaller, vstorage: query.vstorage, portfolioKeyForDepositAddr },
    );
  }).done;

  const txPowers = {
    ...evmCtx,
    signingSmartWalletKit,
    fetch,
    cosmosRest,
    marshaller,
    log: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.warn(`Found ${pendingTxKeys.length} pending transactions`);
  await makeWorkPool(pendingTxKeys, undefined, async txId => {
    const path = `${PENDING_TX_PATH_PREFIX}.${txId}`;
    const errLabel = `🚨 Failed to process old pending tx ${path}`;

    await null;
    let data;
    try {
      data = await query.readPublished(stripPrefix('published.', path));
      mustMatch(data, PublishedTxShape, path);
      const tx = { txId, ...data } as PendingTx;
      console.warn('Old pending tx', tx);
      // Tx resolution is non-blocking.
      void handlePendingTx(tx, txPowers).catch(err =>
        console.error(errLabel, err),
      );
    } catch (err) {
      console.error(errLabel, data, err);
    }
  }).done;

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
    const vstorageEvents = { portfolio: [], pendingTx: [] } as Record<
      'portfolio' | 'pendingTx',
      Array<{ path: string; value: string; eventRecord: EventRecord }>
    >;
    for (const eventRecord of eventRecords) {
      const { type: eventType, attributes: attrRecords } = eventRecord.event;
      // Filter for vstorage state_change events.
      // cf. golang/cosmos/types/events.go
      if (eventType !== 'state_change') continue;
      const attributes = fromUniqueEntries(
        attrRecords?.map(({ key, value }) => [key, value]) || [],
      );
      if (attributes.store !== 'vstorage') continue;

      // Require attributes "key" and "value".
      if (attributes.key === undefined || attributes.value === undefined) {
        console.error('vstorage state_change missing "key" and/or "value"');
        continue;
      }

      // Filter for paths we care about (portfolios or pending transactions).
      const path = encodedKeyToPath(attributes.key);

      if (vstoragePathIsAncestorOf(PORTFOLIOS_PATH_PREFIX, path)) {
        vstorageEvents.portfolio.push({
          path,
          value: attributes.value,
          eventRecord,
        });
      }
      if (vstoragePathIsAncestorOf(PENDING_TX_PATH_PREFIX, path)) {
        vstorageEvents.pendingTx.push({
          path,
          value: attributes.value,
          eventRecord,
        });
      }
    }
    const { portfolio: portfolioEvents, pendingTx: pendingTxEvents } =
      vstorageEvents;

    // Detect new portfolios.
    await processPortfolioEvents(portfolioEvents, respHeight, deferrals, {
      marshaller,
      vstorage: query.vstorage,
      portfolioKeyForDepositAddr,
    });

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
            const steps = await handleDeposit(
              unprefixedPortfolioPath as any,
              amount,
              feeAsset.brand as Brand<'nat'>,
              { readPublished: query.readPublished, spectrum, cosmosRest },
            );

            // TODO: consolidate with portfolioIdOfPath
            const portfolioId = parseInt(
              stripPrefix(`portfolio`, portfolioKey),
              10,
            );

            return { portfolioId, steps };
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

    for (const { portfolioId, steps } of portfolioOps.filter(x => !!x)) {
      if (!steps) continue;
      const result = await signingSmartWalletKit.invokeEntry({
        targetName: 'planner',
        method: 'submit',
        args: [portfolioId, steps],
      });
      console.log('result', result);
    }
  }

  console.warn('Terminating...');
};
harden(startEngine);
