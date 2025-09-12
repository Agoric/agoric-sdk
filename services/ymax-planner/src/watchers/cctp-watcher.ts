import type { Filter, JsonRpcProvider } from 'ethers';
import type { Log } from 'ethers';
import { id, zeroPadValue, getAddress, ethers } from 'ethers';
import { buildTimeWindow, scanEvmLogsInChunks } from '../support.ts';

const TRANSFER_SIGNATURE = id('Transfer(address,address,uint256)');

type CctpWatch = {
  usdcAddress: `0x${string}`;
  provider: JsonRpcProvider;
  toAddress: `0x${string}`;
  expectedAmount: bigint;
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
  return getAddress('0x' + topic.slice(-40));
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
  timeoutMs = 300000, // 5 min
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
      listeners.forEach(({ event, listener }) => {
        provider.off(event, listener);
      });
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
      } else {
        log(
          `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`,
        );
        return; // Continue watching
      }
    };

    provider.on(filter, listenForTransfer);
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

export const watchHistoricalCctp = async ({
  usdcAddress,
  provider,
  toAddress,
  expectedAmount,
  publishTimeMs,
  log = () => {},
}: CctpWatch & {
  publishTimeMs: number;
}): Promise<boolean> => {
  try {
    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
    );

    log(`Searching blocks ${fromBlock} → ${toBlock}`);
    log(`Looking for Transfer to ${toAddress} amount ${expectedAmount}`);

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
          log(`Check: amount=${t.amount}`);
          return t.amount === expectedAmount;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    );

    if (!matched) log(`No matching historical transfer found`);
    return matched;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
