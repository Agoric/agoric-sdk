/**
 * @file CCTPv2 watcher - monitors for MessageReceived events on destination chains.
 *
 * CCTPv2 uses a different event structure than the ERC-20 Transfer events watched
 * by the CCTPv1 watcher. Instead of watching for USDC transfers, we watch for
 * MessageReceived events on the destination chain's MessageTransmitterV2 contract.
 *
 * The MessageReceived event indicates that Circle's attestation service has
 * verified and relayed the burn message, and the tokens have been minted.
 */
import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, ethers, zeroPadValue } from 'ethers';
import { hexToBigInt, sliceHex, type Hex } from 'viem';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
} from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import type { WatcherResult } from '../pending-tx-manager.ts';

/**
 * MessageReceived event signature from MessageTransmitterV2
 *
 * ```solidity
 * event MessageReceived(
 *     address indexed caller,
 *     uint32 sourceDomain,
 *     uint64 nonce,
 *     bytes32 sender,
 *     bytes messageBody
 * );
 * ```
 */
const MESSAGE_RECEIVED_SIGNATURE = id(
  'MessageReceived(address,uint32,uint64,bytes32,bytes)',
);

/**
 * CCTP domain IDs
 * See: https://developers.circle.com/stablecoins/docs/supported-domains
 */
export const CCTP_DOMAIN = {
  Ethereum: 0,
  Avalanche: 1,
  Optimism: 2,
  Arbitrum: 3,
  Noble: 4,
  Solana: 5,
  Base: 6,
} as const;

type CctpV2Watch = {
  messageTransmitterAddress: `0x${string}`;
  provider: WebSocketProvider;
  /** The mint recipient address we're watching for */
  recipientAddress: `0x${string}`;
  /** Expected amount in minor units (e.g., 1000000 for 1 USDC) */
  expectedAmount: bigint;
  /** Source domain ID (e.g., CCTP_DOMAIN.Arbitrum) */
  sourceDomain: number;
  log?: (...args: unknown[]) => void;
  kvStore: KVStore;
  txId: `tx${number}`;
};

/**
 * Parse the MessageReceived event log
 *
 * MessageReceived(address indexed caller, uint32 sourceDomain, uint64 nonce, bytes32 sender, bytes messageBody)
 *
 * Topics:
 * - topics[0]: event signature
 * - topics[1]: caller (indexed)
 *
 * Data (non-indexed):
 * - sourceDomain (uint32)
 * - nonce (uint64)
 * - sender (bytes32)
 * - messageBody (bytes) - contains BurnMessageV2 with amount
 */
const parseMessageReceivedLog = (log: Log) => {
  if (!log.topics || log.topics.length < 2 || !log.data) {
    throw new Error('Malformed MessageReceived log');
  }

  // Decode non-indexed parameters
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const decoded = abiCoder.decode(
    ['uint32', 'uint64', 'bytes32', 'bytes'],
    log.data,
  );

  const [sourceDomain, nonce, sender, messageBody] = decoded;

  // Parse BurnMessageV2 to extract amount and recipient
  // BurnMessageV2 format (see design doc):
  // - version (4 bytes, uint32) at index 0
  // - burnToken (32 bytes) at index 4
  // - mintRecipient (32 bytes) at index 36
  // - amount (32 bytes, uint256) at index 68
  // ... more fields follow
  const messageHex = messageBody as Hex;
  const amount =
    messageHex.length >= 202 // 0x + 200 hex chars = 100 bytes
      ? hexToBigInt(sliceHex(messageHex, 68, 100))
      : 0n;

  // Extract mint recipient (bytes 36-68)
  const mintRecipient =
    messageHex.length >= 138 // 0x + 136 hex chars = 68 bytes
      ? sliceHex(messageHex, 36, 68)
      : null;

  return {
    caller: log.topics[1],
    sourceDomain: Number(sourceDomain),
    nonce: BigInt(nonce),
    sender: sender as string,
    amount,
    mintRecipient,
    messageBody: messageBody as string,
  };
};

export const watchCctpV2Transfer = ({
  messageTransmitterAddress,
  provider,
  recipientAddress,
  expectedAmount,
  sourceDomain,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: CctpV2Watch & {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
  signal?: AbortSignal;
}): Promise<WatcherResult> => {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve({ found: false });
      return;
    }

    const filter: Filter = {
      address: messageTransmitterAddress,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    log(
      `Watching for CCTPv2 MessageReceived to: ${recipientAddress} from domain ${sourceDomain} with amount: ${expectedAmount}`,
    );

    let transferFound = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const finish = (result: WatcherResult) => {
      resolve(result);
      if (timeoutId) clearTimeout(timeoutId);
      for (const { event, listener } of listeners) {
        void provider.off(event, listener);
      }
      listeners = [];
    };

    signal?.addEventListener('abort', () => finish({ found: false }));

    const listenForMessage = async (eventLog: Log) => {
      let messageData;
      try {
        messageData = parseMessageReceivedLog(eventLog);
      } catch (error: any) {
        log(`Log parsing error:`, error.message);
        return;
      }

      const { sourceDomain: srcDomain, amount, mintRecipient } = messageData;

      log(
        `MessageReceived detected: sourceDomain=${srcDomain} amount=${amount} recipient=${mintRecipient} tx=${eventLog.transactionHash}`,
      );

      // Check source domain matches
      if (srcDomain !== sourceDomain) {
        log(
          `Source domain mismatch. Expected: ${sourceDomain}, Got: ${srcDomain}`,
        );
        return;
      }

      // Check amount matches
      if (amount !== expectedAmount) {
        log(
          `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`,
        );
        return;
      }

      // Check recipient matches (normalize to lowercase for comparison)
      const expectedRecipientPadded = zeroPadValue(
        recipientAddress.toLowerCase(),
        32,
      );
      if (
        mintRecipient &&
        mintRecipient.toLowerCase() !== expectedRecipientPadded.toLowerCase()
      ) {
        log(
          `Recipient mismatch. Expected: ${expectedRecipientPadded}, Got: ${mintRecipient}`,
        );
        return;
      }

      log(
        `✓ CCTPv2 transfer matched! Amount: ${amount}, Recipient: ${mintRecipient}`,
      );
      transferFound = true;
      finish({ found: true, txHash: eventLog.transactionHash });
    };

    void provider.on(filter, listenForMessage);
    listeners.push({ event: filter, listener: listenForMessage });

    timeoutId = setTimeout(() => {
      if (!transferFound) {
        log(
          `✗ No matching CCTPv2 transfer found within ${timeoutMs / 60000} minutes`,
        );
        finish({ found: false });
      }
    }, timeoutMs);
  });
};

export const lookBackCctpV2 = async ({
  messageTransmitterAddress,
  provider,
  recipientAddress,
  expectedAmount,
  sourceDomain,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  txId,
}: CctpV2Watch & {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
}): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock =
      (await getTxBlockLowerBound(kvStore, txId)) || fromBlock;
    log(
      `CCTPv2: Searching blocks ${savedFromBlock} → ${toBlock} for MessageReceived to ${recipientAddress} from domain ${sourceDomain} with amount ${expectedAmount}`,
    );

    const baseFilter: Filter = {
      address: messageTransmitterAddress,
      topics: [MESSAGE_RECEIVED_SIGNATURE],
    };

    const matchingEvent = await scanEvmLogsInChunks(
      {
        provider,
        baseFilter,
        fromBlock: savedFromBlock,
        toBlock,
        chainId,
        log,
        signal,
        onRejectedChunk: async (_, to) => {
          await setTxBlockLowerBound(kvStore, txId, to);
        },
      },
      ev => {
        try {
          const msg = parseMessageReceivedLog(ev);
          log(
            `CCTPv2 Check: sourceDomain=${msg.sourceDomain} amount=${msg.amount}`,
          );

          if (msg.sourceDomain !== sourceDomain) return false;
          if (msg.amount !== expectedAmount) return false;

          // Check recipient
          const expectedRecipientPadded = zeroPadValue(
            recipientAddress.toLowerCase(),
            32,
          );
          if (
            msg.mintRecipient &&
            msg.mintRecipient.toLowerCase() !==
              expectedRecipientPadded.toLowerCase()
          ) {
            return false;
          }

          return true;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    );

    if (!matchingEvent) {
      log(`No matching CCTPv2 transfer found`);
      return { found: false };
    }

    deleteTxBlockLowerBound(kvStore, txId);
    return { found: true, txHash: matchingEvent.transactionHash };
  } catch (error) {
    log(`CCTPv2 Error:`, error);
    return { found: false };
  }
};
