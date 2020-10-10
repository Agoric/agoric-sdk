// @ts-check

import {
  makeStore,
  makeWeakStore,
  makeHydrateExternalStoreMaker,
} from '@agoric/store';

// TODO: Give this parameters so that it can interact with the vat's liveslots
// and send syscalls for actual external stores.
export function makeVatExternalStoreMaker(vatId) {
  /** @type {Store<number, HydrateStore>} */
  const storeIdToHstore = makeStore(`vat ${vatId} storeId`);
  // console.warn('making external store');
  return makeHydrateExternalStoreMaker(_hydrateHook => ({
    getHydrateStore(storeId) {
      // TODO: Load the hydrate store instance for VATID.STOREID.
      return storeIdToHstore.get(storeId);
    },
    makeHydrateStore(storeId, instanceKind) {
      // console.warn(`makeHydrateStore for ${instanceKind}`);
      // TODO: Use the vat-specific store instead of an in-memory store.
      const store = makeStore(`${instanceKind} ids`);
      /** @type {HydrateStore} */
      const hstore = {
        get(instanceId) {
          // TODO: Fetch and deserialize the VAT.STOREID.INSTANCEID closure data.
          const data = store.get(instanceId);

          // Note that we prevent a memory leak here.  We rely on the fact that
          // unless we call a `hydrateHook` method, there is exactly one `get`
          // per id.
          store.delete(instanceId);
          return data;
        },
        init(instanceId, data) {
          // TODO: Serialize and save the VAT.STOREID.INSTANCEID closure data.
          return store.init(instanceId, data);
        },
        set(_instanceId, _data) {
          // TODO: Mark the instanceId as dirty, then at the end of the crank,
          // serialize the closure data, and save as VAT.STOREID.INSTANCEID.
          //
          // We don't ever page out data, so this set is a no-op.
        },
        makeWeakStore() {
          // TODO: Create a WeakStore that accepts only instances as a key.
          return makeWeakStore(`vat ${vatId} ${instanceKind}`);
        },
      };
      storeIdToHstore.init(storeId, hstore);
      return harden(hstore);
    },
  }));
}
