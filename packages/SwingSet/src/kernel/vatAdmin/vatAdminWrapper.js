/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import harden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';

export default function setup(syscall, state, helpers) {
  function build(E, D) {
    const pending = new Map();

    function createVatAdminService(vatAdminNode) {
      return harden({
        createVat(code) {
          const vatID = D(vatAdminNode).create(code);
          const { promise, resolve, reject } = producePromise();
          pending.set(vatID, { resolve, reject });
          const adminNode = harden({
            terminate() {
              D(vatAdminNode).terminate(vatID);
              // TODO(hibbert): cleanup admin vat data structures
            },
            adminData() {
              return D(vatAdminNode).adminStats(vatID);
            },
          });
          return promise.then(root => {
            return { adminNode, root };
          });
        },
      });
    }

    // this message is queued to us by createVatDynamically
    function newVatCallback(vatId, results) {
      const { resolve, reject } = pending.get(vatId);
      pending.delete(vatId);
      if (results.rootObject) {
        resolve(results.rootObject);
      } else {
        reject(Error(`Vat Creation Error: ${results.error}`));
      }
    }

    return harden({
      createVatAdminService,
      newVatCallback,
    });
  }

  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
