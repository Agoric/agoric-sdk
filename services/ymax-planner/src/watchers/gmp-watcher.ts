// eslint-disable-next-line -- Types in this file match external Axelar API schema
import { ethers } from 'ethers';
import type { SearchGMPParams, SearchGMPResponse } from '@axelarjs/api';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

const wait = async (seconds: number) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

const MILLIS_PER_MINUTE = 60 * 1000;

const fetchRequestHeaders = {
  accept: '*/*',
  'content-type': 'application/json',
};

// Helpful for experimenting with different parameters:
// Visit https://docs.axelarscan.io/axelarscan
export const watchGmp = async ({
  url,
  fetch = globalThis.fetch,
  params,
  txId,
  log = () => {},
  timeoutMinutes = 5,
  retryDelaySeconds = 20,
  now = () => performance.now(),
}: {
  url: string;
  fetch: typeof globalThis.fetch;
  params: SearchGMPParams;
  txId: TxId;
  logPrefix?: string;
  log: (...args: unknown[]) => void;
  timeoutMinutes?: number;
  retryDelaySeconds?: number;
  now?: () => number;
}) => {
  await null;
  const body = JSON.stringify(params);
  log(`params: ${body}`);

  const startTime = now();
  const pollingDurationMs = timeoutMinutes * MILLIS_PER_MINUTE;

  while (now() - startTime < pollingDurationMs) {
    const res = await fetch(url, {
      method: 'POST',
      headers: fetchRequestHeaders,
      body,
    });

    if (!res.ok) {
      throw new Error(`axelar api error: ${res.status} ${res.statusText}`);
    }

    const { data } = (await res.json()) as SearchGMPResponse;

    if (Array.isArray(data) && data?.[0]?.executed) {
      const execution = data[0].executed;

      log(`✅ contract call executed, txHash: ${execution.transactionHash}`);

      const multicallTopic = ethers.id(
        'MulticallExecuted(string,(bool,bytes)[])',
      );
      const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

      /**
       * - For **EVM events** (executed / approved / callback), the Axelar API returns
       *   receipts with a `logs[]` array. However, the SDK type `SearchGMPReceipt`
       *   does not declare `logs`, so TypeScript will show an error.
       *
       * - You can experiment with a real transaction hash in the AxelarScan GMP docs:
       *   https://docs.axelarscan.io/gmp
       *   Example txHash:
       *   0x06bbd15ea188edb9098e02e0c0a2f6bf7dbaaf0ab35ec317dd37255bdbf607a4
       *
       * This inconsistency comes from @axelarjs/api types lagging behind the actual API schema.
       */
      // @ts-expect-error -- logs exist at runtime but are not in the SDK types
      const logs = execution.receipt.logs;
      const match = logs.find(
        l =>
          l.topics?.[0] === multicallTopic && l.topics?.[1] === expectedIdTopic,
      );

      if (match) {
        log('✅ MulticallExecuted for txId found');
        return { logs: execution, success: true };
      }
      log(`no log for txId ${txId}, retrying...`);
    } else {
      log(`no data, retrying...`);
    }

    await wait(retryDelaySeconds);
  }
  return { logs: null, success: false };
};
