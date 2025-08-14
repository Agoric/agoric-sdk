/// <reference types="ses" />
/* eslint-env node */
import { inspect } from 'node:util';
import { q, Fail } from '@endo/errors';
import { isPrimitive } from '@endo/pass-style';
import { makePromiseKit, type PromiseKit } from '@endo/promise-kit';
import { Nat } from '@endo/nat';
import { PortfolioStatusShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { AmountMath } from '@agoric/ertp';
import type { Coin, SigningStargateClient } from '@cosmjs/stargate';
import type { InvokeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { mustMatch } from '@agoric/internal';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { VstorageKit, SmartWalletKit } from '@agoric/client-utils';
import type { Bech32Address } from '@agoric/orchestration';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import type { SpectrumClient } from './spectrum-client.ts';
import type { CosmosRestClient } from './cosmos-rest-client.ts';
import { handleDeposit } from './plan-deposit.ts';
import { submitAction } from './swingset-tx.ts';
import {
  handleSubscription,
  type Subscription,
} from './subscription-manager.ts';
import type { PortfolioInstanceContext } from './axelar/gmp.ts';

const { isInteger } = Number;

const sink = () => {};

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

const VSTORAGE_PATH_PREFIX = 'published.ymax0.portfolios';
const ORCHESTRATION_SUBSCRIPTIONS_PREFIX =
  'published.orchestration.subscriptions';

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

const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${q(prefix)}`;
  return str.slice(prefix.length);
};

const tryJsonParse = (json: string, replaceErr?: (err?: Error) => unknown) => {
  try {
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

type IO = {
  ctx: PortfolioInstanceContext;
  rpc: CosmosRPCClient;
  vstorageKit: VstorageKit;
  spectrum: SpectrumClient;
  cosmosRest: CosmosRestClient;
  stargateClient: SigningStargateClient;
  walletKit: SmartWalletKit;
  plannerAddress: string;
};

export const startEngine = async ({
  ctx,
  rpc,
  vstorageKit,
  spectrum,
  cosmosRest,
  stargateClient,
  walletKit,
  plannerAddress,
}: IO) => {
  await null;

  const chainStatus = await rpc.request('status', {});
  console.warn('agd status', chainStatus);

  // Test Spectrum API with real pool balance data
  try {
    console.warn('\n[Engine] Testing Spectrum pool balance API...');
    const testEthAddress = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'; // Example ETH address

    const testCases = [{ chain: 'ethereum', pool: 'aave' }];

    for (const testCase of testCases) {
      try {
        console.warn(
          `\n[Engine] Testing ${testCase.chain}/${testCase.pool} pool balance for ${testEthAddress}`,
        );
        const poolBalance = await spectrum.getPoolBalance(
          testCase.chain as any,
          testCase.pool as any,
          testEthAddress,
        );
        console.warn(`[Engine] ✅ Pool balance found:`, {
          supplyBalance: poolBalance.balance.supplyBalance.toLocaleString(),
          borrowAmount: poolBalance.balance.borrowAmount.toLocaleString(),
          chain: poolBalance.chain,
          pool: poolBalance.pool,
        });
      } catch (specError) {
        console.warn(
          `[Engine] Pool balance test (${testCase.chain}/${testCase.pool}): ${specError instanceof Error ? specError.message : specError}`,
        );
      }
    }
  } catch (error) {
    console.error('[Engine] Spectrum balance testing failed:', error);
  }

  // Test Cosmos REST API client with Noble chain
  try {
    console.warn('[Engine] Testing Cosmos REST API client...');
    const availableChains = cosmosRest.getAvailableChains();
    console.warn(
      `[Engine] Available chains: ${availableChains.map(c => c.config.name).join(', ')}`,
    );

    // Test chain info for Noble
    const nobleInfo = await cosmosRest.getChainInfo('noble');
    console.warn(
      `[Engine] Noble chain info retrieved successfully. Chain ID: ${(nobleInfo as any)?.default_node_info?.network || 'unknown'}`,
    );

    // Test balance fetching for a known address (this will fail gracefully if address doesn't exist)
    // Using a placeholder address - in real usage, this would be a user's address
    const testAddress = 'noble1xw2j23rcwrkg02yxdn5ha2d2x868cuk6370s9y'; // This is just for testing the API structure
    try {
      const balances = await cosmosRest.getAccountBalances(
        'noble',
        testAddress,
      );
      console.warn(
        `[Engine] Noble balance API test successful. Response structure verified. Found ${balances.balances.length} balance(s):`,
        balances.balances
          .map(coin => `${coin.amount} ${coin.denom}`)
          .join(', ') || 'No balances',
      );
    } catch (balanceError) {
      // This is expected to fail with the test address, but shows the API is working
      console.warn(
        `[Engine] Noble balance API responding (expected error for test address): ${balanceError instanceof Error ? balanceError.message : balanceError}`,
      );
    }
  } catch (error) {
    console.error('[Engine] Cosmos REST API initialization failed:', error);
    // Continue with limited functionality
  }

  const agoricInfo = await cosmosRest.getChainInfo('agoric');
  const agoricChainId = (agoricInfo as any)?.default_node_info?.network;
  console.warn('Retrieved info for Agoric chain', agoricChainId);

  await rpc.opened();
  // console.warn('RPC client opened:', rpc);

  // TODO: verify consumption of paginated data.
  const portfolioKeys = await vstorageKit.vstorage.keys(VSTORAGE_PATH_PREFIX);
  const portfolioKeyForDepositAddr = new Map() as Map<Bech32Address, string>;

  await makeWorkPool(portfolioKeys, undefined, async portfolioKey => {
    const status = await vstorageKit.readPublished(
      `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${portfolioKey}`,
    );
    mustMatch(status, PortfolioStatusShapeExt, portfolioKey);
    const { depositAddress } = status;
    if (!depositAddress) return;
    portfolioKeyForDepositAddr.set(depositAddress, portfolioKey);
  }).done;

  console.warn('Initializing subscription tracking...');
  try {
    const subscriptionKeys = await vstorageKit.vstorage.keys(
      ORCHESTRATION_SUBSCRIPTIONS_PREFIX,
    );
    console.warn(
      `Found ${subscriptionKeys.length} existing subscriptions to monitor`,
    );

    // Process existing pending subscriptions on startup
    await makeWorkPool(subscriptionKeys, undefined, async subscriptionKey => {
      try {
        const subscriptionData = await vstorageKit.readPublished(
          `${stripPrefix('published.', ORCHESTRATION_SUBSCRIPTIONS_PREFIX)}.${subscriptionKey}`,
        );
        const subscription = subscriptionData as Subscription;
        console.warn(`Found existing subscription: ${subscriptionKey}`, {
          type: subscription.type,
          status: subscription.status,
        });

        if (subscription.status === 'pending') {
          console.warn(
            `Processing existing pending subscription: ${subscriptionKey}`,
          );
          try {
            subscription.subscriptionId = subscriptionKey;
            await handleSubscription(ctx, subscription);
          } catch (error) {
            console.error(
              `Failed to process existing subscription ${subscriptionKey}:`,
              error,
            );
          }
        }
      } catch (error) {
        console.warn(
          `Could not read subscription ${subscriptionKey}:`,
          error.message,
        );
      }
    }).done;
  } catch (error) {
    console.warn(
      'No existing subscriptions found or error reading subscriptions:',
      error.message,
    );
  }

  try {
    // console.warn('consuming events');
    const responses = rpc.subscribeAll([
      // vstorage events are in BEGIN_BLOCK/END_BLOCK activity
      "tm.event = 'NewBlockHeader'",
      // transactions
      "tm.event = 'Tx'",
    ]);
    for await (const {
      query: _query,
      data: resp,
      events: respEvents,
    } of responses) {
      const { type, value: respData } = resp;
      if (!respEvents) {
        console.warn('missing events', type);
        continue;
      }

      // Capture vstorage updates.
      const eventRecords = Object.entries(respData).flatMap(([key, value]) => {
        // We care about result_begin_block/result_end_block/etc.
        if (!key.startsWith('result_')) return [];
        const events = (value as any)?.events;
        if (!events) console.warn('missing events', type, key);
        return events ?? [];
      }) as CosmosEvent[];
      const vstorageEvents = partialMap(eventRecords, eventRecord => {
        const { type: eventType, attributes: attrRecords } = eventRecord;
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

        // Filter for paths we care about (portfolios or subscriptions).
        const path = encodedKeyToPath(attributes.key);
        if (
          !vstoragePathStartsWith(path, VSTORAGE_PATH_PREFIX) &&
          !vstoragePathStartsWith(path, ORCHESTRATION_SUBSCRIPTIONS_PREFIX)
        )
          return;

        return {
          path,
          value: attributes.value,
          pathType: vstoragePathStartsWith(path, VSTORAGE_PATH_PREFIX)
            ? 'portfolio'
            : 'subscription',
        };
      });

      const portfolioEvents = vstorageEvents.filter(
        event => event.pathType === 'portfolio',
      );
      const subscriptionEvents = vstorageEvents.filter(
        event => event.pathType === 'subscription',
      );

      // Detect new portfolios.
      for (const { path, value: vstorageValue } of portfolioEvents) {
        const streamCell = tryJsonParse(
          vstorageValue,
          _err =>
            Fail`non-JSON value at vstorage path ${q(path)}: ${vstorageValue}`,
        );
        mustMatch(harden(streamCell), StreamCellShape);
        if (path === VSTORAGE_PATH_PREFIX) {
          for (let i = 0; i < streamCell.values.length; i += 1) {
            const strValue = streamCell.values[i];
            const value = tryJsonParse(
              // @ts-expect-error use `undefined` to force an error for non-string input
              typeof strValue === 'string' ? strValue : undefined,
              _err =>
                Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
            );
            const portfoliosData = vstorageKit.marshaller.fromCapData(
              value,
            ) as StatusFor['portfolios'];
            if (portfoliosData.addPortfolio) {
              const key = portfoliosData.addPortfolio;
              console.warn('Detected new portfolio', key);
              // XXX we should probably read at streamCell.blockHeight.
              const status = await vstorageKit.readPublished(
                `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${key}`,
              );
              mustMatch(status, PortfolioStatusShapeExt, key);
              const { depositAddress } = status;
              if (!depositAddress) continue;
              portfolioKeyForDepositAddr.set(depositAddress, key);
              console.warn('Added new portfolio', key, depositAddress);
            }
          }
        } else {
        }
      }

      // Handle orchestration subscriptions.
      for (const { path, value: vstorageValue } of subscriptionEvents) {
        const streamCell = tryJsonParse(
          vstorageValue,
          _err =>
            Fail`non-JSON value at vstorage path ${q(path)}: ${vstorageValue}`,
        );
        mustMatch(harden(streamCell), StreamCellShape);

        // Extract subscription ID from path (e.g., "published.orchestration.subscriptions.subscription1234")
        const subscriptionId = stripPrefix(
          `${ORCHESTRATION_SUBSCRIPTIONS_PREFIX}.`,
          path,
        );
        console.warn('Processing subscription event', subscriptionId, path);

        for (let i = 0; i < streamCell.values.length; i += 1) {
          const strValue = streamCell.values[i];
          const value = tryJsonParse(
            // @ts-expect-error use `undefined` to force an error for non-string input
            typeof strValue === 'string' ? strValue : undefined,
            _err =>
              Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
          );

          try {
            const subscriptionData = vstorageKit.marshaller.fromCapData(
              value,
            ) as Subscription;
            console.warn('Handling subscription:', {
              subscriptionId,
              type: subscriptionData.type,
            });

            if (subscriptionData.status !== 'pending') {
              console.warn(
                `Skipping non-pending subscription ${subscriptionId} with status: ${subscriptionData.status}`,
              );
              continue;
            }

            console.warn('Processing pending subscription', {
              subscriptionId,
              type: subscriptionData.type,
              status: subscriptionData.status,
            });

            subscriptionData.subscriptionId = subscriptionId;
            await handleSubscription(ctx, subscriptionData);
          } catch (error) {
            console.error(
              `Failed to process subscription ${subscriptionId}:`,
              error,
            );
          }
        }
      }

      // Detect activity against portfolio deposit addresses.
      const addrsWithActivity: Bech32Address[] = [
        ...new Set([
          ...(respEvents['coin_received.receiver'] || []),
          ...(respEvents['coin_spent.spender'] || []),
          ...(respEvents['transfer.recipient'] || []),
          ...(respEvents['transfer.sender'] || []),
        ]),
      ];
      const depositAddrsWithActivity = new Map(
        partialMap(addrsWithActivity, addr => {
          const portfolioKey = portfolioKeyForDepositAddr.get(addr);
          return portfolioKey ? [addr, portfolioKey] : undefined;
        }),
      );

      const addrBalances = new Map() as Map<Bech32Address, Coin[]>;
      await makeWorkPool(addrsWithActivity, undefined, async addr => {
        const balancesResp = await cosmosRest.getAccountBalances(
          'agoric',
          addr,
        );
        addrBalances.set(addr, balancesResp.balances);
      }).done;
      console.log(
        inspect(
          {
            addrsWithActivity,
            addrBalances,
            depositAddrsWithActivity,
            portfolioEvents,
            subscriptionEvents,
          },
          { depth: 10 },
        ),
      );

      const vbankAssets = new Map(
        depositAddrsWithActivity.size
          ? await vstorageKit.readPublished('agoricNames.vbankAsset')
          : undefined,
      );

      // Respond to deposits.
      const portfolioOps = await Promise.all(
        [...depositAddrsWithActivity.entries()].map(
          async ([addr, portfolioKey]) => {
            // TODO: maybe snapshot initial balances for deposit amount determination?
            // For now, require a single denom and assume that the full amount is a new deposit.
            const balances = addrBalances.get(addr);
            if (balances?.length !== 1) {
              console.error(
                `Unclear which denom to handle for ${addr}`,
                balances?.map(amount => amount.denom),
              );
              return;
            }
            const { denom, amount: balanceValue } = balances[0];

            const brand = vbankAssets.get(denom)?.brand as
              | undefined
              | Brand<'nat'>;
            if (!brand) throw Fail`no brand found for denom ${q(denom)}`;
            const amount = AmountMath.make(brand, Nat(BigInt(balanceValue)));

            const unprefixedPortfolioPath = stripPrefix(
              'published.',
              `${VSTORAGE_PATH_PREFIX}.${portfolioKey}`,
            );

            const steps = await handleDeposit(
              amount,
              unprefixedPortfolioPath as any,
              vstorageKit.readPublished,
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
        const action: InvokeAction = harden({
          method: 'invokeItem',
          name: 'planner',
          steps: [{ method: 'submit', args: [portfolioId, steps] }],
        });

        console.log('submitting action', action);
        const result = await submitAction(action, {
          stargateClient,
          walletKit,
          skipPoll: true,
          address: plannerAddress,
        });
        console.log('result', result);
      }
    }
  } finally {
    console.warn('Terminating...');
    rpc.close();
  }
};
harden(startEngine);
