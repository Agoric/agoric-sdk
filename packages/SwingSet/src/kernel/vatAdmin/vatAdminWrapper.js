/* global harden */

/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import { producePromise } from '@agoric/produce-promise';

function producePRR() {
  const { promise, resolve, reject } = producePromise();
  return [promise, { resolve, reject }];
}

export default function setup(syscall, state, helpers) {
  function build(E, D) {
    const pending = new Map(); // vatID -> { resolve, reject } for promise
    const running = new Map(); // vatID -> { resolve, reject } for doneP

    function createVatAdminService(vatAdminNode) {
      return harden({
        createVat(code) {
          const vatID = D(vatAdminNode).create(code);

          const [promise, pendingRR] = producePRR();
          pending.set(vatID, pendingRR);

          const [doneP, doneRR] = producePRR();
          running.set(vatID, doneRR);

          const adminNode = harden({
            terminate() {
              D(vatAdminNode).terminate(vatID);
              // TODO(hibbert): cleanup admin vat data structures
            },
            adminData() {
              return D(vatAdminNode).adminStats(vatID);
            },
            done() {
              return doneP;
            },
          });
          return promise.then(root => {
            return { adminNode, root };
          });
        },
      });
    }

    // this message is queued to us by createVatDynamically
    function newVatCallback(vatID, results) {
      const { resolve, reject } = pending.get(vatID);
      pending.delete(vatID);
      if (results.rootObject) {
        resolve(results.rootObject);
      } else {
        reject(Error(`Vat Creation Error: ${results.error}`));
      }
    }

    // the kernel sends this when the vat halts
    function vatTerminated(vatID, error) {
      // 'error' is undefined if adminNode.terminate() killed it, else it
      // will be a RangeError from a metering fault
      const { resolve, reject } = running.get(vatID);
      running.delete(vatID);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    return harden({
      createVatAdminService,
      newVatCallback,
      vatTerminated,
    });
  }

  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
