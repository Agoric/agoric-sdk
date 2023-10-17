// @ts-check

import { E } from "@endo/far";
import { error } from "console";

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
 * @param {PegasusConnectionActions} pegasusConnAction the pegasus connection actions
 * @param {ZoeService} zoe zoe instance
 * @param {string} memo the transfer memo
 * @param {Brand} localBrand the local ERTP brand you are transferring
 * @param {string} remoteDenom the remote (native denom) denom you are transferring
 * @param {Payment} payment the payment of the assets to transfer
 * @param {object} scratch the payment of the assets to transfer
 * @param {Array<[string, any]>} pegasusConnections the pegasus connections
 * 
 */
export const forward = async (pegasus, pegasusConnAction, zoe, memo, localBrand, remoteDenom, payment, scratch, pegasusConnections) => {
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
            let pegP = E(scratch).getValue(pegKey);
            if (!pegP) {
                const connections = /** @type {IterableIterator<[number, PegasusConnection]>} */ (await E(pegasusConnections).entries());
                assert(getLength(connections) > 0, `pegasusConnections nameHub is empty`);
                console.log('pegasusConnections:', getLength(connections));
                /** @type {[number, PegasusConnection] | undefined} */
                const conn = Array.from(connections).find((/** @type {any} */ item) =>
                    item[1].channel.includes(transfer.channel)
                );
                if (conn === undefined) {
                    throw error(`No channel found in Pegasus connections for ${transfer.channel}`);
                }
                if (conn[1].actions === undefined) {
                    throw error(`No actions found in Pegasus connections channel for ${transfer.channel}`);
                }
                pegP = await E(conn[1].actions).pegRemote(remoteDenom, remoteDenom);
                await E(scratch).setValue(pegKey, pegP);
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

/**
 * Get the length of an iterable object.
 * 
 * @param {IterableIterator<[number, any]>} iterable - The iterable object.
 * @returns {number} The number of items in the iterable object.
 */
function getLength(iterable) {
    let length = 0;
    for (const _ of iterable) {
        length++;
    }
    return length;
}