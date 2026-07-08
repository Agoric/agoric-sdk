import { defineName } from '@agoric/internal/src/js-utils.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { ECallable } from '@agoric/vow/src/E.js';
import type { EUnwrap } from '@agoric/vow/src/types.js';
import type { Instance } from '@agoric/zoe';
import type { DeliverTxResponse, SignerData, StdFee } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import type { SigningSmartWalletKit } from './signing-smart-wallet-kit.ts';
import { getInvocationUpdate, getOfferResult } from './smart-wallet-utils.js';
import type { RetryOptionsAndPowers } from './sync-tools.js';

/**
 * A type-aware representation of an object saved in the wallet store, with
 * methods that return information about their implementing "invokeEntry"
 * submissions. Each method is also extended with a `once` method of its own for
 * binding options to a single invocation, and when those options include
 * `saveAs`, the response from the bound method includes a corresponding
 * `result` WalletStoreEntryProxy.
 *
 * XXX We should remove special treatment of "saveAs" and "overwrite"
 * pseudo-methods in favor of `once`.
 */
export type WalletStoreEntryProxy<T> = {
  readonly [M in keyof T]: T[M] extends (...args: infer P) => infer R
    ? ECallable<
        (...args: P) => {
          id?: string;
          tx: DeliverTxResponse;
        }
      > & {
        once: (options: SingleTxOptions) => ECallable<
          (...args: P) => {
            id?: string;
            tx: DeliverTxResponse;
            /** Only present with a non-empty `saveAs`. */
            result?: WalletStoreEntryProxy<EUnwrap<R>>;
          }
        >;
      }
    : never;
} & {
  [SAVE_AS]: (name: string) => WalletStoreEntryProxy<T>;
  [OVERWRITE]: (name: string) => WalletStoreEntryProxy<T>;
};

/**
 * Options specific to a single invocation (i.e., not to be remembered/reused).
 */
type SingleTxOptions = Partial<{
  fee: StdFee;
  memo: string;
  signerData: SignerData;
  saveAs: string;
  overwrite: boolean;
}>;

/** Options for use across one or more invocations. */
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
    options?: Partial<TxOptions>,
    deprecatedSaveTo?: Pick<Required<SingleTxOptions>, 'saveAs' | 'overwrite'>,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...options } as TxOptions;
    combinedOpts.setTimeout || Fail`missing setTimeout`;
    const { fee: sharedFee, sendOnly, makeNonce, ...retryOpts } = combinedOpts;
    if (!makeNonce && !sendOnly) {
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

        // deprecated pseudo-methods
        if (method === SAVE_AS) {
          return harden((saveAs: string) =>
            makeEntryProxy(targetName, options, { saveAs, overwrite: false }),
          );
        }
        if (method === OVERWRITE) {
          return harden((saveAs: string) =>
            makeEntryProxy(targetName, options, { saveAs, overwrite: true }),
          );
        }

        const makeBoundMethod = (onceOpts?: SingleTxOptions) => {
          let invoked = false;
          return defineName(method, async (...args) => {
            !invoked || !onceOpts || Fail`single-tx options cannot be reused`;
            invoked = true;
            const boundOpts = onceOpts || {};
            const {
              memo,
              signerData,
              saveAs,
              overwrite = false,
            } = { ...deprecatedSaveTo, ...boundOpts };
            const fee = boundOpts.fee || sharedFee;
            const saveResult = saveAs ? { name: saveAs, overwrite } : undefined;
            const id = makeNonce ? `${method}.${makeNonce()}` : undefined;
            const message = logged('invoke', {
              id,
              targetName,
              method,
              args,
              ...(saveResult ? { saveResult } : undefined),
            });
            const tx = await sswk.sendBridgeAction(
              { method: 'invokeEntry', message },
              fee,
              memo,
              signerData,
            );
            if (tx.code !== 0) {
              throw Error(tx.rawLog);
            }
            if (!sendOnly && id) {
              await getInvocationUpdate(
                id,
                sswk.query.getLastUpdate,
                retryOpts,
              );
            }
            const ret = { id, tx };
            const result = saveAs ? makeEntryProxy(saveAs, options) : undefined;
            return saveAs !== undefined ? { ...ret, result } : ret;
          });
        };
        const boundMethod = makeBoundMethod();
        const makeOverridden = defineName('once', onceOpts => {
          onceOpts || Fail`missing single-tx options`;
          return harden(makeBoundMethod(onceOpts));
        });
        Object.defineProperty(boundMethod, 'once', { value: makeOverridden });
        return harden(boundMethod);
      },
    });
  };

  const saveOfferResult = async (
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
    options?: Partial<TxOptions & Omit<SingleTxOptions, 'saveAs'>>,
  ) => {
    const combinedOpts = { ...baseTxOpts, ...options } as TxOptions &
      Omit<SingleTxOptions, 'saveAs'>;
    const {
      fee,
      memo,
      signerData,
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
      memo,
      signerData,
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
     * Each method supports a `.once(singleUseOptions)` method of its own for
     * binding options to a single invocation, and when those options include
     * `saveAs`, the response from the bound method includes a corresponding
     * `result` proxy.
     *
     * There is also deprecated support for `.saveAs(name)` and
     * `.overwrite(name)` pseudo-methods that return a modified proxy for
     * persisting the result of any method call *without* the only-once
     * constraint.
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
