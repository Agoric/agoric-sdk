import type { BaseAccount } from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/auth.js';
/**
 * @alpha
 */
export type TxSequencer = {
    getAccountNumber: () => bigint;
    nextSequence: () => bigint;
    resync: () => Promise<void>;
};
/**
 * Manage sequence numbers for submitting transactions from a single address.
 *
 * @alpha
 */
export declare const makeTxSequencer: (fetchAccount: () => Promise<BaseAccount>, { log }: {
    log?: (...args: unknown[]) => void;
}) => Promise<TxSequencer>;
//# sourceMappingURL=sequence-manager.d.ts.map