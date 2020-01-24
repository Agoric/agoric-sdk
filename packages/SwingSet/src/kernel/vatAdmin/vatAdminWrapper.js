/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
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
    const vatIdsToResolvers = new Map();

    function createVatAdminService(vatAdminNode) {
      return harden({
        createVat(code) {
          const result = D(vatAdminNode).create(code);
          if (result.error) {
            throw Error(`Vat Creation Error: ${result.error}`);
          } else {
            const vatPromise = makePromiseForVat();
            const vatId = result.ok;
            vatIdsToResolvers.set(vatId, vatPromise.res);
            const adminNode = harden({
              terminate() {
                D(vatAdminNode).terminate(vatId);
                // TODO(hibbert): cleanup admin vat data structures
              },
              adminData() {
                return D(vatAdminNode).adminStats(vatId);
              },
            });
            return vatPromise.p.then(root => {
              return { adminNode, root };
            });
          }
        },
      });
    }

    function newVatCallback(vatId, rootObject) {
      const rootResolver = vatIdsToResolvers.get(vatId);
      rootResolver(rootObject);
      vatIdsToResolvers.set(vatId, rootObject);
    }

    return harden({
      createVatAdminService,
      newVatCallback,
    });
  }

  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
