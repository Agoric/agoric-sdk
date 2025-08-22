import { id, zeroPadValue, getAddress, type Provider } from 'ethers';

const TRANSFER = id('Transfer(address,address,uint256)');

type WatchTransferOptions = {
  provider: Provider;
  watchAddress: string;
  expectedAmount: bigint;
  timeoutMinutes?: number;
  logPrefix?: string;
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
  // Topics are 32 bytes; Ethereum addresses are last 20 bytes.
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
  logPrefix = '',
  setTimeout = globalThis.setTimeout,
}: WatchTransferOptions): Promise<boolean> => {
  return new Promise(resolve => {
    const TO_TOPIC = zeroPadValue(watchAddress.toLowerCase(), 32);
    const filter = {
      topics: [TRANSFER, null, TO_TOPIC],
    };

    console.log(
      `${logPrefix} Watching for ERC-20 transfers to: ${watchAddress} with amount: ${expectedAmount}`,
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

    const listenForTransfer = (log: any) => {
      try {
        if (transferFound) return;

        if (!log.topics || log.topics.length < 3 || !log.data) {
          console.warn(`${logPrefix} Malformed log received, skipping:`, log);
          return;
        }

        const { from, to, amount } = parseTransferLog(log);

        console.log(
          `${logPrefix} Transfer detected: token=${log.address} from=${from} to=${to} amount=${amount} tx=${log.transactionHash}`,
        );

        if (amount === expectedAmount) {
          console.log(
            `${logPrefix} ✓ Amount matches! Expected: ${expectedAmount}, Received: ${amount}`,
          );
          transferFound = true;
          cleanup();
          resolve(true);
        } else {
          console.log(
            `${logPrefix} Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`,
          );
          return; // Continue watching
        }
      } catch (error: any) {
        console.log(`${logPrefix} Log parsing error:`, error.message);
      }
    };

    provider.on(filter, listenForTransfer);
    listeners.push({ event: filter, listener: listenForTransfer });

    timeoutId = setTimeout(
      () => {
        if (!transferFound) {
          console.log(
            `${logPrefix} ✗ No matching transfer found within ${timeoutMinutes} minutes`,
          );
          cleanup();
          resolve(false);
        }
      },
      timeoutMinutes * 60 * 1000,
    );
  });
};
