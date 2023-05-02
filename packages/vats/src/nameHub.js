// @ts-check

import { assert } from '@agoric/assert';
import { E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { heapZone } from '@agoric/zone/heap.js';
import { makeLegacyMap, M } from '@agoric/store';

import './types.js';

const { keys } = Object;
const { Fail } = assert;

const KeyShape = M.string();
const PathShape = M.arrayOf(KeyShape);

// XXX how to extend exo objects?
const AdminAux = /** @type {const} */ ({
  getMyAddress: M.call().returns(M.or(M.string(), M.undefined())),
});
harden(AdminAux);

const NameHubIKit = harden({
  nameHub: M.interface('NameHub', {
    has: M.call(KeyShape).returns(M.boolean()),
    lookup: M.call().rest(PathShape).returns(M.promise()),
    entries: M.call().returns(M.arrayOf(M.array())),
    values: M.call().returns(M.array()),
    keys: M.call().returns(M.arrayOf(KeyShape)),
  }),
  nameAdmin: M.interface('NameAdmin', {
    ...AdminAux,
    provideChild: M.callWhen(KeyShape)
      .optional(M.arrayOf(M.string()))
      .rest(M.any())
      .returns({ nameHub: M.remotable(), nameAdmin: M.remotable() }),
    reserve: M.call(KeyShape).returns(M.promise()),
    default: M.callWhen(KeyShape)
      .optional(M.await(M.any()), M.await(M.remotable()))
      .returns(M.any()),
    set: M.callWhen(KeyShape, M.await(M.any()))
      .optional(M.await(M.remotable()))
      .returns(M.undefined()),
    onUpdate: M.call(M.remotable()).returns(M.undefined()),
    update: M.callWhen(KeyShape, M.await(M.any()))
      .optional(M.await(M.remotable('newAdminValue')))
      .returns(M.undefined()),
    lookupAdmin: M.call(KeyShape).returns(M.promise()),
    delete: M.call(KeyShape).returns(M.promise()),
    readonly: M.call().returns(M.remotable()),
  }),
});

/**
 * @template {{}} K
 * @template V
 * @param {WeakMap<K, V>} store
 * @param {K} key
 * @param {(k: K) => V} make
 */
const provideWeak = (store, key, make) => {
  if (store.has(key)) {
    return store.get(key) || assert.fail();
  }

  const it = make(key);
  store.set(key, it);
  return it;
};

/**
 * Make two facets of a node in a name hierarchy: the nameHub
 * is read access and the nameAdmin is write access.
 *
 * @param {import('@agoric/zone').Zone} [zone]
 */
export const prepareNameHubKit = (zone = heapZone) => {
  const updated = (updateCallback, hub) => {
    if (!updateCallback) {
      return;
    }
    void E(updateCallback).write(hub.entries(false));
  };

  const init1 = () => ({
    /** @type {LegacyMap<string, PromiseKit<unknown>>} */
    // Legacy because a promiseKit is not a passable
    keyToPK: makeLegacyMap('nameKey'),
    /** @type {LegacyMap<string, PromiseKit<unknown>>} */
    // Legacy because a promiseKit is not a passable
    keyToAdminPK: makeLegacyMap('nameKey'),
  });
  /** @type {WeakMap<any, ReturnType<init1>>} */
  const ephemera = new WeakMap();
  /** @param {{}} me */
  const my = me => provideWeak(ephemera, me, init1);

  // XXX why did zone.exoClassKit() lose its type?
  /** @type {(...aux: unknown[]) => import('./types').NameHubKit } */
  const makeNameHub = zone.exoClassKit(
    'NameHubKit',
    NameHubIKit,
    /** @param {unknown[]} auxProperties */
    (...auxProperties) => ({
      /** @type {MapStore<string, unknown>} */
      keyToValue: zone.detached().mapStore('nameKey'),

      /** @type {MapStore<string, import('./types').NameAdmin>} */
      keyToAdmin: zone.detached().mapStore('nameKey'),

      /** @type {undefined | { write: (item: unknown) => void }} */
      updateCallback: undefined,

      auxProperties: harden(auxProperties),
    }),
    {
      /** @type {NameHub} */
      nameHub: {
        has(key) {
          const { keyToValue } = this.state;
          const { keyToPK } = my(this.facets.nameHub);
          return keyToValue.has(key) || keyToPK.has(key);
        },
        async lookup(...path) {
          if (path.length === 0) {
            const { nameHub } = this.facets;
            return nameHub;
          }
          const { keyToValue } = this.state;
          const { keyToPK } = my(this.facets.nameHub);
          const [first, ...remaining] = path;
          /** @type {any} */
          const firstValue = keyToValue.has(first)
            ? keyToValue.get(first)
            : keyToPK.get(first).promise; // or throw
          if (remaining.length === 0) {
            return firstValue;
          }
          return E(firstValue).lookup(...remaining);
        },
        entries(includeReserved = true) {
          const { keyToValue } = this.state;
          if (!includeReserved) {
            return harden([...keyToValue.entries()]);
          }
          const { keyToPK } = my(this.facets.nameHub);
          // keys of keyToValue and keyToPK are disjoint
          const out = harden([
            ...keyToValue.entries(),
            ...[...keyToPK.entries()].map(
              ([k, kit]) =>
                /** @type {[string, ERef<unknown>]} */ ([k, kit.promise]),
            ),
          ]);
          return out;
        },
        values() {
          const { nameHub } = this.facets;
          return nameHub.entries().map(([_k, v]) => v);
        },
        keys() {
          const { nameHub } = this.facets;
          return nameHub.entries().map(([k, _v]) => k);
        },
      },
      /** @type {import('./types').MyAddressNameAdmin} */
      nameAdmin: {
        // XXX how to extend exo objects?
        getMyAddress() {
          const addr = this.state.auxProperties[0];
          assert.typeof(addr, 'string');
          return addr;
        },
        async provideChild(key, reserved = [], ...aux) {
          const { nameAdmin } = this.facets;
          const { keyToAdmin, keyToValue } = this.state;
          if (keyToAdmin.has(key)) {
            const childAdmin = keyToAdmin.get(key);
            /** @type {NameHub} */
            // @ts-expect-error if an admin is present, it should be a namehub
            const childHub = keyToValue.get(key);
            return { nameHub: childHub, nameAdmin: childAdmin };
          }
          const child = makeNameHub(...aux);
          await Promise.all(reserved.map(k => child.nameAdmin.reserve(k)));
          await nameAdmin.update(key, child.nameHub, child.nameAdmin);
          return child;
        },
        async reserve(key) {
          const { keyToPK, keyToAdminPK } = my(this.facets.nameHub);
          const { keyToValue, keyToAdmin } = this.state;
          if (keyToValue.has(key)) {
            return;
          }
          if (!keyToAdminPK.has(key)) {
            const pk = makePromiseKit();
            keyToAdminPK.init(key, pk);
            pk.promise.then(
              v => {
                keyToAdmin.init(key, v);
                keyToAdminPK.delete(key);
              },
              () => {}, // ignore rejections
            );
          }
          if (!keyToPK.has(key)) {
            const pk = makePromiseKit();
            keyToPK.init(key, pk);
            pk.promise.then(
              v => {
                keyToValue.init(key, v);
                keyToPK.delete(key);
              },
              () => {}, // ignore rejections
            );
          }
        },
        async default(key, newValue, adminValue) {
          const { nameHub, nameAdmin } = this.facets;
          if (nameHub.has(key)) {
            const { keyToValue } = this.state;

            if (keyToValue.has(key)) {
              // Already initalized.
              return /** @type {any} */ (keyToValue.get(key));
            }
          }
          await nameAdmin.update(key, newValue, adminValue);
          return newValue;
        },
        async set(key, newValue, adminValue) {
          const { keyToValue } = this.state;
          keyToValue.has(key) || Fail`key ${key} is not already initialized`;

          const { nameAdmin } = this.facets;
          nameAdmin.update(key, newValue, adminValue);
        },
        onUpdate(fn) {
          const { state } = this;
          if (state.updateCallback) {
            assert(!fn, 'updateCallback accidentally reassigned?');
          }
          state.updateCallback = fn;
        },
        async update(key, newValue, adminValue) {
          const { keyToPK, keyToAdminPK } = my(this.facets.nameHub);
          const { keyToValue, keyToAdmin, updateCallback } = this.state;

          /** @type {[LegacyMap<string, PromiseKit<unknown>>, MapStore<string, unknown>, unknown][]} */
          const valueMapEntries = [
            [keyToAdminPK, keyToAdmin, adminValue],
            [keyToPK, keyToValue, newValue],
          ];
          for (const [pmap, vmap, value] of valueMapEntries) {
            if (pmap.has(key)) {
              const old = pmap.get(key);
              old.resolve(value);
            } else if (vmap.has(key)) {
              vmap.set(key, value);
            } else {
              vmap.init(key, value);
            }
          }

          const { nameHub } = this.facets;
          updated(updateCallback, nameHub);
        },
        async lookupAdmin(...path) {
          const { nameAdmin } = this.facets;
          if (path.length === 0) {
            return nameAdmin;
          }

          const { keyToAdmin } = this.state;
          const { keyToAdminPK } = my(this.facets.nameHub);
          const [first, ...remaining] = path;

          /** @type {any} */
          const firstValue = keyToAdmin.has(first)
            ? keyToAdmin.get(first)
            : keyToAdminPK.get(first).promise;

          if (remaining.length === 0) {
            return firstValue;
          }
          return E(firstValue).lookupAdmin(...remaining);
        },
        async delete(key) {
          const { keyToPK, keyToAdminPK } = my(this.facets.nameHub);
          const { keyToValue, keyToAdmin, updateCallback } = this.state;
          for (const pmap of [keyToAdminPK, keyToPK]) {
            if (pmap.has(key)) {
              // Reject only if already exists.
              const old = pmap.get(key);
              old.reject(Error(`Value has been deleted`));
              // Silence unhandled rejections.
              void old.promise.catch(_ => {});
            }
          }
          for (const map of [keyToValue, keyToAdmin, keyToPK, keyToAdminPK]) {
            if (map.has(key)) {
              map.delete(key);
            }
          }
          const { nameHub } = this.facets;
          updated(updateCallback, nameHub);
        },
        readonly() {
          const { nameHub } = this.facets;
          return nameHub;
        },
      },
    },
  );

  return makeNameHub;
};

/**
 * Make two facets of a node in a name hierarchy: the nameHub
 * is read access and the nameAdmin is write access.
 *
 * @returns {import('./types.js').NameHubKit}
 */
export const makeNameHubKit = prepareNameHubKit();
