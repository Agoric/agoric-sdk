// @ts-check
import makeStore from '@agoric/store';

import { assert, details } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * @typedef {string} PeerAddress the string representation of an Agoric peer's
 * identity.  For Cosmos, this will be the Agoric account ID, like
 * `agoric16vcjpzjr8uhvwwngyzkpcwe4x0qmnjdu63hc9u`.  For the simulated chain,
 * this will be something like `mySimGCI-client`.
 */

/**
 * @typedef {PeerAddress | Array<PeerAddress>} PeerAddresses one or many peer
 * addresses
 */

const RENDEZVOUS_ALREADY = harden({
  toString() {
    return 'RENDEZVOUS_ALREADY';
  },
});

/**
 * @typedef {Object} RendezvousPrivateService A closely-held service associated
 * with a specific Agoric peer.  It allows you to exchange values (possibly
 * ocaps) with another peer, given a third-party that can exchange the other
 * side's address strings between you.
 *
 * Consider the Agoric chain, A, and two ag-solos attached to the chain: B and
 * C.  Given a Dapp UI, D, that can speak pure data (not ocaps) to both B and C,
 * you have the following architecture:
 *
 * ```
 *             A Agoric chain
 *           // \\
 *  ag-solo B     C ag-solo
 *           \   /
 *             D Dapp UI
 * ```
 * where the double-slashes indicate the ocap connections and the single-slashes
 * indicate the pure data connections.  If B and C are willing, D can get B's
 * rendezvous address, then tell C to initiate a rendezvous to B's address.  C
 * will return its own rendezvous address to D, who then tells B to complete the
 * rendezvous to C's address.
 *
 * The on-chain rendezvous namespace matches the two addresses to each other,
 * sending B's specified object to C and C's specified object to B.  That
 * effectively creates a connection between B and C, exposing only the methods
 * that they choose, and (if the rendezvous addresses are assigned by A and
 * globally unique, such as public keys signing their connection to A),
 * guaranteeing that only B and C have initial access to those objects and that
 * they know D introduced them.
 *
 * A strength of the system is that the rendezvous will fail if B and C are
 * *not* connected to the same chain.  This helps D ensure that B and C have the
 * same specific on-chain services, such as a common Zoe.
 *
 * @property {() => string} getNamespaceName get the name of the rendezvous
 * namespace.  This will typically be the chain identifier, like `testnet-4` for
 * the Agoric testnet, or `mySim` for the simulated chain.  It is not
 * necessarily unique.
 * @property {() => PeerAddress} getLocalAddress get the address string for this
 * private service
 * @property {(peerAddrs: PeerAddresses, sendToPeer: any) => Rendezvous}
 * startRendezvous create a new rendezvous instance for this local address,
 * returning the value from the first matching peerAddress and send it
 * `sendToPeer`
 * @property {(peerAddrs: PeerAddresses, sendToPeer: any) => any}
 * completeRendezvous returns the value sent by the first matching peerAddress
 * and sends `sendToPeer` to that peer, throwing an exception if no peer
 * completed the rendezvous
 */

/**
 * @typedef {Object} Rendezvous
 * @property {() => Promise<any>} getResult return the value sent from our peer
 * @property {() => void} cancel declare that this rendezvous is finished and
 * resolve the result
 */

/**
 * @typedef {Object} PeerRecord
 * @property {(theirResult: any) => void} complete callback when the peer has
 * been matched with the other side
 * @property {any} receivedFrom the value from this peer to be returned to the
 * rendezvousWith call
 */

/**
 * @callback RendezvousPrivateServiceFactory Create a private rendezvous service
 * for a given peer address.
 * @param {PeerAddress} ourAddress a string that must somehow strongly identify
 * the peer that has access to the private service, such as a cryptographic
 * identifier.
 * @returns {RendezvousPrivateService}
 */

/**
 * @param {PeerAddress} peerAddress
 */
const assertPeerAddress = peerAddress => {
  assert.typeof(
    peerAddress,
    'string',
    details`peerAddress ${peerAddress} must be a string`,
  );
};

/**
 * Ensure that there are many peerAddresses.
 *
 * @param {Array<PeerAddress>} peerAddresses
 */
const assertMany = peerAddresses => {
  assert(
    Array.isArray(peerAddresses),
    details`peerAddresses ${peerAddresses} is not an array`,
  );
  peerAddresses.forEach(assertPeerAddress);
};

/**
 * Convert a single string address to a singleton array, or pass through address
 * arrays as is.
 *
 * @param {PeerAddresses} peerAddrs
 * @throws {Error} if not string-only addresses
 */
const getPeerAddresses = peerAddrs => {
  const peerAddresses = typeof peerAddrs === 'string' ? [peerAddrs] : peerAddrs;
  assertMany(peerAddresses);
  return peerAddresses;
};

/**
 * Create a factory for private rendezvous services, all of which are eligible
 * for rendezvous with one another.
 *
 * @param {string} [namespaceName='Agoric'] the name of this rendezvous
 * namespace (doesn't have to be unique)
 * @returns {RendezvousPrivateServiceFactory}
 */
export function makeRendezvousNamespace(namespaceName = 'Agoric') {
  /**
   * @type {Store<string, Store<string, PeerRecord>>}
   */
  const addrToPeerRecordStores = makeStore('localAddress');

  // Return a rendezvous maker.
  return ourAddress => {
    /** @type {RendezvousPrivateService} */
    const service = {
      getNamespaceName() {
        return namespaceName;
      },
      getLocalAddress() {
        return ourAddress;
      },
      startRendezvous(peerAddrs, sendToPeer = undefined) {
        const peerAddresses = getPeerAddresses(peerAddrs);

        let remainingToFind = peerAddresses.length;
        let already = false;
        const resultPK = makePromiseKit();

        /**
         * @type {Array<() => void>}
         */
        const disposals = [];

        const rendezvous = {
          getResult() {
            return resultPK.promise;
          },
          cancel() {
            // We want to mark the rendezvous as failed if not already.
            if (!already) {
              resultPK.reject(
                Error(`Rendezvous with ${peerAddresses} not completed`),
              );
            }
            // Remove any stale references.
            for (const disposal of disposals) {
              disposal();
            }
          },
        };

        for (let i = 0; i < peerAddresses.length; i += 1) {
          const theirAddress = peerAddresses[i];

          /**
           * @type {Store<PeerAddress, PeerRecord>}
           */
          let addrToPeerRecord;
          if (addrToPeerRecordStores.has(theirAddress)) {
            addrToPeerRecord = addrToPeerRecordStores.get(theirAddress);
          } else {
            addrToPeerRecord = makeStore('localAddress');
            addrToPeerRecordStores.init(theirAddress, addrToPeerRecord);
          }

          const complete = obj => {
            remainingToFind -= 1;
            // Try resolving the result if we're the first match for this rendezvous.
            if (obj !== RENDEZVOUS_ALREADY) {
              already = true;
              resultPK.resolve(obj);
            }
            if (remainingToFind === 0) {
              // We're done!
              rendezvous.cancel();
            }
          };
          const peerRecord = harden({
            complete,
            receivedFrom: sendToPeer,
          });
          if (addrToPeerRecord.has(ourAddress)) {
            addrToPeerRecord.set(ourAddress, peerRecord);
          } else {
            addrToPeerRecord.init(ourAddress, peerRecord);
          }
          disposals.push(() => {
            if (
              addrToPeerRecord.has(ourAddress) &&
              addrToPeerRecord.get(ourAddress) === peerRecord
            ) {
              // Remove the record for us.
              addrToPeerRecord.delete(ourAddress);
            }
          });
        }

        return harden(rendezvous);
      },
      completeRendezvous(peerAddrs, sendToPeer = undefined) {
        const peerAddresses = getPeerAddresses(peerAddrs);

        let already = false;
        let returned;

        // Look up all the records shared between us and the remote address.
        assert(
          addrToPeerRecordStores.has(ourAddress),
          details`Rendezvous with ${peerAddrs} not completed`,
        );
        const addrToPeerRecord = addrToPeerRecordStores.get(ourAddress);

        // Try the addresses in preference order.
        for (const theirAddress of peerAddresses) {
          if (addrToPeerRecord.has(theirAddress)) {
            const {
              complete,
              receivedFrom: receivedFromThem,
            } = addrToPeerRecord.get(theirAddress);

            if (already) {
              // Tell them we already completed the rendezvous.
              complete(RENDEZVOUS_ALREADY);
            } else {
              // Send them our object.
              already = true;
              complete(sendToPeer);
              returned = receivedFromThem;
            }
          }
        }
        assert(already, details`Rendezvous with ${peerAddrs} not completed`);
        return returned;
      },
    };
    return harden(service);
  };
}
