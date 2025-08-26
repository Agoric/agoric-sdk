import { id, zeroPadValue, getAddress, type Provider } from 'ethers';

const TRANSFER = id('Transfer(address,address,uint256)');
const MILLIS_PER_MINUTE = 60 * 1000;

type WatchTransferOptions = {
  provider: Provider;
  watchAddress: string;
  expectedAmount: bigint;
  // TODO: Add tokenAddress and decimals to support different ERC-20 tokens
  timeoutMinutes?: number;
  log: (...args: unknown[]) => void;
  setTimeout?: typeof globalThis.setTimeout;
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

export const watchCCTPTransfer = ({
  provider,
  watchAddress,
  expectedAmount,
  timeoutMinutes = 5,
  log = () => {},
  setTimeout = globalThis.setTimeout,
}: WatchTransferOptions): Promise<boolean> => {
  return new Promise(resolve => {
    const TO_TOPIC = zeroPadValue(watchAddress.toLowerCase(), 32);
    const filter = {
      topics: [TRANSFER, null, TO_TOPIC],
    };

    log(
      `Watching for ERC-20 transfers to: ${watchAddress} with amount: ${expectedAmount}`,
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

    const listenForTransfer = (eventLog: any) => {
      let transferData;
      try {
        transferData = parseTransferLog(eventLog);
      } catch (error: any) {
        log(`Log parsing error:`, error.message);
        return;
      }

      const { from, to, amount } = transferData;

      log(
        `Transfer detected: token=${eventLog.address} from=${from} to=${to} amount=${amount} tx=${eventLog.transactionHash}`,
      );

      if (amount === expectedAmount) {
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
        log(`✗ No matching transfer found within ${timeoutMinutes} minutes`);
        cleanup();
        resolve(false);
      }
    }, timeoutMinutes * MILLIS_PER_MINUTE);
  });
};
