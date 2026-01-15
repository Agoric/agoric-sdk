import ky, { type KyInstance } from 'ky';

export type YdsNotificationData = {
  txNum: `tx${number}`;
  txHash: string;
};

export type YdsNotifierConfig = {
  ydsUrl: string;
  ydsApiKey: string;
  timeout?: number;
  retries?: number;
};

export type YdsNotifierPowers = {
  fetch: typeof fetch;
  log?: (...args: unknown[]) => void;
};

/**
 * YMax Data Service Notifier - notifies YDS of transaction settlement
 * Used by the GMP/CCTP/etc. watchers to send a POST request to YDS endpoint
 * "/flow-step-tx-hashes" with the number and hash of each settled transaction.
 */
export class YdsNotifier {
  #fetch: typeof fetch;

  #log: (...args: unknown[]) => void;

  #config: Required<YdsNotifierConfig>;

  #http: KyInstance;

  constructor(io: YdsNotifierPowers, config: YdsNotifierConfig) {
    this.#fetch = io.fetch;

    this.#log = io.log ?? (() => {});
    this.#config = {
      ydsUrl: config.ydsUrl,
      ydsApiKey: config.ydsApiKey,
      timeout: config.timeout ?? 10000, // 10s timeout
      retries: config.retries ?? 3,
    };

    this.#http = ky.create({
      fetch: this.#fetch,
      timeout: this.#config.timeout,
      retry: this.#config.retries,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Agoric-YMax-Planner/1.0.0',
        'x-resolver-auth-key': this.#config.ydsApiKey,
      },
    });
  }

  /**
   * Sends a transaction settlement notification to the configured YDS webhook endpoint.
   * @param txNum - Transaction number in format "tx1", "tx2", etc.
   * @param txHash - Transaction hash from the blockchain
   */
  async notifySettlement(
    txNum: `tx${number}`,
    txHash: string,
  ): Promise<boolean> {
    await null;

    const payload: YdsNotificationData = {
      txNum,
      txHash,
    };

    const endpoint = `${this.#config.ydsUrl}/flow-step-tx-hashes`;
    this.#log(
      `[YdsNotifier] Sending settlement notification for ${txNum} (${txHash}) to ${endpoint}`,
    );

    try {
      await this.#http.post(endpoint, {
        json: payload,
      });
      this.#log(`[YdsNotifier] Successfully sent notification for ${txNum}`);
      return true;
    } catch (err) {
      const e = err as Error;
      this.#log(
        `[YdsNotifier] Failed to send notification for ${txNum} ${txHash}: ${e.message}`,
      );
      return false;
    }
  }
}

harden(YdsNotifier);
