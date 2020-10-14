// @ts-check
import makeStore from '@agoric/store';
import { makeNotifierKit } from '@agoric/notifier';

import '@agoric/notifier/exports';
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

/**
 * @typedef {string} PeerAddress the string representation of an Agoric peer's
 * identity.  For Cosmos, this will be the Agoric account ID, like
 * `agoric16vcjpzjr8uhvwwngyzkpcwe4x0qmnjdu63hc9u`.  For the simulated chain,
 * this will be something like `mySimGCI-client`.
 */

/**
 * @typedef {Record<PeerAddress, any>} RendezvousResults a record that maps a
 * peer's address to the value it sent (possibly `undefined`).
 */

/**
 * @typedef {Object} RendezvousPrivateService A closely-held service associated
 * with a specific Agoric peer.  It allows you to exchange values (possibly
 * ocaps) with another peer, given a third-party that can exchange the other
 * side's address strings between you.
 * @property {() => string} getNamespaceName get the name of the rendezvous
 * namespace.  This will typically be the chain identifier, like `testnet-4` for
 * the Agoric testnet, or `mySim` for the simulated chain.  It is not
 * necessarily unique.
 * @property {() => PeerAddress} getLocalAddress get the address string for this
 * private service
 * @property {(peerAddress: PeerAddress, sendToPeer: any) => Rendezvous}
 * startRendezvous create a new rendezvous instance for this local address,
 * sending `sendToPeer`
 * @property {(peerAddresses: Array<PeerAddress>, sendToPeerArray: Array<any> |
 * undefined) => RendezvousMany} startRendezvousMany create a new rendezvous
 * instance for this local address, sending `sendToPeerArray[i]` to each matched
 * `peerAddresses[i]`.  The default `sendToPeer` value causes `undefined` to be
 * sent.
 * @property {(peerAddress: PeerAddress, sendToPeer: any) => any} rendezvousWith
 * receive an object from peerAddress, throwing an exception if the peer did not
 * rendezvous correctly
 * @property {(peerAddresses: Array<PeerAddress>, sendToPeerArray: Array<any> |
 * undefined) => RendezvousResults} rendezvousWithMany synchronously check if
 * any of the `peerAddresses` match an existing rendezvous with our local address.
 * Return a record with keys of the matching `peerAddresses`, and values sent from
 * those peers (possibly undefined).
 */

/**
 * @typedef {Object} Rendezvous
 * @property {() => Promise<any>} getResult return the value sent from our peer
 * @property {() => void} cancel declare that this rendezvous is finished and
 * resolve the result
 */

/**
 * @typedef {Object} RendezvousMany a per-attempt controller held by the
 * rendezvous initiator
 * @property {() => Notifier<RendezvousResults>} getNotifier notify
 * the current collection of peer addresses matched with values
 * @property {() => void} cancel declare that this rendezvous is
 * finished.  The notifier will be finished with the latest RendezvousResults.
 */

/**
 * @typedef {Object} PeerRecord
 * @property {(theirResult: any) => void} sendTo callback when the peer has
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
 * Ensure the arguments to startRendezvous and rendezvousWith are legitimate.
 *
 * @param {Array<string>} peerAddresses
 * @param {Array<any>} sendToPeerArray
 */
const assertManyArgs = (peerAddresses, sendToPeerArray) => {
  assert(
    Array.isArray(peerAddresses),
    details`peerAddresses ${peerAddresses} is not an array`,
  );
  peerAddresses.forEach(assertPeerAddress);
  assert(
    Array.isArray(sendToPeerArray),
    details`sendToPeerArray ${sendToPeerArray} is not an array`,
  );
};

/**
 *
 * @param {PeerAddress} peerAddress
 * @param {RendezvousResults} results
 */
const getSingleResult = (peerAddress, results) => {
  const entries = Object.entries(results);

  assert(
    entries.length !== 0,
    details`Rendezvous with ${peerAddress} not completed`,
  );
  assert.equal(
    entries.length,
    1,
    details`Must have only one result, not ${results}`,
  );
  const [theirAddress, receivedFromThem] = entries[0];
  assert.equal(
    theirAddress,
    peerAddress,
    details`Returned address ${theirAddress} does not match ${peerAddress}`,
  );

  return receivedFromThem;
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
      startRendezvous(peerAddress, sendToPeer = undefined) {
        assertPeerAddress(peerAddress);
        const rendezvousMany = service.startRendezvousMany(
          [peerAddress],
          [sendToPeer],
        );
        const makeResult = async () => {
          const { updateCount, value } = await E(
            E(rendezvousMany).getNotifier(),
          ).getUpdateSince();
          assert.typeof(
            updateCount,
            'undefined',
            details`Notifier did not finish when expected`,
          );
          return getSingleResult(peerAddress, value);
        };
        const resultP = makeResult();
        const rendezvous = {
          cancel: rendezvousMany.cancel,
          getResult() {
            return resultP;
          },
        };
        return harden(rendezvous);
      },
      startRendezvousMany(peerAddresses, sendToPeerArray = []) {
        assertManyArgs(peerAddresses, sendToPeerArray);

        /**
         * @type {Record<PeerAddress, any>}
         */
        const matchedState = {};
        let remainingToFind = peerAddresses.length;

        /**
         * @type {NotifierRecord<RendezvousResults>}
         */
        const { updater, notifier } = makeNotifierKit();

        /**
         * @type {Array<() => void>}
         */
        const disposals = [];

        const rendezvousMany = {
          getNotifier() {
            return notifier;
          },
          cancel() {
            // We want to mark the rendezvous as complete.
            updater.finish(harden({ ...matchedState }));
            // Remove any stale references.
            for (const disposal of disposals) {
              disposal();
            }
          },
        };

        for (let i = 0; i < peerAddresses.length; i += 1) {
          const sentFromUs = sendToPeerArray[i];
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

          const sendToUs = obj => {
            remainingToFind -= 1;
            matchedState[theirAddress] = obj;
            if (remainingToFind === 0) {
              // We're done!
              rendezvousMany.cancel();
            } else {
              // We need to keep going, but report the address.
              updater.updateState(harden({ ...matchedState }));
            }
          };
          const peerRecord = harden({
            sendTo: sendToUs,
            receivedFrom: sentFromUs,
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

        return harden(rendezvousMany);
      },
      rendezvousWith(peerAddress, sendToPeer = undefined) {
        assertPeerAddress(peerAddress);
        const results = service.rendezvousWithMany([peerAddress], [sendToPeer]);
        return getSingleResult(peerAddress, results);
      },
      rendezvousWithMany(peerAddresses, sendToPeer = []) {
        assertManyArgs(peerAddresses, sendToPeer);

        /**
         * @type {RendezvousResults}
         */
        const rendezvousResults = {};
        // Look up all the records shared between us and the remote address.
        const addrToPeerRecord = addrToPeerRecordStores.get(ourAddress);
        for (let i = 0; i < peerAddresses.length; i += 1) {
          const sentFromUs = sendToPeer[i];
          const theirAddress = peerAddresses[i];
          if (addrToPeerRecord.has(theirAddress)) {
            const {
              sendTo: sendToThem,
              receivedFrom: receivedFromThem,
            } = addrToPeerRecord.get(theirAddress);

            // Exchange the values.
            sendToThem(sentFromUs);
            rendezvousResults[theirAddress] = receivedFromThem;
          }
        }
        return harden(rendezvousResults);
      },
    };
    return harden(service);
  };
}
