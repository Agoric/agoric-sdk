import { id, zeroPadValue, getAddress, type Provider } from 'ethers';

const TRANSFER = id('Transfer(address,address,uint256)');

type WatchTransferOptions = {
  provider: Provider;
  watchAddress: string;
  expectedAmount: bigint;
  timeoutMinutes?: number;
  logPrefix?: string;
};

export const watchCCTPTransfer = ({
  provider,
  watchAddress,
  expectedAmount,
  timeoutMinutes = 5,
  logPrefix = '',
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

    const transferListener = (log: any) => {
      try {
        if (transferFound) return;

        if (!log.topics || log.topics.length < 3 || !log.data) {
          console.warn(`${logPrefix} Malformed log received, skipping:`, log);
          return;
        }

        const from = getAddress('0x' + log.topics[1].slice(-40));
        const to = getAddress('0x' + log.topics[2].slice(-40));
        const amount = BigInt(log.data);

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

    provider.on(filter, transferListener);
    listeners.push({ event: filter, listener: transferListener });

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
