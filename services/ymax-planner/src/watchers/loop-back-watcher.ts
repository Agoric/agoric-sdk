import type { JsonRpcProvider, Log } from 'ethers';
import { ethers } from 'ethers';
import { type TxId } from '@aglocal/portfolio-contract/src/resolver/types';
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

const SEARCH_BUFFER_MS = 10 * 1000; // 10 sec before publish time
const MAX_SEARCH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours max search window

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

const estimateBlockFromTimestamp = (
  caipId: CaipChainId,
  timestampMs: number,
): number => {
  const blockTimes: Record<CaipChainId, number> = {
    'eip155:1': 12, // Ethereum mainnet
    'eip155:42161': 0.25, // Arbitrum
    'eip155:10': 2, // Optimism
    'eip155:137': 2, // Polygon
    'eip155:8453': 2, // Base
    'eip155:43114': 2, // Avalanche
    // Testnets
    'eip155:11155111': 12, // Ethereum Sepolia
    'eip155:421614': 0.25, // Arbitrum Sepolia
    'eip155:11155420': 2, // Optimism Sepolia
    'eip155:80002': 2, // Polygon Amoy
    'eip155:84532': 2, // Base Sepolia
    'eip155:43113': 2, // Avalanche Fuji
  };

  const blockTime = blockTimes[caipId];
  const targetBlock = Math.floor(timestampMs / 1000 / blockTime);
  return Math.max(0, targetBlock);
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
    namespace === 'eip155' ||
      Fail`${logPrefix} Expected EIP155 address, got: ${namespace}`;

    const caipId: CaipChainId = `${namespace}:${reference}`;
    const targetAddress = accountAddress as `0x${string}`;

    const provider = powers.evmProviders[caipId] as JsonRpcProvider;
    const usdcAddress = powers.usdcAddresses[caipId];

    if (!provider) {
      log(`${logPrefix} No provider for chain: ${caipId}`);
      return false;
    }

    if (!usdcAddress) {
      log(`${logPrefix} No USDC address for chain: ${caipId}`);
      return false;
    }

    const searchStartMs = publishTimeMs - SEARCH_BUFFER_MS;
    const searchEndMs = Math.min(
      publishTimeMs + MAX_SEARCH_WINDOW_MS,
      Date.now(),
    );

    const fromBlock = estimateBlockFromTimestamp(caipId, searchStartMs);
    const currentBlock = await provider.getBlockNumber();
    const toBlock = Math.min(
      estimateBlockFromTimestamp(caipId, searchEndMs),
      currentBlock,
    );

    log(
      `${logPrefix} Searching blocks ${fromBlock} to ${toBlock} on ${caipId}`,
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
      toBlock,
    };

    // Query historical logs
    const logs = await provider.getLogs(filter);
    log(`${logPrefix} Found ${logs.length} transfer logs`);

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
    namespace === 'eip155' ||
      Fail`${logPrefix} Expected EIP155 address, got: ${namespace}`;

    const caipId: CaipChainId = `${namespace}:${reference}`;
    const contractAddress = accountAddress as `0x${string}`;

    const provider = powers.evmProviders[caipId] as JsonRpcProvider;

    if (!provider) {
      log(`${logPrefix} No provider for chain: ${caipId}`);
      return false;
    }

    const searchStartMs = publishTimeMs - SEARCH_BUFFER_MS;
    const searchEndMs = Math.min(
      publishTimeMs + MAX_SEARCH_WINDOW_MS,
      Date.now(),
    );

    const fromBlock = estimateBlockFromTimestamp(caipId, searchStartMs);
    const currentBlock = await provider.getBlockNumber();
    const toBlock = Math.min(
      estimateBlockFromTimestamp(caipId, searchEndMs),
      currentBlock,
    );

    log(
      `${logPrefix} Searching blocks ${fromBlock} to ${toBlock} on ${caipId}`,
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
      toBlock,
    };

    const logs = await provider.getLogs(filter);
    log(`${logPrefix} Found ${logs.length} MulticallExecuted logs`);

    for (const eventLog of logs) {
      if (eventLog.topics[1] === expectedIdTopic) {
        log(
          `${logPrefix} Found matching historical MulticallExecuted: tx=${eventLog.transactionHash}`,
        );
        return true;
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
    const { namespace, reference, accountAddress } = parseAccountId(
      destinationAddress as AccountId,
    );
    namespace === 'cosmos' ||
      Fail`${logPrefix} Expected cosmos address, got: ${namespace}`;
    reference === 'noble' ||
      Fail`${logPrefix} Expected noble chain, got: ${reference}`;

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
