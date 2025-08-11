/// <reference types="ses" />
/* eslint-env node */
import { q, Fail } from '@endo/errors';
import { PortfolioStatusShapeExt } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { mustMatch } from '@agoric/internal';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import { fromUniqueEntries } from '@agoric/internal/src/ses-utils.js';
import type { VstorageKit } from '@agoric/client-utils';
import type { Bech32Address } from '@agoric/orchestration';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import { watchCCTPMint, type EVMChain } from './watch-cctp.ts';

type CosmosEvent = {
  type: string;
  attributes?: Array<{ key: string; value: string }>;
};

type CCTPTransfer = {
  amount: number;
  caip: string;
  receiver: string;
};

// Extended portfolio status type that includes CCTP transfers
type PortfolioStatusWithCCTP = {
  positionKeys: string[];
  flowCount: number;
  accountIdByChain: Record<string, `${string}:${string}:${string}`>;
  depositAddress?: `${string}1${string}`;
  targetAllocation?: Partial<Record<string, bigint>>;
  pendingCCTPTransfers?: {
    [chain: string]: CCTPTransfer;
  };
};

const VSTORAGE_PATH_PREFIX = 'published.ymax0.portfolios';

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

const stripPrefix = (prefix: string, str: string) => {
  str.startsWith(prefix) || Fail`${str} is missing prefix ${prefix}`;
  return str.slice(prefix.length);
};

// Track active CCTP watchers to avoid duplicates
type CCTPWatcherKey = `${string}-${string}`; // portfolioKey-chain
const activeCCTPWatchers = new Set<CCTPWatcherKey>();

const launchCCTPWatchers = async (
  portfolioKey: string,
  pendingTransfers: { [chain: string]: CCTPTransfer },
) => {
  for (const [chainName, transfer] of Object.entries(pendingTransfers)) {
    const evmChain = chainName as EVMChain;
    if (!evmChain) {
      console.warn(
        `[CCTP] Unsupported chain for CCTP monitoring: ${chainName}`,
      );
      continue;
    }

    // TODO: What if there are more than 1 pending CCTP transfers for a portfolio
    const watcherKey: CCTPWatcherKey = `${portfolioKey}-${chainName}`;
    if (activeCCTPWatchers.has(watcherKey)) {
      console.log(
        `[CCTP] Watcher already active for portfolio ${portfolioKey} on ${chainName}`,
      );
      continue;
    }

    console.log(
      `[CCTP] Starting watcher for portfolio ${portfolioKey} on ${chainName}`,
      {
        receiver: transfer.receiver,
        amount: transfer.amount,
        caip: transfer.caip,
      },
    );

    activeCCTPWatchers.add(watcherKey);

    watchCCTPMint({
      chain: evmChain,
      recipient: transfer.receiver,
      expectedAmount: BigInt(transfer.amount),
    })
      .then(success => {
        activeCCTPWatchers.delete(watcherKey);
        if (success) {
          console.log(
            `✅ [CCTP] Transfer confirmed for portfolio ${portfolioKey} on ${chainName}`,
          );
          // TODO: Update portfolio state to remove completed transfer
          // This would require calling a contract method to update pendingCCTPTransfers
        } else {
          console.warn(
            `[CCTP] Transfer timed out for portfolio ${portfolioKey} on ${chainName}`,
          );
        }
      })
      .catch(error => {
        activeCCTPWatchers.delete(watcherKey);
        console.error(
          `❌ [CCTP] Watcher failed for portfolio ${portfolioKey} on ${chainName}:`,
          error,
        );
      });
  }
};

const tryJsonParse = (json: string, replaceErr?: (err?: Error) => unknown) => {
  try {
    return JSON.parse(json);
  } catch (err) {
    if (!replaceErr) throw err;
    return replaceErr(err);
  }
};

type IO = {
  rpc: CosmosRPCClient;
  vstorageKit: VstorageKit;
};

export const startResolver = async ({ rpc, vstorageKit }: IO) => {
  await null;

  const chainStatus = await rpc.request('status', {});
  console.warn('agd status', chainStatus);

  await rpc.opened();

  // TODO: verify consumption of paginated data.
  const portfolioKeys = await vstorageKit.vstorage.keys(VSTORAGE_PATH_PREFIX);
  const portfolioAddressEntries = await Promise.all(
    portfolioKeys.map(async key => {
      const status = await vstorageKit.readPublished(
        `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${key}`,
      );
      mustMatch(status, PortfolioStatusShapeExt, key);
      const { depositAddress, pendingCCTPTransfers } =
        status as PortfolioStatusWithCCTP;

      if (pendingCCTPTransfers) {
        console.log(
          `[CCTP] Found pending transfers for existing portfolio ${key}`,
          pendingCCTPTransfers,
        );
        await launchCCTPWatchers(key, pendingCCTPTransfers);
      }

      if (!depositAddress) return undefined;
      return [key, depositAddress] as [string, Bech32Address];
    }),
  );
  const portfolioKeyForDepositAddr = new Map(
    portfolioAddressEntries.flatMap(entry =>
      entry ? [entry.toReversed()] : [],
    ) as [Bech32Address, string][],
  );

  try {
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
      const eventRecords = Object.entries(respData).flatMap(
        ([key, value]: [string, any]) => {
          // We care about result_begin_block/result_end_block/etc.
          if (!key.startsWith('result_')) return [];
          if (!value?.events) {
            console.warn('missing events', type, key);
            return [];
          }
          return value.events as CosmosEvent[];
        },
      );
      const portfolioVstorageEvents = eventRecords.flatMap(eventRecord => {
        const { type: eventType, attributes: attrRecords } = eventRecord;
        // Filter for vstorage state_change events.
        // cf. golang/cosmos/types/events.go
        if (eventType !== 'state_change') return [];
        const attributes = fromUniqueEntries(
          attrRecords?.map(({ key, value }) => [key, value]) || [],
        );
        if (attributes.store !== 'vstorage') return [];

        // Require attributes "key" and "value".
        if (attributes.key === undefined || attributes.value === undefined) {
          console.error('vstorage state_change missing "key" and/or "value"');
          return [];
        }

        // Filter for ymax portfolio paths.
        const path = encodedKeyToPath(attributes.key);
        if (
          path !== VSTORAGE_PATH_PREFIX &&
          !path.startsWith(`${VSTORAGE_PATH_PREFIX}.`)
        ) {
          return [];
        }

        return [{ path, value: attributes.value }];
      });

      // Detect new portfolios.
      for (const { path, value: vstorageValue } of portfolioVstorageEvents) {
        const streamCell = tryJsonParse(
          vstorageValue,
          _err =>
            Fail`non-JSON value at vstorage path ${q(path)}: ${vstorageValue}`,
        );
        harden(streamCell);
        mustMatch(streamCell, StreamCellShape);
        if (path === VSTORAGE_PATH_PREFIX) {
          for (let i = 0; i < streamCell.values.length; i += 1) {
            const strValue = streamCell.values[i] as string;
            const value = tryJsonParse(
              // @ts-expect-error use `undefined` to force an error for non-string input
              typeof strValue === 'string' ? strValue : undefined,
              _err =>
                Fail`non-JSON StreamCell value for ${q(path)} index ${q(i)}: ${strValue}`,
            );
            const portfoliosData = vstorageKit.marshaller.fromCapData(value);
            if (portfoliosData.addPortfolio) {
              const key = portfoliosData.addPortfolio;
              console.warn('Detected new portfolio', key);
              // XXX we should probably read at streamCell.blockHeight.
              const status = await vstorageKit.readPublished(
                `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${key}`,
              );
              mustMatch(status, PortfolioStatusShapeExt, key);
              const { depositAddress, pendingCCTPTransfers } =
                status as PortfolioStatusWithCCTP;
              if (depositAddress) {
                portfolioKeyForDepositAddr.set(depositAddress, key);
                console.warn('Added new portfolio', key, depositAddress);
              }

              if (pendingCCTPTransfers) {
                console.log(
                  `[CCTP] Found pending transfers for new portfolio ${key}`,
                  pendingCCTPTransfers,
                );
                await launchCCTPWatchers(key, pendingCCTPTransfers);
              }
            }
          }
        } else if (path.startsWith(`${VSTORAGE_PATH_PREFIX}.`)) {
          const portfolioKey = path.slice(`${VSTORAGE_PATH_PREFIX}.`.length);
          console.log(`[CCTP] Portfolio update detected for ${portfolioKey}`);

          try {
            const status = await vstorageKit.readPublished(
              `${stripPrefix('published.', VSTORAGE_PATH_PREFIX)}.${portfolioKey}`,
            );
            mustMatch(status, PortfolioStatusShapeExt, portfolioKey);
            const { pendingCCTPTransfers } = status as PortfolioStatusWithCCTP;

            if (pendingCCTPTransfers) {
              console.log(
                `[CCTP] Found updated pending transfers for portfolio ${portfolioKey}`,
                pendingCCTPTransfers,
              );
              await launchCCTPWatchers(portfolioKey, pendingCCTPTransfers);
            }
          } catch (error) {
            console.error(
              `[CCTP] Failed to read portfolio status for ${portfolioKey}:`,
              error,
            );
          }
        }
      }
    }
  } finally {
    console.warn('Terminating...');
    rpc.close();
  }
};
harden(startResolver);
