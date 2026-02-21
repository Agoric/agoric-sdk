import { Fail } from '@endo/errors';
import { getInvocationUpdate, getOfferResult } from './smart-wallet-utils.js';
const SAVE_AS = 'saveAs';
const OVERWRITE = 'overwrite';
/**
 * @alpha
 */
export const reflectWalletStore = (sswk, baseTxOpts) => {
    baseTxOpts = { log: () => { }, ...baseTxOpts };
    const makeEntryProxy = (targetName, overrides, saveTo) => {
        const combinedOpts = { ...baseTxOpts, ...overrides };
        combinedOpts.setTimeout || Fail `missing setTimeout`;
        const { fee, sendOnly, makeNonce, ...retryOpts } = combinedOpts;
        if (saveTo && !makeNonce && !sendOnly) {
            throw Fail `makeNonce is required without sendOnly: true (to create an awaitable message id)`;
        }
        const { log = () => { } } = combinedOpts;
        const logged = (label, x) => {
            log(label, x);
            return x;
        };
        return new Proxy(harden({}), {
            get(_t, method, _rx) {
                assert.typeof(method, 'string');
                method !== 'then' || Fail `unsupported method name "then"`;
                if (method === SAVE_AS) {
                    return harden((name) => makeEntryProxy(targetName, overrides, { name, overwrite: false }));
                }
                if (method === OVERWRITE) {
                    return harden((name) => makeEntryProxy(targetName, overrides, { name, overwrite: true }));
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
                    const tx = await sswk.sendBridgeAction({ method: 'invokeEntry', message }, fee);
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
    const saveOfferResult = async ({ instance, description }, name = description, options) => {
        const combinedOpts = { ...baseTxOpts, ...options };
        const { fee, sendOnly: _sendOnly, makeNonce, overwrite = true, ...retryOpts } = combinedOpts;
        if (!makeNonce)
            throw Fail `missing makeNonce`;
        const id = `${description}.${makeNonce()}`;
        const offer = {
            id,
            invitationSpec: { source: 'purse', instance, description },
            proposal: {},
            saveResult: { name, overwrite },
        };
        const tx = await sswk.sendBridgeAction({ method: 'executeOffer', offer }, fee);
        const status = await getOfferResult(id, sswk.query.getLastUpdate, retryOpts);
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
        get: (name, options) => makeEntryProxy(name, options),
        /**
         * Execute the offer specified by { instance, description } and save the
         * result in the wallet store with the specified name (default to match the
         * offer description), overwriting any prior entry for that name unless
         * otherwise specified. Waits for confirmation in vstorage before returning.
         */
        saveOfferResult,
    });
};
//# sourceMappingURL=wallet-store.js.map