/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must act as a membrane, ensuring that only data goes in and out. It's also
 * responsible for turning device affordances into objects that can be used by
 * code in other vats.
 */

import harden from '@agoric/harden';

const vatAdminWrapper = {
  setup: (syscall, state, helpers) => {
    function makePromiseForVat() {
      let res;
      let reject;
      const p = new Promise((rsv, rj) => {
        res = rsv;
        reject = rj;
      });
      return harden({ p, res, reject });
    }

    function build(E, D) {
      const vatIdsToRoots = new Map();

      function createVatAdminService(vatAdminNode) {
        return harden({
          createVat(code) {
            const vatId = D(vatAdminNode).create(code);
            const vatPromise = makePromiseForVat();
            vatIdsToRoots.set(vatId, vatPromise);
            const adminNode = harden({
              terminate() {
                D(vatAdminNode).terminate(vatId);
                // TODO(hibbert): cleanup admin vat data structures
              },
              adminData() {
                return D(vatAdminNode).adminStats(vatId);
              },
            });
            return { adminNode, root: vatPromise.p };
          },
        });
      }

      function newVatCallback(vatId, rootObject) {
        const rootPromise = vatIdsToRoots.get(vatId);
        rootPromise.res(rootObject);
        vatIdsToRoots.set(vatId, rootObject);
      }

      return harden({
        createVatAdminService,
        newVatCallback,
      });
    }

    return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
  },
};

const vatAdminVatSrc = harden({
  setup: `${vatAdminWrapper.setup}`,
});

export { vatAdminVatSrc };
