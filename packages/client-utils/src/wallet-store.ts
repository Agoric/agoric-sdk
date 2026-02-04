import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { ECallable } from '@agoric/vow/src/E.js';
import type { EUnwrap } from '@agoric/vow/src/types.js';
import type { Instance } from '@agoric/zoe';
import type { DeliverTxResponse, StdFee } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import type { SigningSmartWalletKit } from './signing-smart-wallet-kit.ts';
import { getInvocationUpdate, getOfferResult } from './smart-wallet-kit.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';

/**
 * A type-aware representation of an object saved in the wallet store, with
 * methods that return information about their implementing "invokeEntry"
 * submissions. If Recursive is true, then each method has an initial
 * { name?: string, overwrite?: boolean } parameter for specifying how (or if)
 * to save results back into the wallet store and responses for such saved
 * results also include a WalletStoreEntryProxy `result` representing those
 * results.
 */
export type WalletStoreEntryProxy<T> = {
  readonly [M in keyof T]: T[M] extends (...args: infer P) => infer R
    ? ECallable<
        (...args: P) => {
          id?: string;
          tx: DeliverTxResponse;
          result?: WalletStoreEntryProxy<EUnwrap<R>>;
        }
      >
    : never;
} & {
  [SAVE_AS]: (name: string) => WalletStoreEntryProxy<T>;
  [OVERWRITE]: (name: string) => WalletStoreEntryProxy<T>;
};

type TxOptions = RetryOptionsAndPowers & {
  fee?: StdFee;
  sendOnly?: boolean;
  makeNonce?: () => string;
};

const SAVE_AS = 'saveAs' as const;
const OVERWRITE = 'overwrite' as const;

/**
 * Minimal interface needed by reflectWalletStore to enable wallet operations.
 *
 * This allows synthetic-chain tests and other environments to provide a compatible
 * implementation without needing the full SigningSmartWalletKit.
 *
 * @alpha
 */
export type WalletStoreSigner = Pick<
  SigningSmartWalletKit,
  'sendBridgeAction'
> & {
  query: Pick<SigningSmartWalletKit['query'], 'getLastUpdate'>;
};

/**
 * @alpha
 */
export const reflectWalletStore = (
  sswk: WalletStoreSigner,
  baseTxOpts?: Partial<TxOptions>,
) => {
  baseTxOpts = { log: () => {}, ...baseTxOpts };

  const makeEntryProxy = (
    targetName: string,
    overrides?: Partial<TxOptions>,
    saveTo?: { name: string; overwrite: boolean },
  ) => {
    const combinedOpts = { ...baseTxOpts, ...overrides } as TxOptions;
    combinedOpts.setTimeout || Fail`missing setTimeout`;
    const { fee, sendOnly, makeNonce, ...retryOpts } = combinedOpts;
    if (saveTo && !makeNonce && !sendOnly) {
      throw Fail`makeNonce is required without sendOnly: true (to create an awaitable message id)`;
    }
    const { log = () => {} } = combinedOpts;
    const logged = <T>(label: string, x: T): T => {
      log(label, x);
      return x;
    };
    return new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        method !== 'then' || Fail`unsupported method name "then"`;
        if (method === SAVE_AS) {
          return harden((name: string) =>
            makeEntryProxy(targetName, overrides, { name, overwrite: false }),
          );
        }
        if (method === OVERWRITE) {
          return harden((name: string) =>
            makeEntryProxy(targetName, overrides, { name, overwrite: true }),
          );
        }
        const boundMethod = async (...args) => {
          const id = makeNonce ? `${method}.${makeNonce()}` : undefined;
          const message = logged('invoke', {
            id,
            targetName,
            method,
            args,
            ...(saveTo ? { saveResult: saveTo } : undefined),
          });
          const tx = await sswk.sendBridgeAction(
            { method: 'invokeEntry', message },
            fee,
          );
          if (tx.code !== 0) {
            throw Error(tx.rawLog);
          }
          if (!sendOnly && id) {
            await getInvocationUpdate(id, sswk.query.getLastUpdate, retryOpts);
          }
          const ret = { id, tx };
          if (saveTo) {
            const result = saveTo.name
              ? makeEntryProxy(saveTo.name, overrides)
              : undefined;
            return { ...ret, result };
          }
          return ret;
        };
        return harden(boundMethod);
      },
    });
  };

  const saveOfferResult = async (
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
    options?: Partial<TxOptions & { overwrite: boolean }>,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...options } as TxOptions & {
      overwrite?: boolean;
    };
    const {
      fee,
      sendOnly: _sendOnly,
      makeNonce,
      overwrite = true,
      ...retryOpts
    } = combinedOpts;
    if (!makeNonce) throw Fail`missing makeNonce`;
    const id = `${description}.${makeNonce()}`;
    const offer: OfferSpec = {
      id,
      invitationSpec: { source: 'purse', instance, description },
      proposal: {},
      saveResult: { name, overwrite },
    };
    const tx = await sswk.sendBridgeAction(
      { method: 'executeOffer', offer },
      fee,
    );
    const status = await getOfferResult(
      id,
      sswk.query.getLastUpdate,
      retryOpts,
    );
    return { id, tx, result: status.result };
  };

  return harden({
    /**
     * Return a previously-saved result as a remote object with type-aware
     * methods that map to "invokeEntry" submissions. The methods will always
     * await tx output from `sendBridgeAction`, and will also wait for
     * confirmation in vstorage when sent with an `id` (e.g., derived from a
     * `makeNonce` option) unless overridden by a `sendOnly: true` option.
     *
     * Use `.save(name)` or `.overwrite(name)` to persist a method result
     * without changing the method's argument signature.
     *
     * @param name The wallet store name of the saved entry to retrieve.
     */
    get: <T>(name: string, options?: Partial<TxOptions>) =>
      makeEntryProxy(name, options) as WalletStoreEntryProxy<T>,
    /**
     * Execute the offer specified by { instance, description } and save the
     * result in the wallet store with the specified name (default to match the
     * offer description), overwriting any prior entry for that name unless
     * otherwise specified. Waits for confirmation in vstorage before returning.
     */
    saveOfferResult,
  });
};
