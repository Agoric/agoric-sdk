// @ts-check
import { details as X } from '@agoric/assert';

import { AmountMath } from '@agoric/ertp';
import { WalletName } from '@agoric/internal';
import { E, Far } from '@endo/far';
import { makeOncePromiseKit } from './once-promise-kit.js';
import { parseTransferMemo } from './pfm.js';

/**
 * Create or return an existing courier promise kit.
 *
 * @template K
 * @param {K} key
 * @param {LegacyMap<K, PromiseRecord<Courier>>} keyToCourierPK
 */
export const getCourierPK = (key, keyToCourierPK) => {
  if (keyToCourierPK.has(key)) {
    return keyToCourierPK.get(key);
  }

  // This is the first packet for this denomination.
  // Create a new Courier promise kit for it.
  const courierPK = makeOncePromiseKit(X`${key} already pegged`);

  keyToCourierPK.init(key, courierPK);
  return courierPK;
};

/**
 * Function to re-run an operation after a delay, up to a maximum number of retries.
 *
 * @param {function} operation
 * @param {number} delay
 * @param {number} retries
 */
function retryOperation(operation, delay, retries) {
  return new Promise((resolve, reject) => {
    function attempt() {
      operation()
        .then(resolve)
        .catch((reason) => {
          if (retries - 1 > 0) {
            setTimeout(() => {
              retryOperation(operation, delay, retries - 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            reject(reason);
          }
        });
    }
    attempt();
  });
}

/**
 * Create the [send, receive] pair.
 *
 * @typedef {import('@agoric/vats').NameHub} NameHub
 *
 * @typedef {object} CourierArgs
 * @property {ZCF} zcf
 * @property {ERef<BoardDepositFacet>} board
 * @property {ERef<NameHub>} namesByAddress
 * @property {Denom} sendDenom
 * @property {Brand} localBrand
 * @property {(zcfSeat: ZCFSeat, amounts: AmountKeywordRecord) => void} retain
 * @property {(zcfSeat: ZCFSeat, amounts: AmountKeywordRecord) => void} redeem
 * @property {ERef<TransferProtocol>} transferProtocol
 * @property {ReturnType<import('@agoric/vow').prepareVowTools>['when']} when
 * @param {ERef<Connection>} connection
 * @returns {(args: CourierArgs) => Courier}
 */
export const makeCourierMaker =
  connection =>
  ({
    zcf,
    board,
    namesByAddress,
    sendDenom,
    localBrand,
    retain,
    redeem,
    transferProtocol,
    when,
  }) => {
    /** @type {Sender} */
    const send = async (zcfSeat, depositAddress, memo, opts) => {
      const tryToSend = async () => {
        const amount = zcfSeat.getAmountAllocated('Transfer', localBrand);
        const transferPacket = await E(transferProtocol).makeTransferPacket({
          value: amount.value,
          remoteDenom: sendDenom,
          depositAddress,
          memo,
          opts,
        });

        // Retain the payment.  We must not proceed on failure.
        retain(zcfSeat, { Transfer: amount });

        // The payment is already escrowed, and proposed to retain, so try sending.
        return when(E(connection).send(transferPacket))
          .then(ack => E(transferProtocol).assertTransferPacketAck(ack))
          .then(
            _ => zcfSeat.exit(),
            reason => {
              // Return the payment to the seat, if possible.
              redeem(zcfSeat, { Transfer: amount });
              throw reason;
            },
          );
      };

      // Reflect any error back to the seat.
      return tryToSend().catch(reason => {
        zcfSeat.fail(reason);
      });
    };

    /**
     * Handle the transfer part of the Packet Forward Middleware (PFM).
     *
     * @param {Forward} forward - The parsed transfer memo.
     * @param {ZCFSeat} zcfSeat - The Zoe contract facet seat.
     * @param {Amount} localAmount - The local amount to be transferred.
     * @param {string} depositAddress - The deposit address.
     * @returns {Promise} - A promise that resolves when the transfer is handled.
     */
    const handleTransfer = async (forward, zcfSeat, localAmount, depositAddress) => {
      if (forward.transfer) {
        redeem(zcfSeat, { Transfer: localAmount });
        const next = (typeof forward.transfer.next === "string" && typeof forward.transfer.next != undefined) ? JSON.parse(forward.transfer.next) : forward.transfer.next;
        await send(zcfSeat, forward.transfer.receiver, next ? next : "PFM Transfer", { sender: depositAddress });
        console.log("Completed PFM Transfer Forward: ", forward);
      }
    };

    /**
     * Handle the contract call part of the Packet Forward Middleware (PFM).
     *
     * @param {Forward} forward - The parsed transfer memo.
     * @param {Payment} payout - The payout object.
     * @param {Object} namesByAddress - The names by address object.
     * @returns {Promise} - A promise that resolves when the call is handled.
     */
    const handleCall = async (forward, payout, namesByAddress) => {
      if (forward.call) {
        const { address, contractKey, functionName, args } = forward.call;
        if (!address || !contractKey || !functionName || !args) {
          throw Error(`Invalid PFM Call Forward: ${JSON.stringify(forward.call)}`);
        }
        const instance = await E(namesByAddress).lookup(address, contractKey);
        args['funds'] = payout;
        const result = await E(instance.publicFacet)[functionName](args);
        console.log("Completed PFM Call Forward: ", forward.call);
        console.log("PFM Call Result: ", result);
      }
    };

    /**
     * Redeem the backing payment.
     *
     * @param {Object} zcfSeat - The Zoe contract facet seat.
     * @param {Object} localAmount - The local amount to be redeemed.
     * @param {Object} userSeat - The user seat.
     * @returns {Promise} - A promise that resolves to the payout.
     */
    const redeemPayment = async (zcfSeat, localAmount, userSeat) => {
      try {
        redeem(zcfSeat, { Transfer: localAmount });
        zcfSeat.exit();
      } catch (e) {
        zcfSeat.fail(e);
        throw e;
      }
      return await E(userSeat).getPayout('Transfer');
    };

    /** @type {Receiver} */
    const receive = async ({ value, depositAddress, memo }) => {
      try {
        const localAmount = AmountMath.make(localBrand, value);
        const depositFacet = await E(board).getValue(depositAddress).catch(_ => E(namesByAddress).lookup(depositAddress, WalletName.depositFacet));
        const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
        const forward = parseTransferMemo(memo);

        if (forward) {
          if (forward.transfer) {
            await retryOperation(() => handleTransfer(forward, zcfSeat, localAmount, depositAddress), 1000, forward.transfer.retries || 1);
            // returning void ack will prevent WriteAcknowledgement from occurring for forwarded packet.
            // This is intentional so that the acknowledgement will be written later based on the ack/timeout of the forwarded packet.
            return;
          } 
          if (forward.call) {
            const payout = await redeemPayment(zcfSeat, localAmount, userSeat);
            await handleCall(forward, payout, namesByAddress);
            return E(transferProtocol).makeTransferPacketAck(true);
          }
        }

        const payout = await redeemPayment(zcfSeat, localAmount, userSeat);
        E(depositFacet).receive(payout).catch(_ => {});

        return E(transferProtocol).makeTransferPacketAck(true);

      } catch (e) {

        console.error(e);
        return E(transferProtocol).makeTransferPacketAck(false, e);

      }
    };

    return Far('courier', { send, receive });
  };