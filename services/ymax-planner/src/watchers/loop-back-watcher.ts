import type { JsonRpcProvider, Log } from 'ethers';
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

const findBlockByTimestamp = async (provider: JsonRpcProvider, targetMs) => {
  const target = Math.floor(targetMs / 1000);
  let latest = await provider.getBlockNumber();
  let earliest = 0;

  while (earliest <= latest) {
    const mid = Math.floor((earliest + latest) / 2);
    const block = await provider.getBlock(mid);

    if (!block) break;

    if (block.timestamp === target) {
      return mid; // exact match
    } else if (block.timestamp < target) {
      earliest = mid + 1;
    } else {
      latest = mid - 1;
    }
  }

  return latest;
};

const searchLog = async ({
  fromBlock,
  currentBlock,
  provider,
  filter,
  log,
  expectedIdTopic,
}) => {
  // Query historical logs in chunks to handle RPC provider limits
  const CHUNK_SIZE = 10; // Max blocks per request for free tier

  for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);

    try {
      log(`Searching chunk ${start} to ${end}`);
      const logs = await provider.getLogs(filter);

      for (const eventLog of logs) {
        if (eventLog.topics[1] === expectedIdTopic) {
          log(
            `Found matching historical MulticallExecuted: tx=${eventLog.transactionHash}`,
          );
          return true;
        }
      }
    } catch (error) {
      log(`Error searching chunk ${start}-${end}:`, error);
      // Continue with other chunks even if one fails
    }
  }
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
    const targetAddress = accountAddress as `0x${string}`;

    const usdcAddress =
      powers.usdcAddresses[caipId] ||
      Fail`${logPrefix} No USDC address for chain: ${caipId}`;

    const provider =
      powers.evmProviders[caipId] ||
      Fail`${logPrefix} No EVM provider for chain: ${caipId}`;

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = await findBlockByTimestamp(provider, publishTimeMs);

    log(
      `${logPrefix} Searching blocks ${fromBlock} to ${currentBlock} on ${caipId}`,
    );
    log(
      `${logPrefix} Looking for transfer to ${targetAddress} amount ${expectedAmount}`,
    );

    // Create filter for Transfer events to target address
    const toTopic = ethers.zeroPadValue(targetAddress.toLowerCase(), 32);
    const filter = {
      address: usdcAddress,
      topics: [TRANSFER_SIGNATURE, null, toTopic],
      fromBlock,
      currentBlock,
    };

    // Query historical logs in chunks to handle RPC provider limits
    const CHUNK_SIZE = 10; // Max blocks per request for free tier of Alchemy

    for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);

      const chunkFilter = {
        ...filter,
        fromBlock: start,
        toBlock: end,
      };

      try {
        log(`${logPrefix} Searching chunk ${start} to ${end}`);
        const logs = await provider.getLogs(chunkFilter);

        for (const eventLog of logs) {
          try {
            const transferData = parseTransferLog(eventLog);

            log(
              `${logPrefix} Checking transfer: amount=${transferData.amount} tx=${transferData.transactionHash}`,
            );

            if (transferData.amount === expectedAmount) {
              log(
                `${logPrefix} Found matching historical transfer: tx=${transferData.transactionHash}`,
              );
              return true;
            }
          } catch (error) {
            log(`${logPrefix} Error parsing log:`, error);
            continue;
          }
        }
      } catch (error) {
        log(`${logPrefix} Error searching chunk ${start}-${end}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    log(`${logPrefix} No matching historical transfer found`);
    return false;
  } catch (error) {
    log(`${logPrefix} Error during historical search:`, error);
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

    const fromBlock = await findBlockByTimestamp(provider, publishTimeMs);
    const currentBlock = await provider.getBlockNumber();

    log(
      `${logPrefix} Searching blocks ${fromBlock} to ${currentBlock} on ${caipId}`,
    );
    log(
      `${logPrefix} Looking for MulticallExecuted for txId ${txId} at ${contractAddress}`,
    );

    // Create topic hash for the specific txId
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
      fromBlock,
      currentBlock,
    };

    // Query historical logs in chunks to handle RPC provider limits
    const CHUNK_SIZE = 10; // Max blocks per request for free tier

    for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);

      const chunkFilter = {
        ...filter,
        fromBlock: start,
        toBlock: end,
      };

      try {
        log(`${logPrefix} Searching chunk ${start} to ${end}`);
        const logs = await provider.getLogs(chunkFilter);

        for (const eventLog of logs) {
          if (eventLog.topics[1] === expectedIdTopic) {
            log(
              `${logPrefix} Found matching historical MulticallExecuted: tx=${eventLog.transactionHash}`,
            );
            return true;
          }
        }
      } catch (error) {
        log(`${logPrefix} Error searching chunk ${start}-${end}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    log(`${logPrefix} No matching historical MulticallExecuted found`);
    return false;
  } catch (error) {
    log(`${logPrefix} Error during historical search:`, error);
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
