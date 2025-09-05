/// <reference types="ses" />
/* eslint-env node */
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { PortfolioStatusShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import type { Bech32Address } from '@agoric/orchestration';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import type { Coin } from '@cosmjs/stargate';
import { Fail, q, X } from '@endo/errors';
import { M, matches } from '@endo/patterns';
import { Nat } from '@endo/nat';
import { isPrimitive } from '@endo/pass-style';
import { makePromiseKit, type PromiseKit } from '@endo/promise-kit';
import { inspect } from 'node:util';
import type { CosmosRestClient } from './cosmos-rest-client.ts';
import type { CosmosRPCClient, SubscriptionResponse } from './cosmos-rpc.ts';
import { handleDeposit } from './plan-deposit.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import {
  handlePendingTx,
  type EvmContext,
  type PendingTx,
} from './pending-tx-manager.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { log } from 'node:console';

const { isInteger } = Number;

const sink = () => {};

const STALE = 'STALE';

const throwErrorCode = <Code extends string = string>(
  message: string,
  code: Code,
): never => {
  const err = Error(message);
  Object.defineProperty(err, 'code', { value: code, enumerable: true });
  throw err;
};

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
  const split = key.split(EncodedKeySeparator);
  split.length > 1 || Fail`invalid encoded key ${q(key)}`;
  const encodedPath = split.slice(1).join(EncodedKeySeparator);
  const path = encodedPath.replaceAll(EncodedKeySeparator, PathSeparator);
  return path;
};

/**
 * Determine whether a dot-separated path starts with a sequence of path
 * components.
 */
const vstoragePathStartsWith = (path: string, prefix: string) =>
  path === prefix ||
  path.startsWith(prefix.endsWith('.') ? prefix : `${prefix}.`);

export const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${q(prefix)}`;
  return str.slice(prefix.length);
};

/**
 * Parse input as JSON, or handle an error (for e.g. substituting a default or
 * applying a more specific message).
 */
const tryJsonParse = (json: string, replaceErr?: (err?: Error) => unknown) => {
  try {
    const type = typeof json;
    if (type !== 'string') throw Error(`input must be a string, not ${type}`);
    return JSON.parse(json);
  } catch (err) {
    if (!replaceErr) throw err;
    try {
      return replaceErr(err);
    } catch (newErr) {
      if (!newErr.cause) assert.note(newErr, err.message);
      throw newErr;
    }
  }
};

/**
 * Map the elements of an array to new values, skipping elements for which the
 * mapping results in either `undefined` or `false`.
 */
const partialMap = <T, U>(
  arr: T[],
  mapOrDrop: (value: T, index?: number, arr?: T[]) => U | undefined | false,
): U[] =>
  arr.flatMap((el, i, arrArg) => {
    const result = mapOrDrop(el, i, arrArg);
    if (result === undefined || result === false) return [];
    return [result];
  });

/**
 * Consume an async iterable with at most `capacity` unsettled results at any
 * given time, passing each input through `processInput` and providing
 * [result, index] pairs in settlement order.
 * Source order can be recovered with consumer code like:
 * ```
 * const results = [];
 * for (const [result, i] of makeWorkPool(...)) results[i] = result;
 * ```
 * or something more sophisticated to eagerly detect complete subsequences
 * immediately following a previous high-water mark for contiguous results.
 *
 * To support cases in which `processInput` is used only for side effects rather
 * than its return value, the returned AsyncGenerator has a promise-valued
 * `done` property that fulfills when all input has been processed (to `true` if
 * the source was exhausted or to `false` if iteration was aborted early),
 * regardless of how many final iteration results have been consumed:
 * ```
 * await makeWorkPool(...).done;
 * ```
 */
const makeWorkPool = <T, U = T, M extends 'all' | 'allSettled' = 'all'>(
  source: AsyncIterable<T> | Iterable<T>,
  config: undefined | [capacity: number][0] | { capacity?: number; mode?: M },
  processInput: (
    input: Awaited<T>,
    index?: number,
  ) => Promise<Awaited<U>> | Awaited<U> = x => x as any,
): AsyncGenerator<
  [
    M extends 'allSettled' ? PromiseSettledResult<Awaited<U>> : Awaited<U>,
    number,
  ]
> & { done: Promise<boolean> } => {
  // Validate arguments.
  if (isPrimitive(config)) config = { capacity: config, mode: undefined };
  const { capacity = 10, mode = 'all' } = config;
  if (!(capacity === Infinity || (isInteger(capacity) && capacity > 0))) {
    throw RangeError('capacity must be a positive integer');
  }
  if (mode !== 'all' && mode !== 'allSettled') {
    throw RangeError('mode must be "all" or "allSettled"');
  }

  // Normalize source into an `inputs` iterator.
  const makeInputs = source[Symbol.asyncIterator] || source[Symbol.iterator];
  const inputs = Reflect.apply(makeInputs, source, []) as
    | AsyncIterator<Awaited<T>>
    | Iterator<Awaited<T>>;
  let inputsExhausted = false;
  let terminated = false;
  const doneKit = makePromiseKit() as PromiseKit<boolean>;

  // Concurrently consume up to `capacity` inputs, pushing the result of
  // processing each into a linked chain of promises before consuming more.
  let nextIndex = 0;
  type ResultNode = {
    nextP: Promise<ResultNode>;
    index: number;
    result: M extends 'allSettled'
      ? PromiseSettledResult<Awaited<U>>
      : Awaited<U>;
  };
  const { promise: headP, ...headResolvers } =
    makePromiseKit() as PromiseKit<ResultNode>;
  let { resolve: resolveCurrent, reject } = headResolvers;
  let inFlight = 0;
  const takeMoreInput = async () => {
    await null;
    while (inFlight < capacity && !inputsExhausted && !terminated) {
      inFlight += 1;
      const index = nextIndex;
      nextIndex += 1;
      let iterResultP: Promise<IteratorResult<Awaited<T>>>;
      try {
        iterResultP = Promise.resolve(inputs.next());
      } catch (err) {
        iterResultP = Promise.reject(err);
      }
      void iterResultP
        .then(async iterResult => {
          if (terminated) return;

          if (iterResult.done) {
            inFlight -= 1;
            inputsExhausted = true;
            void takeMoreInput();
            return;
          }

          // Process the input, propagating errors if mode is not "allSettled".
          await null;
          let settlementDesc: PromiseSettledResult<Awaited<U>> = {
            status: 'rejected',
            reason: undefined,
          };
          try {
            const fulfillment = await processInput(iterResult.value, index);
            if (terminated) return;
            settlementDesc = { status: 'fulfilled', value: fulfillment };
          } catch (err) {
            if (terminated) return;
            if (mode !== 'allSettled') throw err;
            (settlementDesc as PromiseRejectedResult).reason = err;
          }

          // Fulfill the current tail promise with a record that includes the
          // source index to which it corresponds and a reference to a new
          // [unsettled] successor (thereby extending the chain), then try to
          // consume more input.
          const { promise: nextP, ...nextResolvers } =
            makePromiseKit() as PromiseKit<ResultNode>;
          // Analogous to `Promise.allSettled`, mode "allSettled" produces
          // { status, value, reason } PromiseSettledResult records.
          const result =
            mode === 'allSettled'
              ? settlementDesc
              : (settlementDesc as PromiseFulfilledResult<Awaited<U>>).value;
          inFlight -= 1;
          void takeMoreInput();
          resolveCurrent({ nextP, index, result: result as any });
          ({ resolve: resolveCurrent, reject } = nextResolvers);
        })
        .catch(err => {
          // End the chain with this rejection.
          terminated = true;
          reject(err);
          doneKit.reject(err);
          void (async () => inputs.throw?.(err))().catch(sink);
        });
    }
    if (inFlight <= 0 && inputsExhausted) {
      // @ts-expect-error This dummy signaling record conveys no result.
      resolveCurrent({ nextP: undefined, index: -1, result: undefined });
      doneKit.resolve(true);
    }
  };

  const results = (async function* generateResults(nextP) {
    await null;
    let exhausted = false;
    try {
      for (;;) {
        const { nextP: successor, index, result } = await nextP;
        nextP = successor;
        if (!successor) break;
        yield Object.freeze([result, index]) as [typeof result, number];
      }
      exhausted = true;
    } catch (err) {
      terminated = true;
      doneKit.reject(err);
      void (async () => inputs.throw?.(err))().catch(sink);
      throw err;
    } finally {
      const interrupted = !exhausted && !terminated;
      terminated = true;
      doneKit.resolve(false);
      if (interrupted) void (async () => inputs.return?.())().catch(sink);
    }
  })(headP);
  Object.defineProperty(results, 'done', {
    value: doneKit.promise,
    enumerable: true,
  });

  void takeMoreInput();

  return harden(results as typeof results & { done: Promise<boolean> });
};

type Powers = {
  evmCtx: Omit<EvmContext, 'signingSmartWalletKit' | 'fetch'>;
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
  marshaller: SigningSmartWalletKit['marshaller'],
  readAndDecodeStreamCellValue: (
    vstoragePath: string,
    options?: { minBlockHeight?: bigint; retries?: number },
  ) => any,
  portfolioKeyForDepositAddr: Map<Bech32Address, string>,
  deferrals: EventRecord[],
) => {
  await null;
  for (const portfolioEvent of portfolioEvents) {
    const { path, value: cellJson, eventRecord } = portfolioEvent;
    const streamCell = tryJsonParse(
      cellJson,
      _err => Fail`non-JSON value at vstorage path ${q(path)}: ${cellJson}`,
    );
    mustMatch(harden(streamCell), StreamCellShape);
    if (path === PORTFOLIOS_PATH_PREFIX) {
      for (let i = 0; i < streamCell.values.length; i += 1) {
        const strValue = streamCell.values[i];
        const value = tryJsonParse(
          // @ts-expect-error use `undefined` to force an error for non-string input
          typeof strValue === 'string' ? strValue : undefined,
          _err =>
            Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
        );
        const portfoliosData = marshaller.fromCapData(
          value,
        ) as StatusFor['portfolios'];
        if (portfoliosData.addPortfolio) {
          const key = portfoliosData.addPortfolio;
          console.warn('Detected new portfolio', key);
          try {
            const status = await readAndDecodeStreamCellValue(
              `${PORTFOLIOS_PATH_PREFIX}.${key}`,
              { minBlockHeight: eventRecord.blockHeight, retries: 4 },
            );
            mustMatch(status, PortfolioStatusShapeExt, key);
            const { depositAddress } = status;
            if (!depositAddress) continue;
            portfolioKeyForDepositAddr.set(depositAddress, key);
            console.warn('Added new portfolio', key, depositAddress);
            deferrals.push({
              blockHeight: eventRecord.blockHeight,
              type: 'transfer' as const,
              address: depositAddress,
            });
          } catch (err) {
            if (err.code !== STALE) throw err;
            console.error(
              `Deferring addPortfolio of age ${blockHeight - eventRecord.blockHeight} block(s)`,
              eventRecord,
            );
            deferrals.push(eventRecord);
          }
        }
      }
    }
    // TODO: Handle portfolio-level path `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}` for addition/update of depositAddress.
  }
};

export const PendingTxShape = M.splitRecord(
  {
    // resolver only handles pending transactions
    status: M.or('pending'),
    type: M.string(),
    destinationAddress: M.string(),
  },
  {
    // amount is optional for GMP transactions, required for CCTP
    amount: M.bigint(),
  },
);

export const parsePendingTx = (
  txId: `tx${number}`,
  txData,
  marshaller?: SigningSmartWalletKit['marshaller'],
): PendingTx | null => {
  const data = marshaller ? marshaller.fromCapData(txData) : txData;
  if (!matches(data, PendingTxShape)) {
    const err = assert.error(
      X`expected data ${data} to match ${q(PendingTxShape)}`,
    );
    console.error(err);
    return null;
  }

  if (data.type === TxType.CCTP_TO_EVM && data.amount === undefined) {
    const err = assert.error(
      X`CCTP transaction ${txId} is missing required amount field`,
    );
    console.error(err);
    return null;
  }

  return { txId, ...(data as any) } as PendingTx;
};

export const processPendingTxEvents = async (
  evmCtx: EvmContext,
  events: Array<{ path: string; value: string }>,
  marshaller: SigningSmartWalletKit['marshaller'],
  handlePendingTxFn = handlePendingTx,
  logFn = log,
) => {
  for (const { path, value: cellJson } of events) {
    const streamCell = tryJsonParse(
      cellJson,
      _err => Fail`non-JSON value at vstorage path ${q(path)}: ${cellJson}`,
    );
    mustMatch(harden(streamCell), StreamCellShape);

    // Extract txId from path (e.g., "published.ymax0.pendingTxs.tx1")
    const txId = stripPrefix(`${PENDING_TX_PATH_PREFIX}.`, path);
    console.warn('Processing pendingTx event', txId, path);

    for (let i = 0; i < streamCell.values.length; i += 1) {
      const strValue = streamCell.values[i];
      const value = tryJsonParse(
        // @ts-expect-error use `undefined` to force an error for non-string input
        typeof strValue === 'string' ? strValue : undefined,
        _err =>
          Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
      );

      const tx = parsePendingTx(txId as `tx${number}`, value, marshaller);
      if (!tx) continue;

      console.warn('Handling pending tx:', {
        txId,
        type: tx.type,
        status: tx.status,
      });

      const errorHandler = error => {
        console.error(`⚠️ Failed to process pendingTx: ${txId}`, error);
      };

      void handlePendingTxFn(evmCtx, tx, { log: logFn }).catch(errorHandler);
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
  { depositIbcDenom }: { depositIbcDenom: string },
) => {
  await null;
  const { query, marshaller } = signingSmartWalletKit;
  /**
   * Read from a vstorage path, requiring the data to be a StreamCell of
   * CapData-encoded values and returning the decoding of the final one.
   * UNTIL https://github.com/Agoric/agoric-sdk/pull/11630
   */
  const readAndDecodeStreamCellValue = async (
    vstoragePath: string,
    {
      minBlockHeight = 0n,
      retries = 0,
    }: { minBlockHeight?: bigint; retries?: number } = {},
  ) => {
    await null;
    let finalErr: undefined | Error;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let values: string[];
      try {
        const { blockHeight, result } = await query.vstorage.readStorageMeta(
          vstoragePath,
          { kind: 'data' } as const,
        );
        if (typeof blockHeight !== 'bigint') {
          throw Fail`blockHeight ${blockHeight} must be a bigint`;
        }
        if (blockHeight < minBlockHeight) {
          throwErrorCode(`old blockHeight ${blockHeight}`, STALE);
        }
        const streamCellJson = result.value;
        const streamCell = tryJsonParse(
          streamCellJson,
          _err =>
            Fail`non-JSON value at vstorage path ${q(vstoragePath)}: ${streamCellJson}`,
        );
        mustMatch(harden(streamCell), StreamCellShape);
        // We have suitably fresh data; any further errors should propagate.
        values = streamCell.values;
      } catch (err) {
        if (err.code || !finalErr) finalErr = err;
        continue;
      }
      const strValue = values.at(-1) as string;
      const lastValueCapData = tryJsonParse(
        strValue,
        _err =>
          Fail`non-JSON StreamCell value for ${q(vstoragePath)} index ${q(values.length - 1)}: ${strValue}`,
      );
      return marshaller.fromCapData(lastValueCapData);
    }
    throw finalErr;
  };

  const chainStatus = await rpc.request('status', {});
  console.warn('agoric chain status', chainStatus);

  // TODO: Test Spectrum API
  {
    const testCases = [
      // TODO: { chain: 'ethereum', pool: 'aave', ethAddr: ... },
    ] as Array<{ chain: any; pool: any; ethAddr: string }>;
    for (const testCase of testCases) {
      const { chain, pool, ethAddr } = testCase;
      try {
        const poolBalance = await spectrum.getPoolBalance(chain, pool, ethAddr);
        console.warn('Spectrum pool balance:', {
          chain: poolBalance.chain,
          pool: poolBalance.pool,
          ethAddr,
          supplyBalance: poolBalance.balance.supplyBalance.toLocaleString(),
          borrowAmount: poolBalance.balance.borrowAmount.toLocaleString(),
        });
      } catch (err) {
        console.error(`Spectrum getPoolBalance failed for ${q(testCase)}`, err);
        throw err;
      }
    }
  }

  // Test Cosmos REST API client with Noble chain
  try {
    const nobleInfo = await cosmosRest.getChainInfo('noble');
    console.warn(
      'Noble chain ID',
      (nobleInfo as any)?.default_node_info?.network,
      nobleInfo,
    );
    // Test balance fetching for a known address (this will fail gracefully if
    // address doesn't exist)
    const testAddress = 'noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y';
    const balances = await cosmosRest.getAccountBalances('noble', testAddress);
    console.warn(
      'Noble balance denoms',
      balances.balances.map(coin => coin.denom),
    );
  } catch (err) {
    console.error('Noble getAccountBalances failed', err);
    throw err;
  }

  const agoricInfo = await cosmosRest.getChainInfo('agoric');
  console.warn(
    'Agoric chain ID',
    (agoricInfo as any)?.default_node_info?.network,
    agoricInfo,
  );

  const vbankAssets = new Map<string, AssetInfo>(
    await query.readPublished('agoricNames.vbankAsset'),
  );
  const depositAsset = depositIbcDenom.startsWith('ibc/')
    ? vbankAssets.get(depositIbcDenom)
    : [...vbankAssets.values()].find(
        assetInfo => assetInfo.issuerName === depositIbcDenom,
      );
  if (!depositAsset) {
    throw Fail`Could not find vbankAsset for ${q(depositIbcDenom)}`;
  }

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
          `Attempting to read block height from unexpected response type ${respType}`,
          respData,
        );
        const obj = Object.values(respData)[0];
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
  const firstResult = await responses.next();
  (firstResult.done === false && firstResult.value === undefined) ||
    Fail`Unexpected ready signal ${firstResult}`;
  // console.log('subscribed to events', subscriptionFilters);

  // TODO: Verify consumption of paginated data.
  // TODO: Retry when data is associated with a block height lower than that of
  //       the first result from `responses`.
  const portfolioKeys = await query.vstorage.keys(PORTFOLIOS_PATH_PREFIX);
  const portfolioKeyForDepositAddr = new Map() as Map<Bech32Address, string>;
  await makeWorkPool(portfolioKeys, undefined, async portfolioKey => {
    const status = await query.readPublished(
      `${stripPrefix('published.', PORTFOLIOS_PATH_PREFIX)}.${portfolioKey}`,
    );
    mustMatch(status, PortfolioStatusShapeExt, portfolioKey);
    const { depositAddress } = status;
    if (!depositAddress) return;
    portfolioKeyForDepositAddr.set(depositAddress, portfolioKey);
    // TODO: Use the block height associated with portfolioKey.
    // https://github.com/Agoric/agoric-sdk/pull/11630
    deferrals.push({
      blockHeight: 0n,
      type: 'transfer' as const,
      address: depositAddress,
    });
  }).done;

  const pendingTxKeys = await query.vstorage.keys(PENDING_TX_PATH_PREFIX);
  console.warn(
    `Found ${pendingTxKeys.length} existing pendingTxKeys to monitor`,
  );

  await makeWorkPool(pendingTxKeys, undefined, async txId => {
    const logIgnoredError = err => {
      const msg = `⚠️ Failed to process existing pendingTx: ${txId}`;
      console.error(msg, err);
    };

    let data;
    try {
      // eslint-disable-next-line @jessie.js/safe-await-separator
      data = await query.readPublished(
        stripPrefix('published.', `${PENDING_TX_PATH_PREFIX}.${txId}`),
      );
    } catch (err) {
      logIgnoredError(err);
      return;
    }

    const tx = parsePendingTx(txId as `tx${number}`, data);
    if (!tx) return;

    console.warn(`Found existing tx: ${txId}`, {
      type: tx.type,
      status: tx.status,
    });

    // Process existing pending transactions on startup
    void handlePendingTx({ ...evmCtx, signingSmartWalletKit, fetch }, tx, {
      log,
    }).catch(logIgnoredError);
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
    const newEvents = Object.entries(respData).flatMap(([key, value]) => {
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
    const vstorageEvents = partialMap(eventRecords, eventRecord => {
      const { type: eventType, attributes: attrRecords } = eventRecord.event;
      // Filter for vstorage state_change events.
      // cf. golang/cosmos/types/events.go
      if (eventType !== 'state_change') return;
      const attributes = fromUniqueEntries(
        attrRecords?.map(({ key, value }) => [key, value]) || [],
      );
      if (attributes.store !== 'vstorage') return;

      // Require attributes "key" and "value".
      if (attributes.key === undefined || attributes.value === undefined) {
        console.error('vstorage state_change missing "key" and/or "value"');
        return;
      }

      // Filter for paths we care about (portfolios or pending transactions).
      const path = encodedKeyToPath(attributes.key);

      if (vstoragePathStartsWith(path, PORTFOLIOS_PATH_PREFIX)) {
        return {
          type: 'portfolio' as const,
          path,
          value: attributes.value,
          eventRecord,
        };
      }
      if (vstoragePathStartsWith(path, PENDING_TX_PATH_PREFIX)) {
        return {
          type: 'pendingTx' as const,
          path,
          value: attributes.value,
          eventRecord,
        };
      }
    });

    const portfolioEvents = vstorageEvents.filter(
      event => event.type === 'portfolio',
    );
    const pendingTxEvents = vstorageEvents.filter(
      event => event.type === 'pendingTx',
    );

    // Detect new portfolios.
    await processPortfolioEvents(
      portfolioEvents,
      respHeight,
      marshaller,
      readAndDecodeStreamCellValue,
      portfolioKeyForDepositAddr,
      deferrals,
    );

    await processPendingTxEvents(
      { ...evmCtx, signingSmartWalletKit, fetch },
      pendingTxEvents,
      marshaller,
    );

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
        async ([addr, { portfolioKey, eventRecord: _eventRecord }]) => {
          const amount = pickBalance(addrBalances.get(addr), depositAsset);
          if (!amount) {
            console.warn(`No ${q(depositAsset.issuerName)} at ${addr}`);
            return;
          }

          const unprefixedPortfolioPath = stripPrefix(
            'published.',
            `${PORTFOLIOS_PATH_PREFIX}.${portfolioKey}`,
          );

          // TODO: Switch to an API that exposes block height, so we can detect stale
          // data and push to `deferrals`.
          const steps = await handleDeposit(
            amount,
            unprefixedPortfolioPath as any,
            query.readPublished,
            spectrum,
            cosmosRest,
          );

          // TODO: consolidate with portfolioIdOfPath
          const portfolioId = parseInt(
            stripPrefix(`portfolio`, portfolioKey),
            10,
          );

          return { portfolioId, steps };
        },
      ),
    );

    for (const { portfolioId, steps } of portfolioOps.filter(x => !!x)) {
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
