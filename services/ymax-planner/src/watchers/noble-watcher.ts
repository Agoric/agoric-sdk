import type { Bech32Address } from '@agoric/orchestration';
import type { CosmosRestClient } from '../cosmos-rest-client.ts';

type WatchNobleTransferOptions = {
  cosmosRest: CosmosRestClient;
  watchAddress: Bech32Address;
  expectedAmount: bigint;
  expectedDenom: string;
  chainKey?: string;
  timeoutMs?: number;
  log: (...args: unknown[]) => void;
  setTimeout?: typeof globalThis.setTimeout;
  pollIntervalMs?: number;
};

/**
 * Watch for transfers to a Noble address by polling the account balance
 * until the expected amount is received or timeout occurs.
 */
export const watchNobleTransfer = ({
  cosmosRest,
  watchAddress,
  expectedAmount,
  expectedDenom,
  chainKey = 'noble',
  timeoutMs = 600000, // 10 min
  log = () => {},
  setTimeout = globalThis.setTimeout,
  pollIntervalMs = 5000, // Poll every 5 seconds
}: WatchNobleTransferOptions): Promise<boolean> => {
  return new Promise(resolve => {
    log(
      `Watching for Noble transfers to: ${watchAddress} with amount: ${expectedAmount} ${expectedDenom}`,
    );

    let transferFound = false;
    let timeoutId: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;
    let initialBalance: bigint | undefined;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pollInterval) clearInterval(pollInterval);
    };

    const checkBalance = async () => {
      await null;
      try {
        const balance = await cosmosRest.getAccountBalance(
          chainKey,
          watchAddress,
          expectedDenom,
        );

        const currentAmount = BigInt(balance.amount || '0');

        if (initialBalance === undefined) {
          initialBalance = currentAmount;
          log(`Initial balance: ${initialBalance} ${expectedDenom}`);
          return;
        }

        const receivedAmount = currentAmount - initialBalance;

        log(
          `Balance check: initial=${initialBalance}, current=${currentAmount}, received=${receivedAmount} ${expectedDenom}`,
        );

        if (receivedAmount >= expectedAmount) {
          log(
            `✓ Expected amount received! Expected: ${expectedAmount}, Received: ${receivedAmount} ${expectedDenom}`,
          );
          transferFound = true;
          cleanup();
          resolve(true);
        }
      } catch (error) {
        log(`Error checking balance for ${watchAddress}:`, error);
        // Don't fail on individual balance check errors, keep polling
      }
    };

    // Start polling
    void checkBalance();
    pollInterval = setInterval(checkBalance, pollIntervalMs);

    timeoutId = setTimeout(() => {
      if (!transferFound) {
        log(
          `✗ No matching Noble transfer found within ${timeoutMs / 60000} minutes`,
        );
        cleanup();
        resolve(false);
      }
    }, timeoutMs);
  });
};

export const lookBackNobleTransfer = async ({
  cosmosRest,
  watchAddress,
  expectedAmount,
  expectedDenom,
  chainKey = 'noble',
  log = () => {},
}: WatchNobleTransferOptions) => {
  await null;
  try {
    log(`Checking Noble address ${watchAddress} for amount ${expectedAmount}`);

    try {
      const balance = await cosmosRest.getAccountBalance(
        chainKey,
        watchAddress,
        expectedDenom,
      );
      const currentAmount = BigInt(balance.amount || '0');

      // TODO: We can add more granular checks once https://github.com/Agoric/agoric-sdk/issues/11878 is started
      if (currentAmount >= expectedAmount) {
        log(
          `Current balance ${currentAmount} >= expected ${expectedAmount}, assuming transfer completed`,
        );
        return true;
      } else {
        log(`Current balance ${currentAmount} < expected ${expectedAmount}`);
        return false;
      }
    } catch (error) {
      log(`Error checking Noble balance:`, error);
      return false;
    }
  } catch (error) {
    log(`Error during Noble check:`, error);
    return false;
  }
};
