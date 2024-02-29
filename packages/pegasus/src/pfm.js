// @ts-check

/**
 * Parses a Transfer memo to determine if there is a packet to forward or not.
 * A forward can be an additional IBC Transfer, Bank Send or a Call (Agoric Contract Call).
 * NOTE: Agoric Contract Call supports transferring the asset with the call.
 *
 * @param {string} memo the transfer memo to parse
 *
 * @return {Forward | null} forward info. Returns null if no forward is specified in memo
 */
export const parseTransferMemo = (memo) => {
    if (!memo || memo === "") {
        return null
    }
    /** @type {Forward} */
    let forward = JSON.parse(memo);
    return forward
};