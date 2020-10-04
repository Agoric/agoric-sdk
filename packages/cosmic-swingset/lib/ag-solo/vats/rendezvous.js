// @ts-check
import makeStore from '@agoric/store';
import { makeNotifierKit } from '@agoric/notifier';

/**
 * @typedef {Object} PeerRecord
 * @property {(result: any) => void} found
 * @property {any} result
 */

/**
 * Create a factory for makeRendezvous to revolve around.
 */
export function makeRendezvousMaker() {
  /**
   * @type {Store<string, Store<string, PeerRecord>>}
   */
  const addrToPeerRecordsStores = makeStore('localAddress');

  // Return a rendezvous maker.
  return addr =>
    harden({
      getLocalAddress() {
        // We let people know who they are.
        return addr;
      },
      /**
       * Start a rendezvous process.
       *
       * @param {Record<string, any>} remoteAddressToResult
       */
      initiateRendezvous(remoteAddressToResult) {
        /**
         * @type {Record<string, any>}
         */
        const foundState = {};
        let remainingToFind = 0;

        /**
         * @type {NotifierRecord<Record<string, any>>}
         */
        const foundNotifier = makeNotifierKit();

        /**
         * @type {Array<() => void>}
         */
        const disposals = [];

        const completer = {
          complete() {
            // We want to mark the rendezvous as complete.
            foundNotifier.updater.finish(harden({ ...foundState }));
            // Remove any stale references.
            for (const disposal of disposals) {
              disposal();
            }
          },
        };

        for (const [remoteAddr, result] of Object.entries(
          remoteAddressToResult,
        )) {
          remainingToFind += 1;

          /**
           * @type {Store<string, PeerRecord>}
           */
          let addrToPeerRecord;
          if (addrToPeerRecordsStores.has(remoteAddr)) {
            addrToPeerRecord = addrToPeerRecordsStores.get(remoteAddr);
          } else {
            addrToPeerRecord = makeStore('localAddr');
            addrToPeerRecordsStores.init(remoteAddr, addrToPeerRecord);
          }

          const found = obj => {
            remainingToFind -= 1;
            foundState[remoteAddr] = obj;
            if (remainingToFind === 0) {
              // We're done!
              completer.complete();
            } else {
              // We need to keep going.
              foundNotifier.updater.updateState(harden({ ...foundState }));
            }
          };
          const peerRecord = harden({
            found,
            result,
          });
          if (addrToPeerRecord.has(addr)) {
            addrToPeerRecord.set(addr, peerRecord);
          } else {
            addrToPeerRecord.init(addr, peerRecord);
          }
          disposals.push(() => {
            if (
              addrToPeerRecord.has(addr) &&
              addrToPeerRecord.get(addr) === peerRecord
            ) {
              // Remove the record for us.
              addrToPeerRecord.delete(addr);
            }
          });
        }

        return harden({ notifier: foundNotifier.notifier, completer });
      },
      /**
       * Complete a rendezvous with multiple remote addresses.
       *
       * @param {Record<string, any>} remoteAddressToResult
       * @returns {Record<string, Array<any>>}
       */
      rendezvousWith(remoteAddressToResult) {
        /**
         * @type {Record<string, Array<any>>}
         */
        const resultsByAddress = {};
        // Look up all the records associated with us and the remote address.
        const addrToPeerRecord = addrToPeerRecordsStores.get(addr);
        for (const [remoteAddr, obj] of Object.entries(remoteAddressToResult)) {
          if (addrToPeerRecord.has(remoteAddr)) {
            const { found, result } = addrToPeerRecord.get(remoteAddr);
            found(obj);
            resultsByAddress[remoteAddr] = result;
          }
        }
        return harden(resultsByAddress);
      },
    });
}
