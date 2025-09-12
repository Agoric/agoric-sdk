import type { JsonRpcProvider, Log, Filter } from 'ethers';
import { ethers } from 'ethers';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { CosmosRestClient } from '../cosmos-rest-client.ts';
import type { AccountId, Bech32Address } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { CaipChainId } from '@agoric/orchestration';
import { Fail } from '@endo/errors';

const TRANSFER_SIGNATURE = ethers.id('Transfer(address,address,uint256)');
const MULTICALL_EXECUTED_SIGNATURE = ethers.id(
  'MulticallExecuted(string,(bool,bytes)[])',
);

type LoopbackWatcherPowers = {
  evmProviders: Partial<Record<CaipChainId, JsonRpcProvider>>;
  usdcAddresses: Record<CaipChainId, `0x${string}`>;
  cosmosRest: CosmosRestClient;
  setTimeout?: typeof globalThis.setTimeout;
};

type CctpLoopbackParams = {
  destinationAddress: string;
  amount: bigint;
  publishTimeMs: number;
};

type GmpLoopbackParams = {
  destinationAddress: string;
  txId: TxId;
  publishTimeMs: number;
};

type NobleLoopbackParams = {
  destinationAddress: string;
  amount: bigint;
  publishTimeMs: number;
};

const findBlockByTimestamp = async (
  provider: JsonRpcProvider,
  targetMs: number,
) => {
  const target = Math.floor(targetMs / 1000);
  let latest = await provider.getBlockNumber();
  let earliest = 0;

  while (earliest <= latest) {
    const mid = Math.floor((earliest + latest) / 2);
    const block = await provider.getBlock(mid);
    if (!block) break;

    if (block.timestamp === target) return mid;
    if (block.timestamp < target) earliest = mid + 1;
    else latest = mid - 1;
  }
  // latest is now the greatest block with timestamp <= target
  return latest;
};

const buildTimeWindow = async (
  provider: JsonRpcProvider,
  publishTimeMs: number,
) => {
  const fromBlock = await findBlockByTimestamp(provider, publishTimeMs);
  const toBlock = await provider.getBlockNumber();
  return { fromBlock, toBlock };
};

const parseTransferLog = (log: Log) => {
  return {
    from: ethers.getAddress('0x' + log.topics[1].slice(-40)),
    to: ethers.getAddress('0x' + log.topics[2].slice(-40)),
    amount: BigInt(log.data),
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
  };
};

type LogPredicate = (log: Log) => boolean | Promise<boolean>;

type ScanOpts = {
  provider: JsonRpcProvider;
  baseFilter: Omit<Filter, 'fromBlock' | 'toBlock'> & Partial<Filter>;
  fromBlock: number;
  toBlock: number;
  chunkSize?: number;
  log?: (...args: unknown[]) => void;
  onMatch?: (log: Log) => void | Promise<void>;
};

/**
 * Generic chunked log scanner: scans [fromBlock, toBlock] in CHUNK_SIZE windows,
 * runs `predicate` on each log, and returns true on the first match.
 */
const scanEvmLogsInChunks = async (
  {
    provider,
    baseFilter,
    fromBlock,
    toBlock,
    chunkSize = 10,
    log = () => {},
    onMatch,
  }: ScanOpts,
  predicate: LogPredicate,
): Promise<boolean> => {
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    const chunkFilter: Filter = {
      ...baseFilter,
      fromBlock: start,
      toBlock: end,
    };

    try {
      log(`[LogScan] Searching chunk ${start} → ${end}`);
      const logs = await provider.getLogs(chunkFilter);

      for (const ev of logs) {
        if (await predicate(ev)) {
          log(`[LogScan] Match in tx=${ev.transactionHash}`);
          if (onMatch) await onMatch(ev);
          return true;
        }
      }
    } catch (err) {
      log(`[LogScan] Error searching chunk ${start}–${end}:`, err);
      // continue
    }
  }
  return false;
};

export const searchHistoricalCctpTransfer = async (
  powers: LoopbackWatcherPowers,
  {
    destinationAddress,
    amount: expectedAmount,
    publishTimeMs,
  }: CctpLoopbackParams,
  log: (...args: unknown[]) => void = () => {},
): Promise<boolean> => {
  const logPrefix = '[LoopbackWatcher:CCTP]';

  try {
    const { namespace, reference, accountAddress } = parseAccountId(
      destinationAddress as AccountId,
    );
    const caipId: CaipChainId = `${namespace}:${reference}`;
    const toAddress = accountAddress as `0x${string}`;

    const usdcAddress =
      powers.usdcAddresses[caipId] ||
      Fail`${logPrefix} No USDC address for chain: ${caipId}`;

    const provider =
      powers.evmProviders[caipId] ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
    );

    log(`${logPrefix} Searching blocks ${fromBlock} → ${toBlock} on ${caipId}`);
    log(
      `${logPrefix} Looking for Transfer to ${toAddress} amount ${expectedAmount}`,
    );

    // topics: [Transfer, from?, to]
    const toTopic = ethers.zeroPadValue(toAddress.toLowerCase(), 32);
    const baseFilter: Filter = {
      address: usdcAddress,
      topics: [TRANSFER_SIGNATURE, null, toTopic],
    };

    const matched = await scanEvmLogsInChunks(
      { provider, baseFilter, fromBlock, toBlock, log },
      ev => {
        try {
          const t = parseTransferLog(ev);
          log(`${logPrefix} Check: amount=${t.amount} tx=${t.transactionHash}`);
          return t.amount === expectedAmount;
        } catch (e) {
          log(`${logPrefix} Parse error:`, e);
          return false;
        }
      },
    );

    if (!matched) log(`${logPrefix} No matching historical transfer found`);
    return matched;
  } catch (error) {
    log(`${logPrefix} Error:`, error);
    return false;
  }
};

export const searchHistoricalGmpExecution = async (
  powers: LoopbackWatcherPowers,
  { destinationAddress, txId, publishTimeMs }: GmpLoopbackParams,
  log: (...args: unknown[]) => void = () => {},
): Promise<boolean> => {
  const logPrefix = '[LoopbackWatcher:GMP]';

  try {
    const { namespace, reference, accountAddress } = parseAccountId(
      destinationAddress as AccountId,
    );
    const caipId: CaipChainId = `${namespace}:${reference}`;
    const contractAddress = accountAddress as `0x${string}`;

    const provider =
      powers.evmProviders[caipId] ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
    );

    log(`${logPrefix} Searching blocks ${fromBlock} → ${toBlock} on ${caipId}`);
    log(
      `${logPrefix} Looking for MulticallExecuted for txId ${txId} at ${contractAddress}`,
    );

    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const baseFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    const matched = await scanEvmLogsInChunks(
      { provider, baseFilter, fromBlock, toBlock, log },
      ev => ev.topics[1] === expectedIdTopic,
    );

    if (!matched)
      log(`${logPrefix} No matching historical MulticallExecuted found`);
    return matched;
  } catch (error) {
    log(`${logPrefix} Error:`, error);
    return false;
  }
};

export const searchHistoricalNobleTransfer = async (
  powers: LoopbackWatcherPowers,
  { destinationAddress, amount: expectedAmount }: NobleLoopbackParams,
  log: (...args: unknown[]) => void = () => {},
): Promise<boolean> => {
  const logPrefix = '[LoopbackWatcher:Noble]';

  try {
    const { accountAddress } = parseAccountId(destinationAddress as AccountId);
    const nobleAddress = accountAddress as Bech32Address;
    const expectedDenom = 'uusdc';

    log(
      `${logPrefix} Checking Noble address ${nobleAddress} for amount ${expectedAmount}`,
    );

    try {
      const balance = await powers.cosmosRest.getAccountBalance(
        'noble',
        nobleAddress,
        expectedDenom,
      );
      const currentAmount = BigInt(balance.amount || '0');

      // TODO: We can add more granular checks once https://github.com/Agoric/agoric-sdk/issues/11878 is started
      if (currentAmount >= expectedAmount) {
        log(
          `${logPrefix} Current balance ${currentAmount} >= expected ${expectedAmount}, assuming historical transfer completed`,
        );
        return true;
      } else {
        log(
          `${logPrefix} Current balance ${currentAmount} < expected ${expectedAmount}`,
        );
        return false;
      }
    } catch (error) {
      log(`${logPrefix} Error checking Noble balance:`, error);
      return false;
    }
  } catch (error) {
    log(`${logPrefix} Error during Noble historical check:`, error);
    return false;
  }
};

export const resolveHistoricalTransaction = async (
  powers: LoopbackWatcherPowers,
  params: {
    txType: TxType;
    destinationAddress: string;
    amount?: bigint;
    txId?: TxId;
    publishTimeMs: number;
  },
  log: (...args: unknown[]) => void = () => {},
): Promise<boolean> => {
  const { txType, destinationAddress, amount, txId, publishTimeMs } = params;

  log(
    `[LoopbackWatcher] Resolving historical ${txType} transaction published at ${new Date(publishTimeMs).toISOString()}`,
  );

  switch (txType) {
    case TxType.CCTP_TO_EVM:
      if (!amount) {
        log('[LoopbackWatcher] CCTP_TO_EVM requires amount parameter');
        return false;
      }
      return searchHistoricalCctpTransfer(
        powers,
        { destinationAddress, amount, publishTimeMs },
        log,
      );

    case TxType.GMP:
      if (!txId) {
        log('[LoopbackWatcher] GMP requires txId parameter');
        return false;
      }
      return searchHistoricalGmpExecution(
        powers,
        { destinationAddress, txId, publishTimeMs },
        log,
      );

    case TxType.CCTP_TO_NOBLE:
      if (!amount) {
        log('[LoopbackWatcher] CCTP_TO_NOBLE requires amount parameter');
        return false;
      }
      return searchHistoricalNobleTransfer(
        powers,
        { destinationAddress, amount, publishTimeMs },
        log,
      );

    default:
      log(`[LoopbackWatcher] Unsupported transaction type: ${txType}`);
      return false;
  }
};
