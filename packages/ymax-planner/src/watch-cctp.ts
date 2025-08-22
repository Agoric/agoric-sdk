import { makeTracer } from '@agoric/internal';
import { id, zeroPadValue, getAddress, type Provider } from 'ethers';

const trace = makeTracer('WatchCCTP');

const TRANSFER = id('Transfer(address,address,uint256)');

type WatchTransferOptions = {
  provider: Provider;
  watchAddress: string;
  expectedAmount: bigint;
  // TODO: Add tokenAddress and decimals to support different ERC-20 tokens
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

    trace(
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
      let transferData;
      try {
        transferData = parseTransferLog(log);
      } catch (error: any) {
        trace(`${logPrefix} Log parsing error:`, error.message);
        return;
      }

      const { from, to, amount } = transferData;

      trace(
        `${logPrefix} Transfer detected: token=${log.address} from=${from} to=${to} amount=${amount} tx=${log.transactionHash}`,
      );

      if (amount === expectedAmount) {
        trace(
          `${logPrefix} ✓ Amount matches! Expected: ${expectedAmount}, Received: ${amount}`,
        );
        transferFound = true;
        cleanup();
        resolve(true);
      } else {
        trace(
          `${logPrefix} Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`,
        );
        return; // Continue watching
      }
    };

    provider.on(filter, listenForTransfer);
    listeners.push({ event: filter, listener: listenForTransfer });

    timeoutId = setTimeout(
      () => {
        if (!transferFound) {
          trace(
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
