/**
 * @import {MapStore, SetStore, WeakMapStore, WeakSetStore} from '@agoric/store';
 */

/**
 * @template [K=any]
 * @template [V=never]
 * @typedef {object} Store
 * @property {(key: K) => void} add
 * @property {(key: K) => void} delete
 * @property {(key: K) => V | undefined} get
 * @property {(key: K) => boolean} has
 * @property {(key: K, value: V) => void} set
 * @property {(key: K) => void} mustAdd
 * @property {(key: K) => void} mustDelete
 * @property {(key: K) => V} mustGet
 * @property {(key: K, value: V) => void} mustInit
 * @property {(key: K, value: V) => void} mustSet
 */

/**
 * @param {'strict' | 'lax'} [mode='strict']
 */
export const makeStoreWrapper =
  (mode = 'strict') =>
  /**
   * @template K, V
   * @overload
   * @param {MapStore<K, V>} store
   * @returns {Map<K, V> & Pick<Store<K, V>, 'mustDelete' | 'mustGet' | 'mustInit' | 'mustSet'>}
   */
  /**
   * @template K
   * @overload
   * @param {SetStore<K>} store
   * @returns {Set<K> & Pick<Store<K>, 'mustAdd' | 'mustDelete'>}
   */
  /**
   * @template K, V
   * @overload
   * @param {WeakMapStore<K, V>} store
   * @returns {WeakMap<K, V> & Pick<Store<K, V>, 'mustDelete' | 'mustGet' | 'mustInit' | 'mustSet'>}
   */
  /**
   * @template K
   * @overload
   * @param {WeakSetStore<K>} store
   * @returns {WeakSet<K> & Pick<Store<K>, 'mustAdd' | 'mustDelete'>}
   */
  /**
   * @template K
   * @template [V=never]
   * @param {MapStore<K, V> | SetStore<K> | WeakMapStore<K, V> | WeakSetStore<K>} store
   */
  store => {
    const {
      add,
      delete: del,
      get,
      has,
      init,
      set,
    } = /** @type {MapStore<K, V> & SetStore<K>} */ (store);
    assert(del);
    assert(has);

    /** @type {Omit<Store<K, V>, 'mustAdd' | 'mustDelete' | 'mustInit' |'mustSet'>} */
    const maybe = {
      add(key) {
        has(key) || add(key);
      },
      delete(key) {
        has(key) && del(key);
      },
      get(key) {
        if (has(key)) {
          return get(key);
        }
        return undefined;
      },
      has,
      set(key, value) {
        if (has(key)) {
          set(key, value);
        } else {
          init(key, value);
        }
      },
      mustGet(key) {
        return get(key);
      },
    };

    /** @param {Store<K, V>} methods */
    const cull = ({
      add: a,
      get: g,
      set: s,
      mustAdd,
      mustGet,
      mustInit,
      mustSet,
      ...core
    }) => ({
      ...core,
      ...('add' in store ? { add: a, mustAdd } : {}),
      ...('get' in store ? { get: g, mustGet } : {}),
      ...('init' in store ? { mustInit } : {}),
      ...('set' in store ? { set: s, mustSet } : {}),
    });

    if (mode === 'lax') {
      /** @type {Store<K, V>} */
      const laxStore = {
        ...maybe,
        mustAdd: maybe.add,
        mustDelete: maybe.delete,
        mustInit: maybe.set,
        mustSet: maybe.set,
      };
      return cull(laxStore);
    }

    /** @type {Store<K, V>} */
    const strictStore = {
      ...maybe,
      mustAdd(key) {
        return add(key);
      },
      mustDelete(key) {
        return del(key);
      },
      mustInit(key, value) {
        return init(key, value);
      },
      mustSet(key, value) {
        return set(key, value);
      },
    };
    return cull(strictStore);
  };
