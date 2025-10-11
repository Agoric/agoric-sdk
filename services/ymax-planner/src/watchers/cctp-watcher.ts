import type { Filter, JsonRpcProvider, Log } from 'ethers';
import { id, zeroPadValue, getAddress, ethers } from 'ethers';
import type { Alchemy } from 'alchemy-sdk';
import { AssetTransfersCategory } from 'alchemy-sdk';
import type { CaipChainId } from '@agoric/orchestration';
import { buildTimeWindow, scanEvmLogsInChunks } from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';

/**
 * The Keccak256 hash (event signature) of the standard ERC-20 `Transfer` event.
 *
 * In Ethereum and other EVM-based chains, events are uniquely identified by the
 * hash of their declaration. When a smart contract emits a `Transfer` event, the
 * first topic in the log will be this hashed signature.
 *
 * `id()` is a helper that computes keccak256 over the given string. Calling
 * `id('Transfer(address,address,uint256)')` returns the 32-byte hash of the event
 * signature, which can be used to filter logs for `Transfer` events.
 *
 * `TRANSFER_SIGNATURE` is used to detect Transfer events in transaction receipts when parsing logs.
 *
 * Docs:
 * - Solidity Events
 *    - https://docs.soliditylang.org/en/latest/contracts.html#events
 *    - https://docs.soliditylang.org/en/latest/abi-spec.html#events
 * - ERC-20 Transfer event: https://eips.ethereum.org/EIPS/eip-20#transfer
 * - JsonRpcProvider API: https://docs.ethers.org/v5/concepts/events/#events--logs-and-filtering
 */
const TRANSFER_SIGNATURE = id('Transfer(address,address,uint256)');

type CctpWatch = {
  usdcAddress: `0x${string}`;
  provider: JsonRpcProvider;
  toAddress: `0x${string}`;
  expectedAmount: bigint;
  chainId: CaipChainId;
  alchemyClient?: Alchemy;
  log?: (...args: unknown[]) => void;
};

const parseTransferLog = log => {
  if (!log.topics || log.topics.length < 3 || !log.data) {
    throw new Error('Malformed ERC-20 Transfer log');
  }
  return {
    from: extractAddress(log.topics[1]),
    to: extractAddress(log.topics[2]),
    amount: parseAmount(log.data),
  };
};

const extractAddress = topic => {
  // Topics are 32 bytes (64 hex digits) in which the last 20 bytes (40 hex digits)
  // represent an Ethereum address.
  return getAddress(`0x${topic.slice(-40)}`);
};

const parseAmount = data => {
  // ERC-20 value is stored as a 32-byte hex number.
  return BigInt(data);
};

export const watchCctpTransfer = ({
  usdcAddress,
  provider,
  toAddress,
  expectedAmount,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
}: CctpWatch & {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
}): Promise<boolean> => {
  return new Promise(resolve => {
    const TO_TOPIC = zeroPadValue(toAddress.toLowerCase(), 32);
    const filter = {
      topics: [TRANSFER_SIGNATURE, null, TO_TOPIC],
    };

    log(
      `Watching for ERC-20 transfers to: ${toAddress} with amount: ${expectedAmount}`,
    );

    let transferFound = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      for (const { event, listener } of listeners) {
        void provider.off(event, listener);
      }
      listeners = [];
    };

    const listenForTransfer = (eventLog: Log) => {
      let transferData;
      try {
        transferData = parseTransferLog(eventLog);
      } catch (error: any) {
        log(`Log parsing error:`, error.message);
        return;
      }

      const { from, to, amount } = transferData;
      const tokenAddr = eventLog.address; // USDC address

      log(
        `Transfer detected: token=${tokenAddr} from=${from} to=${to} amount=${amount} tx=${eventLog.transactionHash}`,
      );

      if (amount === expectedAmount && usdcAddress === tokenAddr) {
        log(
          `✓ Amount matches! Expected: ${expectedAmount}, Received: ${amount}`,
        );
        transferFound = true;
        cleanup();
        resolve(true);
        return;
      }
      // Warn and continue watching.
      log(`Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`);
    };

    void provider.on(filter, listenForTransfer);
    listeners.push({ event: filter, listener: listenForTransfer });

    timeoutId = setTimeout(() => {
      if (!transferFound) {
        log(`✗ No matching transfer found within ${timeoutMs / 60000} minutes`);
        cleanup();
        resolve(false);
      }
    }, timeoutMs);
  });
};

export const lookBackCctp = async ({
  usdcAddress,
  provider,
  toAddress,
  expectedAmount,
  publishTimeMs,
  chainId,
  alchemyClient,
  log = () => {},
}: CctpWatch & {
  publishTimeMs: number;
}): Promise<boolean> => {
  await null;

  // Try Alchemy SDK first if available (more efficient)
  if (alchemyClient) {
    try {
      log(`Using getAssetTransfers for historical scan`);

      const { fromBlock, toBlock } = await buildTimeWindow(
        provider,
        publishTimeMs,
        log,
        chainId,
      );

      log(
        `Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${toAddress} with amount ${expectedAmount}`,
      );

      const transfers = await alchemyClient.core.getAssetTransfers({
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        toAddress: toAddress,
        contractAddresses: [usdcAddress],
        category: [AssetTransfersCategory.ERC20],
        withMetadata: true,
        maxCount: 1000,
      });

      log(`Found ${transfers.transfers.length} transfers to ${toAddress}`);

      for (const transfer of transfers.transfers) {
        const value = transfer.value;
        if (value === null || value === undefined) continue;

        const valueInSmallestUnits = BigInt(Math.round(value * 1_000_000));

        log(
          `Check transfer: ${valueInSmallestUnits} (expected: ${expectedAmount})`,
        );

        if (valueInSmallestUnits === expectedAmount) {
          log(
            `✓ Found matching transfer at block ${transfer.blockNum}, tx ${transfer.hash}`,
          );
          return true;
        }
      }

      log(`No matching transfer found`);
      return false;
    } catch (error: any) {
      log(`Error, falling back to ethers.js:`, error.message || error);
    }
  }

  try {
    log(`Using getLogs for historical scan`);

    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
      log,
      chainId,
    );

    log(
      `Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${toAddress} with amount ${expectedAmount}`,
    );

    const toTopic = ethers.zeroPadValue(toAddress.toLowerCase(), 32);
    const baseFilter: Filter = {
      address: usdcAddress,
      topics: [TRANSFER_SIGNATURE, null, toTopic],
    };

    // TODO: Consider async iteration pattern for more flexible log scanning
    // See: https://github.com/Agoric/agoric-sdk/pull/11915#discussion_r2353872425
    const matchingEvent = await scanEvmLogsInChunks(
      { provider, baseFilter, fromBlock, toBlock, chainId, log },
      ev => {
        try {
          const t = parseTransferLog(ev);
          log(`Check: amount=${t.amount}`);
          return t.amount === expectedAmount;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    );

    if (!matchingEvent) log(`No matching transfer found`);
    return !!matchingEvent;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
