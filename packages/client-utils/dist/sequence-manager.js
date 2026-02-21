/**
 * Manage sequence numbers for submitting transactions from a single address.
 *
 * @alpha
 */
export const makeTxSequencer = async (fetchAccount, { log = () => { } }) => {
    const initial = await fetchAccount();
    const accountNumber = initial.accountNumber;
    /** The sequence number to be included in the next transaction. */
    let nextSequenceNumber = initial.sequence;
    log(`Initialized accountNumber ${accountNumber} sequence number to ${nextSequenceNumber}`);
    /**
     * Get the account number.
     */
    const getAccountNumber = () => accountNumber;
    /**
     * Return the sequence number expected for the next transaction and increment
     * the internal counter for subsequent invocations.
     */
    const nextSequence = () => {
        const curr = nextSequenceNumber;
        nextSequenceNumber += 1n;
        return curr;
    };
    /**
     * Resync with the network (useful for error recovery).
     */
    const resync = async () => {
        const old = nextSequenceNumber;
        const account = await fetchAccount();
        nextSequenceNumber = account.sequence;
        log(`Resynced accountNumber ${accountNumber} sequence number from ${old} to ${nextSequenceNumber}`);
    };
    return harden({
        getAccountNumber,
        nextSequence,
        resync,
    });
};
//# sourceMappingURL=sequence-manager.js.map