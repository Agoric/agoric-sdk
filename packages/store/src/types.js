/// <reference types="ses" />

// Ensure this is a module.
export {};

/**
 * Note TODO https://github.com/endojs/endo/issues/1488
 *
 * @import {Passable, RemotableObject} from '@endo/pass-style'
 * @import {CopySet, CopyMap, Pattern} from '@endo/patterns'
 * @import {Key} from '@endo/patterns'
 */

/**
 * @typedef {object} StoreOptions Of the dimensions on which KeyedStores can
 *   differ, we only represent a few of them as standard options. A given store
 *   maker should document which options it supports, as well as its positions
 *   on dimensions for which it does not support options.
 * @property {boolean} [longLived] Which way to optimize a weak store. True
 *   means that we expect this weak store to outlive most of its keys, in which
 *   case we internally may use a JavaScript `WeakMap`. Otherwise we internally
 *   may use a JavaScript `Map`. Defaults to true, so please mark short lived
 *   stores explicitly.
 * @property {boolean} [durable] The contents of this store survive termination
 *   of its containing process, allowing for restart or upgrade but at the cost
 *   of forbidding storage of references to ephemeral data. Defaults to false.
 * @property {boolean} [fakeDurable] This store pretends to be a durable store
 *   but does not enforce that the things stored in it actually be themselves
 *   durable (whereas an actual durable store would forbid storage of such
 *   items). This is in service of allowing incremental transition to use of
 *   durable stores, to enable normal operation and testing when some stuff
 *   intended to eventually be durable has not yet been made durable. A store
 *   marked as fakeDurable will appear to operate normally but any attempt to
 *   upgrade its containing vat will fail with an error. Defaults to false.
 * @property {Pattern} [keyShape]
 * @property {Pattern} [valueShape]
 */

/**
 * Most store methods are in one of three categories
 *
 * - lookup methods (`has`,`get`)
 * - update methods (`add`,`init`,`set`,`delete`,`addAll`)
 * - query methods (`snapshot`,`keys`,`values`,`entries`,`getSize`)
 * - query-update methods (`clear`)
 *
 * WeakStores have the lookup and update methods but not the query or
 * query-update methods. Non-weak Stores are like their corresponding
 * WeakStores, but with the additional query and query-update methods.
 */

// TODO use Key for K
/**
 * @template K
 * @typedef {object} WeakSetStoreMethods
 * @property {(key: K) => boolean} has Check if a key exists. The key can be any
 *   JavaScript value, though the answer will always be false for keys that
 *   cannot be found in this store.
 * @property {(key: K) => void} add Add the key to the set if it is not already
 *   there. Do nothing silently if already there. The key must be one allowed by
 *   this store. For example a scalar store only allows primitives and
 *   remotables.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 * @property {(keys: CopySet<any> | Iterable<K>) => void} addAll
 */
/**
 * @template K
 * @typedef {RemotableObject & WeakSetStoreMethods<K>} WeakSetStore
 */

// TODO use Key for K
/**
 * @template K
 * @typedef {object} SetStoreMethods
 * @property {(key: K) => boolean} has Check if a key exists. The key can be any
 *   JavaScript value, though the answer will always be false for keys that
 *   cannot be found in this store.
 * @property {(key: K) => void} add Add the key to the set if it is not already
 *   there. Do nothing silently if already there. The key must be one allowed by
 *   this store. For example a scalar store only allows primitives and
 *   remotables.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 * @property {(keys: CopySet<any> | Iterable<K>) => void} addAll
 * @property {(keyPatt?: Pattern) => Iterable<K>} keys
 * @property {(keyPatt?: Pattern) => Iterable<K>} values
 * @property {(keyPatt?: Pattern) => CopySet<any>} snapshot
 * @property {(keyPatt?: Pattern) => number} getSize
 * @property {(keyPatt?: Pattern) => void} clear
 */
/**
 * @template K
 * @typedef {RemotableObject & SetStoreMethods<K>} SetStore
 */

// TODO use Key for K
// TODO use Passable for V
/**
 * @template K
 * @template V
 * @typedef {object} WeakMapStore
 * @property {(key: K) => boolean} has Check if a key exists. The key can be any
 *   JavaScript value, though the answer will always be false for keys that
 *   cannot be found in this store.
 * @property {(key: K) => V} get Return a value for the key. Throws if not
 *   found.
 * @property {(key: K, value: V) => void} init Initialize the key only if it
 *   doesn't already exist. The key must be one allowed by this store. For
 *   example a scalar store only allows primitives and remotables.
 * @property {(key: K, value: V) => void} set Set the key. Throws if not found.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 * @property {(entries: CopyMap<any, any> | Iterable<[K, V]>) => void} addAll
 */

// TODO use Key for K
// TODO use Passable for V
/**
 * @template K
 * @template V
 * @typedef {object} MapStoreMethods
 * @property {(key: K) => boolean} has Check if a key exists. The key can be any
 *   JavaScript value, though the answer will always be false for keys that
 *   cannot be found in this map
 * @property {(key: K) => V} get Return a value for the key. Throws if not
 *   found.
 * @property {(key: K, value: V) => void} init Initialize the key only if it
 *   doesn't already exist. The key must be one allowed by this store. For
 *   example a scalar store only allows primitives and remotables.
 * @property {(key: K, value: V) => void} set Set the key. Throws if not found.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 * @property {(entries: CopyMap<any, Passable> | Iterable<[K, V]>) => void} addAll
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => Iterable<K>} keys
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => Iterable<V>} values
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => Iterable<[K, V]>} entries
 * @property {(
 *   keyPatt?: Pattern,
 *   valuePatt?: Pattern,
 * ) => CopyMap<any, Passable>} snapshot
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => number} getSize
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => void} clear
 */
/**
 * @template [K=any]
 * @template [V=any]
 * @typedef {RemotableObject & MapStoreMethods<K, V>} MapStore
 */

// ///////////////////////// Deprecated Legacy /////////////////////////////////

/**
 * @template K
 * @template V
 * @typedef {object} LegacyWeakMap LegacyWeakMap is deprecated. Use WeakMapStore
 *   instead if possible.
 * @property {(key: K) => boolean} has Check if a key exists
 * @property {(key: K) => V} get Return a value for the key. Throws if not
 *   found.
 * @property {(key: K, value: V) => void} init Initialize the key only if it
 *   doesn't already exist
 * @property {(key: K, value: V) => void} set Set the key. Throws if not found.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 */

/**
 * @template K
 * @template V
 * @typedef {object} LegacyMap LegacyMap is deprecated. Use MapStore instead if
 *   possible.
 * @property {(key: K) => boolean} has Check if a key exists
 * @property {(key: K) => V} get Return a value for the key. Throws if not
 *   found.
 * @property {(key: K, value: V) => void} init Initialize the key only if it
 *   doesn't already exist
 * @property {(key: K, value: V) => void} set Set the key. Throws if not found.
 * @property {(key: K) => void} delete Remove the key. Throws if not found.
 * @property {() => Iterable<K>} keys
 * @property {() => Iterable<V>} values
 * @property {() => Iterable<[K, V]>} entries
 * @property {() => number} getSize
 * @property {() => void} clear
 */
