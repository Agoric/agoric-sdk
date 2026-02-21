import type { ECallable } from '@agoric/vow/src/E.js';
import type { EUnwrap } from '@agoric/vow/src/types.js';
import type { Instance } from '@agoric/zoe';
import type { DeliverTxResponse, StdFee } from '@cosmjs/stargate';
import type { SigningSmartWalletKit } from './signing-smart-wallet-kit.ts';
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
    readonly [M in keyof T]: T[M] extends (...args: infer P) => infer R ? ECallable<(...args: P) => {
        id?: string;
        tx: DeliverTxResponse;
        result?: WalletStoreEntryProxy<EUnwrap<R>>;
    }> : never;
} & {
    [SAVE_AS]: (name: string) => WalletStoreEntryProxy<T>;
    [OVERWRITE]: (name: string) => WalletStoreEntryProxy<T>;
};
type TxOptions = RetryOptionsAndPowers & {
    fee?: StdFee;
    sendOnly?: boolean;
    makeNonce?: () => string;
};
declare const SAVE_AS: "saveAs";
declare const OVERWRITE: "overwrite";
/**
 * Minimal interface needed by reflectWalletStore to enable wallet operations.
 *
 * This allows synthetic-chain tests and other environments to provide a compatible
 * implementation without needing the full SigningSmartWalletKit.
 *
 * @alpha
 */
export type WalletStoreSigner = Pick<SigningSmartWalletKit, 'sendBridgeAction'> & {
    query: Pick<SigningSmartWalletKit['query'], 'getLastUpdate'>;
};
/**
 * @alpha
 */
export declare const reflectWalletStore: (sswk: WalletStoreSigner, baseTxOpts?: Partial<TxOptions>) => {
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
    get: <T>(name: string, options?: Partial<TxOptions>) => WalletStoreEntryProxy<T>;
    /**
     * Execute the offer specified by { instance, description } and save the
     * result in the wallet store with the specified name (default to match the
     * offer description), overwriting any prior entry for that name unless
     * otherwise specified. Waits for confirmation in vstorage before returning.
     */
    saveOfferResult: ({ instance, description }: {
        instance: Instance;
        description: string;
    }, name?: string, options?: Partial<TxOptions & {
        overwrite: boolean;
    }>) => Promise<{
        id: string;
        tx: DeliverTxResponse;
        result: unknown;
    }>;
};
export {};
//# sourceMappingURL=wallet-store.d.ts.map