// @ts-check

import { E } from "@endo/far";

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

/**
 * Make a remote contract call.
 * NOTE: The public facet for the contract must be public and posted to the key argument in the public board.
 *
 * @param {ForwardCall} call the call info for the remote call
 *
 */
export const remoteCall = async (call) => {};

/**
 * Parses a transfer memo and then calls the appropriate functions to handle the logic defined in the memo.
 * If no memo is specified this function will just skip logic and return.
 *
 * @param {any} pegasus the pegasus publicFacet
 * @param {ZoeService} zoe zoe instance
 * @param {string} memo the transfer memo
 * @param {Brand} localBrand the local ERTP brand you are transferring
 * @param {string} remoteDenom the local ERTP brand you are transferring
 * @param {Payment} payment the payment of the assets to transfer
 * @param {object} scratch the payment of the assets to transfer
 * 
 */
export const forward = async (pegasus, zoe, memo, localBrand, remoteDenom, payment, scratch) => {
    let memoForward = parseTransferMemo(memo);
    if (memoForward) {
        if (memoForward.call) {
            await remoteCall(memoForward.call);
        }
        if (memoForward.transfer) {
            const transfer = memoForward.transfer;
            const next = transfer.next;
            const pegKey = `peg-${transfer.channel}-${remoteDenom}`
            /** @type {Peg} */
            const pegP = E(scratch).getValue(pegKey);
            if (!pegP) {
                const connections = await E(pegasusConnections).entries();
                assert(connections.length > 0, `pegasusConnections nameHub is empty`);
                console.log('pegasusConnections:', connections.length);
                const [addr, conn] = connections.find(([a, _c]) =>
                  a.endsWith(channel),
                );
                await E(pegasus).pegRemote();
            }
            /** @type {Invitation} */
            const transferInvitation = await E(pegasus).makeInvitationToTransfer(
                pegP,
                transfer.receiver,
                next ? JSON.stringify(next) : '',
                'Agoric PFM'
            );
            const seat = await E(zoe).offer(
                transferInvitation,
                {
                    give: { Transfer: { brand: localBrand, value: 100000000000000000001n } },
                },
                { Transfer: payment },
            );
            const result = await E(seat).getOfferResult();

            console.log("PFM Forward Result: ", result);
        }
    }
};