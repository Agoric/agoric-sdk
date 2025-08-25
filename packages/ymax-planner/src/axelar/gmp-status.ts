// eslint-disable-next-line -- Types in this file match external Axelar API schema
import { ethers } from 'ethers';
import type {
  AxelarEventRecord,
  AxelarEventsResponse,
  AxelarQueryParams,
} from '../types';

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
export const getTxStatus = async ({
  url,
  fetch = globalThis.fetch,
  params,
  subscriptionId,
  log = () => {},
  timeoutMinutes = 5,
  retryDelaySeconds = 20,
}: {
  url: string;
  fetch: typeof globalThis.fetch;
  params: AxelarQueryParams;
  subscriptionId: string;
  logPrefix?: string;
  log: (...args: unknown[]) => void;
  timeoutMinutes?: number;
  retryDelaySeconds?: number;
}) => {
  const body = JSON.stringify(params);
  log(`params: ${body}`);

  const startTime = Date.now();
  const pollingDurationMs = timeoutMinutes * MILLIS_PER_MINUTE;
  let data: AxelarEventRecord[];

  while (Date.now() - startTime < pollingDurationMs) {
    const res = await fetch(url, {
      method: 'POST',
      headers: fetchRequestHeaders,
      body,
    });

    if (!res.ok) {
      throw new Error(`axelar api error: ${res.status} ${res.statusText}`);
    }

    const parsed = (await res.json()) as AxelarEventsResponse;
    data = parsed.data;

    if (Array.isArray(data) && data?.[0]?.executed) {
      const execution = data[0].executed;

      log(`✅ contract call executed`, execution);
      log(`txHash on EVM:`, execution.transactionHash);

      const subscriptionTopic = ethers.id('SubscriptionResolved(string)');
      const logs = execution.receipt.logs;
      const subscriptionLog = logs.find(
        log => log.topics[0] === subscriptionTopic,
      );

      if (subscriptionLog) {
        const abiCoder = ethers.AbiCoder.defaultAbiCoder();
        const [decodedSubscriptionId] = abiCoder.decode(
          ['string'],
          subscriptionLog.data,
        );

        log(`decodedSubscriptionId:`, decodedSubscriptionId);
        if (decodedSubscriptionId === subscriptionId) {
          return { logs: execution, success: true };
        }
      }
      log(`no log for subscriptionId ${subscriptionId}, retrying...`);
    } else {
      log(`no data, retrying...`);
    }

    await wait(retryDelaySeconds);
  }
  return { logs: null, success: false };
};
