// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { makeLegacyWeakMap, makeStore, makeLegacyMap } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { Far } from '@endo/marshal';
import { makeSubscriptionKit } from '@agoric/notifier';

import '@agoric/vats/exported.js';
import '@agoric/swingset-vat/src/vats/network/types.js';
import '@agoric/zoe/exported.js';

import '../exported.js';
import { makePromiseKit } from '@agoric/promise-kit';
import { AmountMath } from '@agoric/ertp';
import { ICS20TransferProtocol } from './ics20.js';

const DEFAULT_TRANSFER_PROTOCOL = ICS20TransferProtocol;

const DEFAULT_AMOUNT_MATH_KIND = 'nat';

const TRANSFER_PROPOSAL_SHAPE = {
  give: {
    Transfer: null,
  },
};

/**
 * Create a promise kit that will throw an exception if it is resolved or
 * rejected more than once.
 *
 * @param {() => Details} makeReinitDetails
 */
const makeOncePromiseKit = makeReinitDetails => {
  const { promise, resolve, reject } = makePromiseKit();

  let initialized = false;
  /**
   * @template {any[]} A
   * @template R
   * @param {(...args: A) => R} fn
   * @returns {(...args: A) => R}
   */
  const onceOnly = fn => (...args) => {
    assert(!initialized, makeReinitDetails());
    initialized = true;
    return fn(...args);
  };

  /** @type {PromiseRecord<any>} */
  const oncePK = harden({
    promise,
    resolve: onceOnly(resolve),
    reject: onceOnly(reject),
  });
  return oncePK;
};

/**
 * Create or return an existing courier promise kit.
 *
 * @param {Denom} remoteDenom
 * @param {Store<Denom, PromiseRecord<Courier>>} remoteDenomToCourierPK
 */
const getCourierPK = (remoteDenom, remoteDenomToCourierPK) => {
  if (remoteDenomToCourierPK.has(remoteDenom)) {
    return remoteDenomToCourierPK.get(remoteDenom);
  }

  // This is the first packet for this denomination.
  // Create a new Courier promise kit for it.
  const courierPK = makeOncePromiseKit(() => X`${remoteDenom} already pegged`);

  remoteDenomToCourierPK.init(remoteDenom, courierPK);
  return courierPK;
};

/**
 * Create the [send, receive] pair.
 *
 * @typedef {Object} CourierArgs
 * @property {ContractFacet} zcf
 * @property {ERef<Connection>} connection
 * @property {ERef<BoardDepositFacet>} board
 * @property {ERef<NameHub>} namesByAddress
 * @property {Denom} remoteDenom
 * @property {Brand} localBrand
 * @property {(zcfSeat: ZCFSeat, amounts: AmountKeywordRecord) => void} retain
 * @property {(zcfSeat: ZCFSeat, amounts: AmountKeywordRecord) => void} redeem
 * @property {ERef<TransferProtocol>} transferProtocol
 * @param {CourierArgs} arg0
 * @returns {Courier}
 */
const makeCourier = ({
  zcf,
  connection,
  board,
  namesByAddress,
  remoteDenom,
  localBrand,
  retain,
  redeem,
  transferProtocol,
}) => {
  /** @type {Sender} */
  const send = async (zcfSeat, depositAddress) => {
    const tryToSend = async () => {
      const amount = zcfSeat.getAmountAllocated('Transfer', localBrand);
      const transferPacket = await E(transferProtocol).makeTransferPacket({
        value: amount.value,
        remoteDenom,
        depositAddress,
      });

      // Retain the payment.  We must not proceed on failure.
      retain(zcfSeat, { Transfer: amount });

      // The payment is already escrowed, and proposed to retain, so try sending.
      return E(connection)
        .send(transferPacket)
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

  /** @type {Receiver} */
  const receive = async ({ value, depositAddress }) => {
    const localAmount = AmountMath.make(localBrand, value);

    // Look up the deposit facet for this board address, if there is one.
    /** @type {DepositFacet} */
    const depositFacet = await E(board)
      .getValue(depositAddress)
      .catch(_ => E(namesByAddress).lookup(depositAddress, 'depositFacet'));

    const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();

    // Redeem the backing payment.
    try {
      redeem(zcfSeat, { Transfer: localAmount });
      zcfSeat.exit();
    } catch (e) {
      zcfSeat.fail(e);
      throw e;
    }

    // Once we've gotten to this point, their payment is committed and
    // won't be refunded on a failed receive.
    const payout = await E(userSeat).getPayout('Transfer');

    // Send the payout promise to the deposit facet.
    //
    // We don't want to wait for the depositFacet to return, so that
    // it can't hang up (i.e. DoS) an ordered channel, which relies on
    // us returning promptly.
    E(depositFacet)
      .receive(payout)
      .catch(_ => {});

    return E(transferProtocol).makeTransferPacketAck(true);
  };

  return Far('courier', { send, receive });
};

/**
 * Make a Pegasus public API.
 *
 * @param {ContractFacet} zcf the Zoe Contract Facet
 * @param {ERef<BoardDepositFacet>} board where to find depositFacets by boardID
 * @param {ERef<NameHub>} namesByAddress where to find depositFacets by bech32
 */
const makePegasus = (zcf, board, namesByAddress) => {
  /**
   * @typedef {Object} LocalDenomState
   * @property {Store<Denom, PromiseRecord<Courier>>} remoteDenomToCourierPK
   * @property {Subscription<Denom>} remoteDenomSubscription
   * @property {number} lastDenomNonce
   * @property {ERef<TransferProtocol>} transferProtocol
   */

  /**
   * @type {LegacyWeakMap<Connection, LocalDenomState>}
   */
  // Legacy because the value contains a JS Set
  const connectionToLocalDenomState = makeLegacyWeakMap('Connection');

  let lastLocalIssuerNonce = 0;
  /**
   * Create a new issuer keyword (based on Local + nonce)
   *
   * @returns {string}
   */
  const createLocalIssuerKeyword = () => {
    lastLocalIssuerNonce += 1;
    return `Local${lastLocalIssuerNonce}`;
  };

  /**
   * @type {Store<Peg, Connection>}
   */
  const pegToConnection = makeStore('Peg');

  /**
   * Create a fresh Peg associated with a descriptor.
   *
   * @typedef {Object} PegDescriptor
   * @property {Brand} localBrand
   * @property {Denom} remoteDenom
   * @property {string} allegedName
   *
   * @param {Connection} c
   * @param {PegDescriptor} desc
   * @returns {Peg}
   */
  const makePeg = (c, desc) => {
    /** @type {Peg} */
    const peg = Far('peg', {
      getAllegedName() {
        return desc.allegedName;
      },
      getLocalBrand() {
        return desc.localBrand;
      },
      getRemoteDenom() {
        return desc.remoteDenom;
      },
    });

    pegToConnection.init(peg, c);
    return peg;
  };

  return Far('pegasus', {
    /**
     * Return a handler that can be used with the Network API.
     *
     * @param {ERef<TransferProtocol>} [transferProtocol=DEFAULT_TRANSFER_PROTOCOL]
     * @returns {ConnectionHandler}
     */
    makePegConnectionHandler(transferProtocol = DEFAULT_TRANSFER_PROTOCOL) {
      /**
       * @type {Store<Denom, PromiseRecord<Courier>>}
       */
      const remoteDenomToCourierPK = makeLegacyMap('Denomination');

      /**
       * @type {SubscriptionRecord<Denom>}
       */
      const {
        subscription: remoteDenomSubscription,
        publication: remoteDenomPublication,
      } = makeSubscriptionKit();

      return Far('pegConnectionHandler', {
        async onOpen(c) {
          // Register C with the table of Peg receivers.
          connectionToLocalDenomState.init(c, {
            remoteDenomToCourierPK,
            lastDenomNonce: 0,
            transferProtocol,
            remoteDenomSubscription,
          });
        },
        async onReceive(_c, packetBytes) {
          const doReceive = async () => {
            // Dispatch the packet to the appropriate Peg for this connection.
            const parts = await E(transferProtocol).parseTransferPacket(
              packetBytes,
            );

            const { remoteDenom } = parts;
            assert.typeof(remoteDenom, 'string');

            if (!remoteDenomToCourierPK.has(remoteDenom)) {
              // This is the first time we've heard of this denomination.
              remoteDenomPublication.updateState(remoteDenom);
            }

            // Wait for the courier to be instantiated.
            const courierPK = getCourierPK(remoteDenom, remoteDenomToCourierPK);
            const { receive } = await courierPK.promise;
            return receive(parts);
          };

          return doReceive().catch(error =>
            E(transferProtocol).makeTransferPacketAck(false, error),
          );
        },
        async onClose(c) {
          // Unregister C.  Pending transfers will be rejected by the Network API.
          connectionToLocalDenomState.delete(c);
          remoteDenomPublication.fail(
            assert.error(X`pegConnectionHandler closed`),
          );
        },
      });
    },

    /**
     * Get a subscription for remote denoms added on a connection.
     *
     * @param {ERef<Connection>} connectionP
     */
    async getRemoteDenomSubscription(connectionP) {
      const connection = await connectionP;
      const { remoteDenomSubscription } = connectionToLocalDenomState.get(
        connection,
      );
      return remoteDenomSubscription;
    },

    /**
     * Abort any in-progress remoteDenom transfers if there has not yet been a
     * pegRemote or pegLocal for it.
     *
     * This races against any attempts to obtain metadata and establish a given
     * peg.
     *
     * It's alright to expose to the holder of the connection.
     *
     * @param {ERef<Connection>} connectionP
     * @param {string} remoteDenom
     */
    async rejectStuckTransfers(connectionP, remoteDenom) {
      const connection = await connectionP;
      const { remoteDenomToCourierPK } = connectionToLocalDenomState.get(
        connection,
      );

      const { reject, promise } = remoteDenomToCourierPK.get(remoteDenom);
      promise.catch(() => {});
      reject(assert.error(X`${remoteDenom} is temporarily unavailable`));

      // Allow new transfers to be initiated.
      remoteDenomToCourierPK.delete(remoteDenom);
    },

    /**
     * Peg a remote asset over a network connection.
     *
     * @param {string} allegedName
     * @param {ERef<Connection>} connectionP The network connection (such as IBC
     * channel) to communicate over
     * @param {Denom} remoteDenom Remote denomination
     * @param {string} [assetKind=DEFAULT_AMOUNT_MATH_KIND] The kind of
     * amount math for the pegged values
     * @param {DisplayInfo} [displayInfo]
     * @returns {Promise<Peg>}
     */
    async pegRemote(
      allegedName,
      connectionP,
      remoteDenom,
      assetKind = DEFAULT_AMOUNT_MATH_KIND,
      displayInfo = undefined,
    ) {
      // Assertions
      assert(
        assetKind === 'nat',
        X`Unimplemented assetKind ${q(assetKind)}; need "nat"`,
      );

      const c = await connectionP;
      assert(
        connectionToLocalDenomState.has(c),
        X`The connection must use .makePegConnectionHandler()`,
      );

      const { transferProtocol } = connectionToLocalDenomState.get(c);

      // Create the issuer for the local erights corresponding to the remote values.
      const localKeyword = createLocalIssuerKeyword();
      const zcfMint = await zcf.makeZCFMint(
        localKeyword,
        assetKind,
        displayInfo,
      );
      const { brand: localBrand } = zcfMint.getIssuerRecord();

      // Describe how to retain/redeem pegged shadow erights.
      const courier = makeCourier({
        zcf,
        connection: c,
        localBrand,
        board,
        namesByAddress,
        remoteDenom,
        retain: (zcfSeat, amounts) =>
          zcfMint.burnLosses(harden(amounts), zcfSeat),
        redeem: (zcfSeat, amounts) => {
          zcfMint.mintGains(harden(amounts), zcfSeat);
        },
        transferProtocol,
      });

      const { remoteDenomToCourierPK } = connectionToLocalDenomState.get(c);

      const courierPK = getCourierPK(remoteDenom, remoteDenomToCourierPK);
      courierPK.resolve(courier);

      return makePeg(c, { localBrand, remoteDenom, allegedName });
    },

    /**
     * Peg a local asset over a network connection.
     *
     * @param {string} allegedName
     * @param {ERef<Connection>} connectionP The network connection (such as IBC
     * channel) to communicate over
     * @param {Issuer} localIssuer Local ERTP issuer whose assets should be
     * pegged to the connection
     * @returns {Promise<Peg>}
     */
    async pegLocal(allegedName, connectionP, localIssuer) {
      const c = await connectionP;
      assert(
        connectionToLocalDenomState.has(c),
        X`The connection must use .makePegConnectionHandler()`,
      );

      // We need the last nonce for our denom name.
      const localDenomState = connectionToLocalDenomState.get(c);
      const { transferProtocol } = localDenomState;
      localDenomState.lastDenomNonce += 1;
      const remoteDenom = `pegasus${localDenomState.lastDenomNonce}`;

      // Create a seat in which to keep our denomination.
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();

      // Ensure the issuer can be used in Zoe offers.
      const localKeyword = createLocalIssuerKeyword();
      const { brand: localBrand } = await zcf.saveIssuer(
        localIssuer,
        localKeyword,
      );

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
        loser.decrementBy(harden({ [loserKeyword]: amount }));
        winner.incrementBy(harden({ [winnerKeyword]: amount }));
        zcf.reallocate(loser, winner);
      };

      // Describe how to retain/redeem real local erights.
      const courier = makeCourier({
        zcf,
        connection: c,
        board,
        namesByAddress,
        remoteDenom,
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
      });

      const { remoteDenomToCourierPK } = localDenomState;

      const courierPK = getCourierPK(remoteDenom, remoteDenomToCourierPK);
      courierPK.resolve(courier);

      return makePeg(c, { localBrand, remoteDenom, allegedName });
    },

    /**
     * Find one of our registered issuers.
     *
     * @param {Brand} localBrand
     * @returns {Promise<Issuer>}
     */
    async getLocalIssuer(localBrand) {
      return zcf.getIssuerForBrand(localBrand);
    },

    /**
     * Create a Zoe invitation to transfer assets over network to a deposit address.
     *
     * @param {ERef<Peg>} pegP the peg over which to transfer
     * @param {DepositAddress} depositAddress the remote receiver's address
     * @returns {Promise<Invitation>} to transfer, make an offer of { give: { Transfer: pegAmount } } to this invitation
     */
    async makeInvitationToTransfer(pegP, depositAddress) {
      // Verify the peg.
      const peg = await pegP;
      const c = pegToConnection.get(peg);

      // Get details from the peg.
      const remoteDenom = await E(peg).getRemoteDenom();
      const { remoteDenomToCourierPK } = connectionToLocalDenomState.get(c);

      const courierPK = getCourierPK(remoteDenom, remoteDenomToCourierPK);
      const { send } = await courierPK.promise;

      /**
       * Attempt the transfer, returning a refund if failed.
       *
       * @type {OfferHandler}
       */
      const offerHandler = zcfSeat => {
        assertProposalShape(zcfSeat, TRANSFER_PROPOSAL_SHAPE);
        send(zcfSeat, depositAddress);
      };

      return zcf.makeInvitation(
        offerHandler,
        `pegasus ${remoteDenom} transfer`,
      );
    },
  });
};

/**
 * @typedef {ReturnType<typeof makePegasus>} Pegasus
 */

/**
 * @type {ContractStartFn}
 */
const start = zcf => {
  const { board, namesByAddress } = zcf.getTerms();

  return {
    publicFacet: makePegasus(zcf, board, namesByAddress),
  };
};

harden(start);
harden(makePegasus);
export { start, makePegasus };
