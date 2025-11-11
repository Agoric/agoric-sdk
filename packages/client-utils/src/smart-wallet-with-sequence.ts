/**
 * @file Smart wallet wrapper with queue-based transaction sequence management
 */

import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { SignerData } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import type {
  SigningSmartWalletKit,
  SmartWalletKit,
} from './signing-smart-wallet-kit.js';
import type { TxSequencer } from './sequence-manager.js';

type QueuedThunk<T> = {
  label: string;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  thunk: () => Promise<T>;
};

const isSequenceNumberMismatch = (error: Error | unknown) => {
  // @ts-expect-error reading "message" is fine here
  const message = error?.message || `${error}`;
  // *sigh*
  return message.includes('account sequence mismatch');
};

/**
 * Make a SigningSmartWalletKit with automatic management of outbound
 * transaction sequencing:
 * - Queue-based transaction serialization to prevent sequence conflicts
 * - Automatic error recovery for sequence mismatches
 * - Network sync on sequence errors with retry logic
 *
 * @alpha
 */
export const makeSequencingSmartWallet = (
  signingSmartWalletKit: SigningSmartWalletKit,
  txSequencer: TxSequencer,
  { log = () => {} }: { log?: (...args: unknown[]) => void },
): SigningSmartWalletKit => {
  // We only override `executeOffer` and `sendBridgeAction`, so ensure that
  // there are no unknown properties which could potentially bypass them.
  const {
    query,
    address,
    executeOffer: _unsafeExecuteOffer,
    sendBridgeAction: unsafeSendBridgeAction,
    ...swk
  } = signingSmartWalletKit;
  ({
    query,
    address,
    executeOffer: _unsafeExecuteOffer,
    sendBridgeAction: unsafeSendBridgeAction,
  }) satisfies Omit<SigningSmartWalletKit, keyof SmartWalletKit>;

  const chainId = swk.networkConfig.chainName;
  const accountNumber = Number(txSequencer.getAccountNumber());

  const makeSignerData = (label: string): SignerData => {
    const sequence = Number(txSequencer.getSequenceNumber());
    const signerData: SignerData = { accountNumber, sequence, chainId };
    log(`${label} signerData:`, signerData);
    return signerData;
  };

  // XXX There is no limit on queue growth.
  const queue = [] as QueuedThunk<unknown>[];
  let isDraining = false;

  /**
   * Run a thunk, retrying if it results in a sequence number mismatch error
   * (but only retrying at most once).
   */
  const runResyncable = async <T>(
    label: string,
    thunk: () => Promise<T>,
  ): Promise<T> => {
    await null;
    try {
      return await thunk();
    } catch (error) {
      if (isSequenceNumberMismatch(error)) {
        log(`${label} retrying with resynced sequence number`, error);
        await txSequencer.resync();
        try {
          return await thunk();
        } catch (retryError) {
          log(`${label} retry failed`, retryError);
          throw retryError;
        }
      }
      throw error;
    }
  };

  /**
   * Sequentially drain the queue.
   */
  const drainQueue = async (): Promise<void> => {
    await null;
    log(`Draining ${queue.length} operations`);

    while (queue.length > 0) {
      const { label, resolve, reject, thunk } = queue.shift()!;

      log(`${label} processing, ${queue.length} remaining`);

      try {
        const result = await runResyncable(label, thunk);
        log(`${label} completed`);
        resolve(result);
      } catch (error) {
        log(`${label} failed:`, error);
        reject(error);
      }
    }
  };

  /**
   * Enqueue a thunk for sequential execution.
   */
  const enqueue = <T>(label: string, thunk: () => Promise<T>): Promise<T> => {
    const nextIndex = queue.length;
    const resultP = new Promise<T>((resolve, reject) => {
      queue.push({ label, resolve, reject, thunk });
    });
    log(`${label} enqueued at index ${nextIndex}`);

    if (!isDraining) {
      isDraining = true;
      void drainQueue().finally(() => {
        isDraining = false;
      });
    }

    return resultP;
  };

  /**
   * Send a bridge action with managed sequence number.
   */
  const sendBridgeAction: SigningSmartWalletKit['sendBridgeAction'] = async (
    action,
    fee,
    memo,
    manualSignerData,
  ) => {
    manualSignerData === undefined || Fail`manual signerData is not supported`;
    const label = 'sendBridgeAction';
    return enqueue(label, () => {
      const signerData = makeSignerData(label);
      return unsafeSendBridgeAction(action, fee, memo, signerData);
    });
  };

  /**
   * Execute an offer with managed sequence number.
   */
  const executeOffer: SigningSmartWalletKit['executeOffer'] = async offer => {
    const txId = offer.offerArgs?.txId;
    const label = `executeOffer${txId ? ` ${txId}` : ''}`;
    return enqueue(label, async () => {
      const signerData = makeSignerData(label);
      const action: BridgeAction = { method: 'executeOffer', offer };
      const offerP = swk.pollOffer(address, offer.id);
      await unsafeSendBridgeAction(action, undefined, undefined, signerData);
      return offerP;
    });
  };

  const sequencingSmartWallet = {
    ...swk,
    query,
    address,
    executeOffer,
    sendBridgeAction,
  };

  return harden(sequencingSmartWallet);
};
