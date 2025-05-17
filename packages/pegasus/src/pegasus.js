// @ts-check

import { assert, X, Fail, makeError } from '@endo/errors';
import { makeLegacyWeakMap, makeLegacyMap } from '@agoric/store';
import { E, Far } from '@endo/far';
import {
  assertProposalShape,
  atomicTransfer,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeSubscriptionKit } from '@agoric/notifier';

import { IBCSourceTraceDenomTransformer } from './ibc-trace.js';
import { ICS20TransferProtocol } from './ics20.js';
import { makeCourierMaker, getCourierPK } from './courier.js';

/**
 * @import {CloseReason, Connection} from '@agoric/network';
 * @import {Remote} from '@agoric/vow';
 */

const DEFAULT_DENOM_TRANSFORMER = IBCSourceTraceDenomTransformer;
const DEFAULT_TRANSFER_PROTOCOL = ICS20TransferProtocol;

const TRANSFER_PROPOSAL_SHAPE = {
  give: {
    Transfer: null,
  },
};

/**
 * Make a Pegasus public API.
 *
 * @param {object} powers
 * @param {ZCF} powers.zcf the Zoe Contract Facet
 * @param {Remote<BoardDepositFacet>} powers.board where to find depositFacets by boardID
 * @param {Remote<NameHub>} powers.namesByAddress where to find depositFacets by bech32
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>['when']} powers.when
 *
 * @import {NameHub} from '@agoric/vats'
 */
export const makePegasus = ({ zcf, board, namesByAddress, when }) => {
  /**
   * @typedef {object} LocalDenomState
   * @property {string} localAddr
   * @property {string} remoteAddr
   * @property {LegacyMap<Denom, PromiseRecord<Courier>>} receiveDenomToCourierPK
   * @property {IterationObserver<Denom>} receiveDenomPublication
   * @property {Subscription<Denom>} remoteDenomSubscription
   * @property {bigint} lastDenomNonce Distinguish Pegasus-created denom names
   * that are sent and received from a remote connection
   * @property {(reason: CloseReason) => void} abort
   */

  let lastLocalIssuerNonce = 0n;
  /**
   * Create a new issuer keyword (based on Local + nonce)
   *
   * @returns {string}
   */
  const createLocalIssuerKeyword = () => {
    lastLocalIssuerNonce += 1n;
    return `Local${lastLocalIssuerNonce}`;
  };

  /**
   * @type {LegacyWeakMap<Remote<Peg>, LocalDenomState>}
   */
  // Legacy because Mappings mix functions and data
  const pegToDenomState = makeLegacyWeakMap('Peg');

  /**
   * Create a fresh Peg associated with a descriptor.
   *
   * @typedef {object} PegasusDescriptor
   * @property {Brand} localBrand
   * @property {Denom} receiveDenom
   * @property {Denom} sendDenom
   * @property {string} allegedName
   *
   * @param {LocalDenomState} state
   * @param {PegasusDescriptor} desc
   * @returns {Peg}
   */
  const makePeg = (state, desc) => {
    /** @type {Peg} */
    const peg = Far(`${desc.allegedName} peg`, {
      getAllegedName() {
        return desc.allegedName;
      },
      getLocalBrand() {
        return desc.localBrand;
      },
      getReceiveDenom() {
        return desc.receiveDenom;
      },
      getSendDenom() {
        return desc.sendDenom;
      },
    });

    pegToDenomState.init(peg, state);
    return peg;
  };

  /**
   * @param {object} param0
   * @param {ReturnType<typeof makeCourierMaker>} param0.makeCourier
   * @param {LocalDenomState} param0.localDenomState
   * @param {Remote<TransferProtocol>} param0.transferProtocol
   * @param {Remote<DenomTransformer>} param0.denomTransformer
   * @returns {PegasusConnectionActions}
   */
  const makePegasusConnectionActions = ({
    makeCourier,
    localDenomState,
    transferProtocol,
    denomTransformer,
  }) => {
    let checkAbort = () => {};

    /** @type {Set<Peg>} */
    const pegs = new Set();

    /** @type {PegasusConnectionActions} */
    const pegasusConnectionActions = Far('pegasusConnectionActions', {
      async rejectTransfersWaitingForPegRemote(remoteDenom) {
        checkAbort();
        const { receiveDenomToCourierPK } = localDenomState;

        const { receiveDenom } = await E(
          denomTransformer,
        ).getDenomsForRemotePeg(
          remoteDenom,
          localDenomState.localAddr,
          localDenomState.remoteAddr,
        );
        checkAbort();

        const { reject, promise } = receiveDenomToCourierPK.get(receiveDenom);

        // Only continue if the promise isn't already resolved.
        const raceWinner = await Promise.race([promise, null]);
        checkAbort();
        !raceWinner || Fail`${receiveDenom} is already resolved`;

        // If rejected, the rejection is returned to our caller, so we have
        // handled it correctly and that flow doesn't need to trigger an
        // additional UnhandledRejectionWarning in our vat.
        promise.catch(() => {});
        reject(makeError(X`${receiveDenom} is temporarily unavailable`));

        // Allow new transfers to be initiated after this rejection.
        receiveDenomToCourierPK.delete(receiveDenom);
      },
      async pegRemote(
        allegedName,
        remoteDenom,
        assetKind = undefined,
        displayInfo = undefined,
      ) {
        checkAbort();
        const { receiveDenomToCourierPK } = localDenomState;

        // Create the issuer for the local erights corresponding to the remote values.
        const localKeyword = createLocalIssuerKeyword();
        const zcfMint = await zcf.makeZCFMint(
          localKeyword,
          assetKind,
          displayInfo,
        );
        checkAbort();
        const { brand: localBrand } = zcfMint.getIssuerRecord();

        const { sendDenom, receiveDenom } = await E(
          denomTransformer,
        ).getDenomsForRemotePeg(
          remoteDenom,
          localDenomState.localAddr,
          localDenomState.remoteAddr,
        );
        checkAbort();

        // Describe how to retain/redeem pegged shadow erights.
        const courier = makeCourier({
          zcf,
          localBrand,
          board,
          namesByAddress,
          sendDenom,
          retain: (zcfSeat, amounts) =>
            zcfMint.burnLosses(harden(amounts), zcfSeat),
          redeem: (zcfSeat, amounts) => {
            zcfMint.mintGains(harden(amounts), zcfSeat);
          },
          transferProtocol,
          when,
        });

        const courierPK = getCourierPK(receiveDenom, receiveDenomToCourierPK);
        courierPK.resolve(courier);

        checkAbort();
        const peg = makePeg(localDenomState, {
          localBrand,
          sendDenom,
          receiveDenom,
          allegedName,
        });
        pegs.add(peg);
        return peg;
      },

      async pegLocal(allegedName, localIssuer) {
        checkAbort();

        localDenomState.lastDenomNonce += 1n;
        const remoteDenom = `pegasus${localDenomState.lastDenomNonce}`;

        // Create a seat in which to keep our escrowed ERTP assets of this denomination.
        const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();

        // Ensure the issuer can be used in Zoe offers.
        const localKeyword = createLocalIssuerKeyword();
        const { brand: localBrand } = await zcf.saveIssuer(
          localIssuer,
          localKeyword,
        );
        checkAbort();

        const { sendDenom, receiveDenom } = await E(
          denomTransformer,
        ).getDenomsForLocalPeg(
          remoteDenom,
          localDenomState.localAddr,
          localDenomState.remoteAddr,
        );
        checkAbort();

        /**
         * Transfer amount (of localBrand) from loser to winner seats.
         *
         * @param {Amount} amount amount to transfer
         * @param {Keyword} loserKeyword the keyword to take from the loser
         * @param {ZCFSeat} loser seat to transfer from
         * @param {Keyword} winnerKeyword the keyword to give to the winner
         * @param {ZCFSeat} winner seat to transfer to
         */
        const transferAmountFrom = (
          amount,
          loserKeyword,
          loser,
          winnerKeyword,
          winner,
        ) => {
          // Transfer the amount to our backing seat.
          atomicTransfer(
            zcf,
            loser,
            winner,
            { [loserKeyword]: amount },
            { [winnerKeyword]: amount },
          );
        };

        // Describe how to retain/redeem real local erights.
        const courier = makeCourier({
          zcf,
          board,
          namesByAddress,
          sendDenom,
          localBrand,
          retain: (transferSeat, amounts) =>
            transferAmountFrom(
              amounts.Transfer,
              'Transfer',
              transferSeat,
              'Pool',
              poolSeat,
            ),
          redeem: (transferSeat, amounts) =>
            transferAmountFrom(
              amounts.Transfer,
              'Pool',
              poolSeat,
              'Transfer',
              transferSeat,
            ),
          transferProtocol,
          when,
        });

        const { receiveDenomToCourierPK } = localDenomState;

        const courierPK = getCourierPK(receiveDenom, receiveDenomToCourierPK);
        courierPK.resolve(courier);

        const peg = makePeg(localDenomState, {
          localBrand,
          sendDenom,
          receiveDenom,
          allegedName,
        });
        pegs.add(peg);
        return peg;
      },
      abort: reason => {
        checkAbort();
        checkAbort = () => {
          throw reason;
        };
        for (const peg of pegs) {
          pegToDenomState.delete(peg);
        }
      },
    });
    return pegasusConnectionActions;
  };

  return Far('pegasus', {
    /**
     * Return a handler that can be used with the Network API.
     *
     * @param {Remote<TransferProtocol>} [transferProtocol]
     * @param {Remote<DenomTransformer>} [denomTransformer]
     * @returns {PegasusConnectionKit}
     */
    makePegasusConnectionKit(
      transferProtocol = DEFAULT_TRANSFER_PROTOCOL,
      denomTransformer = DEFAULT_DENOM_TRANSFORMER,
    ) {
      /**
       * @type {LegacyWeakMap<Remote<Connection>, LocalDenomState>}
       */
      // Legacy because the value contains a JS Set
      const connectionToLocalDenomState = makeLegacyWeakMap('Connection');

      /**
       * @type {SubscriptionRecord<PegasusConnection>}
       */
      const {
        subscription: connectionSubscription,
        publication: connectionPublication,
      } = makeSubscriptionKit();

      /** @type {ConnectionHandler} */
      const handler = {
        async onOpen(c, localAddr, remoteAddr) {
          // Register `c` with the table of Peg receivers.
          const {
            subscription: remoteDenomSubscription,
            publication: receiveDenomPublication,
          } = makeSubscriptionKit();
          const receiveDenomToCourierPK = makeLegacyMap('Denomination');

          /** @type {LocalDenomState} */
          const localDenomState = {
            localAddr,
            remoteAddr,
            receiveDenomToCourierPK,
            lastDenomNonce: 0n,
            receiveDenomPublication,
            remoteDenomSubscription,
            abort: reason => {
              actions.abort(reason);
            },
          };

          // The courier is the only thing that we use to send messages to `c`.
          const makeCourier = makeCourierMaker(c);
          const actions = makePegasusConnectionActions({
            localDenomState,
            makeCourier,
            transferProtocol,
            denomTransformer,
          });

          connectionToLocalDenomState.init(c, localDenomState);

          /** @type {PegasusConnection} */
          const state = harden({
            localAddr,
            remoteAddr,
            actions,
            remoteDenomSubscription,
          });
          connectionPublication.updateState(state);
        },
        async onReceive(c, packetBytes) {
          const doReceive = async () => {
            // Dispatch the packet to the appropriate Peg for this connection.
            const parts =
              await E(transferProtocol).parseTransferPacket(packetBytes);

            const { remoteDenom: receiveDenom } = parts;
            assert.typeof(receiveDenom, 'string');

            const { receiveDenomToCourierPK, receiveDenomPublication } =
              connectionToLocalDenomState.get(c);

            if (!receiveDenomToCourierPK.has(receiveDenom)) {
              // This is the first time we've heard of this denomination.
              receiveDenomPublication.updateState(receiveDenom);
            }

            // Wait for the courier to be instantiated.
            const courierPK = getCourierPK(
              receiveDenom,
              receiveDenomToCourierPK,
            );
            const { receive } = await courierPK.promise;
            return receive(parts);
          };

          return doReceive().catch(error =>
            E(transferProtocol).makeTransferPacketAck(false, error),
          );
        },
        async onClose(c) {
          // Unregister `c`.  Pending transfers will be rejected by the Network
          // API.
          const {
            receiveDenomPublication,
            receiveDenomToCourierPK,
            localAddr,
            remoteAddr,
            abort,
          } = connectionToLocalDenomState.get(c);
          connectionToLocalDenomState.delete(c);
          const err = makeError(X`pegasusConnectionHandler closed`);
          receiveDenomPublication.fail(err);
          /** @type {PegasusConnection} */
          const state = harden({
            localAddr,
            remoteAddr,
          });
          connectionPublication.updateState(state);
          for (const courierPK of receiveDenomToCourierPK.values()) {
            try {
              courierPK.reject(err);
            } catch (e) {
              // Already resolved/rejected, so ignore.
            }
          }
          abort(err);
        },
      };

      return harden({
        handler: Far('pegasusConnectionHandler', handler),
        subscription: connectionSubscription,
      });
    },

    getLocalIssuer(localBrand) {
      return zcf.getIssuerForBrand(localBrand);
    },

    /**
     * Create a Zoe invitation to transfer assets over network to a deposit address.
     *
     * @param {Remote<Peg>} pegP the peg over which to transfer
     * @param {DepositAddress} depositAddress the remote receiver's address
     * @param {string} [memo] the memo to attach to ics transfer packet
     * @param {SenderOptions} [opts] additional sender options
     * @returns {Promise<Invitation>} to transfer, make an offer of { give: { Transfer: pegAmount } } to this invitation
     */
    async makeInvitationToTransfer(pegP, depositAddress, memo = '', opts = {}) {
      // Verify the peg.
      const peg = await pegP;
      const denomState = pegToDenomState.get(peg);

      // Get details from the peg.
      const [receiveDenom, sendDenom] = await Promise.all([
        E(peg).getReceiveDenom(),
        E(peg).getSendDenom(),
      ]);
      const { receiveDenomToCourierPK } = denomState;

      const courierPK = getCourierPK(receiveDenom, receiveDenomToCourierPK);
      const { send } = await courierPK.promise;

      /**
       * Attempt the transfer, returning a refund if failed.
       *
       * @type {OfferHandler}
       */
      const offerHandler = zcfSeat => {
        assertProposalShape(zcfSeat, TRANSFER_PROPOSAL_SHAPE);
        send(zcfSeat, depositAddress, memo, opts);
      };

      return zcf.makeInvitation(offerHandler, `pegasus ${sendDenom} transfer`);
    },
  });
};
harden(makePegasus);

/**
 * @typedef {ReturnType<typeof makePegasus>} Pegasus
 */
