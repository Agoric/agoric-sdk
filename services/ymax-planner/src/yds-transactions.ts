import ky, { type KyInstance } from 'ky';
import { Fail } from '@endo/errors';
import { FETCH_HEADERS } from './config.ts';

export type YdsTransactionData = {
  txHash: string;
  chain: string;
  ymaxInstance: string;
  agentMemo?: string;
};

export type YdsTransactionsConfig = {
  ydsUrl: string;
  ydsApiKey: string;
  timeout?: number;
  retries?: number;
};

export type YdsTransactionsPowers = {
  fetch: typeof fetch;
  log?: (...args: unknown[]) => void;
};

/**
 * Create the planner memo used to correlate an on-chain rebalance flow with the
 * transaction the off-chain planner submitted.
 */
export const makePlannerAgentOptions = (
  makeNonce: () => string,
): Pick<YdsTransactionData, 'agentMemo'> => {
  const agentMemo = makeNonce().trim();
  agentMemo || Fail`makeNonce returned an empty agentMemo`;
  return { agentMemo };
};

const hex64Pattern = /^0x[0-9a-fA-F]{64}$/;

const validateTransactionData = ({
  txHash,
  chain,
  ymaxInstance,
  agentMemo,
}: YdsTransactionData) => {
  hex64Pattern.test(txHash) || Fail`txHash must be a 0x-prefixed hex64 value`;
  chain || Fail`chain is required`;
  ymaxInstance || Fail`ymaxInstance is required`;
  agentMemo || Fail`agentMemo is required`;
};

/**
 * Notifies YDS about planner-submitted transactions. YDS uses the transaction
 * hash, chain, YMax instance, and agent memo to later match the transaction
 * with vstorage flow updates.
 */
export class YdsTransactions {
  #log: (...args: unknown[]) => void;

  #config: Required<YdsTransactionsConfig>;

  #http: KyInstance;

  constructor(io: YdsTransactionsPowers, config: YdsTransactionsConfig) {
    this.#log = io.log ?? (() => {});
    this.#config = {
      ydsUrl: config.ydsUrl,
      ydsApiKey: config.ydsApiKey,
      timeout: config.timeout ?? 10000,
      retries: config.retries ?? 3,
    };

    this.#http = ky.create({
      fetch: io.fetch,
      timeout: this.#config.timeout,
      retry: this.#config.retries,
      headers: {
        ...FETCH_HEADERS,
        'x-resolver-auth-key': this.#config.ydsApiKey,
      },
    });
  }

  async postTransaction(data: YdsTransactionData): Promise<boolean> {
    validateTransactionData(data);

    const endpoint = `${this.#config.ydsUrl}/transactions`;
    this.#log(
      `[YdsTransactions] Sending transaction ${data.txHash} on ${data.chain}/${data.ymaxInstance} with agentMemo ${data.agentMemo} to ${endpoint}`,
    );

    await null;
    try {
      await this.#http.post(endpoint, { json: data });
      this.#log(
        `[YdsTransactions] Successfully sent transaction ${data.txHash}`,
      );
      return true;
    } catch (err) {
      const e = err as Error;
      this.#log(
        `[YdsTransactions] Failed to send transaction ${data.txHash}: ${e.message}`,
      );
      return false;
    }
  }
}

harden(YdsTransactions);
