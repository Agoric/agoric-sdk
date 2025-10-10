// @ts-check

import { Fail } from '@endo/errors';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import * as cb from './callback.js';

/**
 * @import {ERef} from '@endo/far';
 * @import {Marshal, Passable} from '@endo/marshal';
 * @import {Remote, ERemote, TypedPattern} from './types.js';
 * @import {EMarshaller} from './marshal.js';
 */

/** @typedef {Marshal<unknown>} Marshaller */
/** @typedef {Pick<Marshaller, 'fromCapData'>} Unserializer */

/**
 * Defined by vstorageStoreKey in vstorage.go
 *
 * @typedef VStorageKey
 * @property {string} storeName
 * @property {string} storeSubkey
 * @property {string} dataPrefixBytes
 * @property {string} [noDataValue]
 */

/**
 * @template [T=unknown]
 * @typedef StreamCell
 * @property {string} blockHeight corresponding with the write of `values`
 *   (decimal representation of a natural number)
 * @property {T[]} values
 */

/** @type {TypedPattern<StreamCell>} */
export const StreamCellShape = harden({
  blockHeight: M.string(),
  values: M.array(),
});

/**
 * This represents a node in an IAVL tree.
 *
 * The active implementation is x/vstorage, an Agoric extension of the Cosmos
 * SDK.
 *
 * Vstorage is a hierarchical externally-reachable storage structure that
 * identifies children by restricted ASCII name and is associated with arbitrary
 * string-valued data for each node, defaulting to the empty string.
 *
 * @typedef {object} StorageNode
 * @property {(data: string) => Promise<void>} setValue publishes some data
 * @property {() => string} getPath the chain storage path at which the node was
 *   constructed
 * @property {() => Promise<VStorageKey>} getStoreKey DEPRECATED use getPath
 * @property {(
 *   subPath: string,
 *   options?: { sequence?: boolean },
 * ) => StorageNode} makeChildNode
 */

const ChainStorageNodeI = M.interface('StorageNode', {
  setValue: M.callWhen(M.string()).returns(),
  getPath: M.call().returns(M.string()),
  getStoreKey: M.callWhen().returns(M.record()),
  makeChildNode: M.call(M.string())
    .optional(M.splitRecord({}, { sequence: M.boolean() }, {}))
    .returns(M.remotable('StorageNode')),
});

/**
 * This is an imperfect heuristic to navigate the migration from value cells to
 * stream cells. At time of writing, no legacy cells have the same shape as a
 * stream cell, and we do not intend to create any more legacy value cells.
 *
 * @param {any} cell
 * @returns {cell is StreamCell}
 */
export const isStreamCell = cell =>
  cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);
harden(isStreamCell);

/**
 * @typedef {object} StoredFacet
 * @property {() => Promise<string>} getPath the chain storage path at which the
 *   node was constructed
 * @property {StorageNode['getStoreKey']} getStoreKey DEPRECATED use getPath
 * @property {() => Unserializer} getUnserializer get the unserializer for the
 *   stored data
 */

// TODO: Formalize segment constraints.
// Must be nonempty and disallow (unescaped) `.`, and for simplicity
// (and future possibility of e.g. escaping) we currently limit to
// ASCII alphanumeric plus underscore and dash.
// Should remain consistent with golang/cosmos/x/vstorage/types/path_keys.go
const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/** @type {(name: string) => void} */
export const assertPathSegment = name => {
  pathSegmentPattern.test(name) ||
    Fail`Path segment names must consist of 1 to 100 characters limited to ASCII alphanumerics, underscores, and/or dashes: ${name}`;
};
harden(assertPathSegment);

/**
 * Must match the switch in vstorage.go using `vstorageMessage` type
 *
 * @typedef {'get'
 *   | 'getStoreKey'
 *   | 'has'
 *   | 'children'
 *   | 'entries'
 *   | 'values'
 *   | 'size'} StorageGetByPathMessageMethod
 *
 *
 * @typedef {'set' | 'setWithoutNotify' | 'append'} StorageUpdateEntriesMessageMethod
 *
 *
 * @typedef {StorageGetByPathMessageMethod
 *   | StorageUpdateEntriesMessageMethod} StorageMessageMethod
 *
 *
 * @typedef {[path: string]} StorageGetByPathMessageArgs
 *
 * @typedef {[path: string, value?: string | null]} StorageEntry
 *
 * @typedef {StorageEntry[]} StorageUpdateEntriesMessageArgs
 *
 * @typedef {{
 *       method: StorageGetByPathMessageMethod;
 *       args: StorageGetByPathMessageArgs;
 *     }
 *   | {
 *       method: StorageUpdateEntriesMessageMethod;
 *       args: StorageUpdateEntriesMessageArgs;
 *     }} StorageMessage
 */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareChainStorageNode = zone => {
  /**
   * Create a storage node for a given backing storage interface and path.
   *
   * @param {import('./types.js').Callback<
   *   (message: StorageMessage) => any
   * >} messenger
   *   a callback for sending a storageMessage object to the storage
   *   implementation (cf. golang/cosmos/x/vstorage/vstorage.go)
   * @param {string} path
   * @param {object} [options]
   * @param {boolean} [options.sequence] set values with `append` messages
   *   rather than `set` messages so the backing implementation employs a
   *   wrapping structure that preserves each value set within a single block.
   *   Child nodes default to inheriting this option from their parent.
   * @returns {StorageNode}
   */
  const makeChainStorageNode = zone.exoClass(
    'ChainStorageNode',
    ChainStorageNodeI,
    /**
     * @param {import('./types.js').Callback<
     *   (message: StorageMessage) => any
     * >} messenger
     * @param {string} path
     * @param {object} [options]
     * @param {boolean} [options.sequence]
     */
    (messenger, path, { sequence = false } = {}) => {
      assert.typeof(path, 'string');
      assert.typeof(sequence, 'boolean');
      return harden({ path, messenger, sequence });
    },
    {
      getPath() {
        return this.state.path;
      },
      /**
       * @deprecated use getPath
       * @type {() => Promise<VStorageKey>}
       */
      async getStoreKey() {
        const { path, messenger } = this.state;
        return cb.callE(messenger, {
          method: 'getStoreKey',
          args: [path],
        });
      },
      /**
       * @type {(
       *   name: string,
       *   childNodeOptions?: { sequence?: boolean },
       * ) => StorageNode}
       */
      makeChildNode(name, childNodeOptions = {}) {
        const { sequence, path, messenger } = this.state;
        assertPathSegment(name);
        const mergedOptions = { sequence, ...childNodeOptions };
        return makeChainStorageNode(
          messenger,
          `${path}.${name}`,
          mergedOptions,
        );
      },
      /** @type {(value: string) => Promise<void>} */
      async setValue(value) {
        const { sequence, path, messenger } = this.state;
        assert.typeof(value, 'string');
        /** @type {StorageEntry} */
        let entry;
        if (!sequence && !value) {
          entry = [path];
        } else {
          entry = [path, value];
        }
        await cb.callE(messenger, {
          method: sequence ? 'append' : 'set',
          args: [entry],
        });
      },
      // Possible extensions:
      // * getValue()
      // * getChildNames() and/or makeChildNodes()
      // * getName()
      // * recursive delete
      // * batch operations
      // * local buffering (with end-of-block commit)
    },
  );
  return makeChainStorageNode;
};

const makeHeapChainStorageNode = prepareChainStorageNode(makeHeapZone());

/**
 * Create a heap-based root storage node for a given backing function and root
 * path.
 *
 * @param {(message: StorageMessage) => any} handleStorageMessage a function for
 *   sending a storageMessage object to the storage implementation (cf.
 *   golang/cosmos/x/vstorage/vstorage.go)
 * @param {string} rootPath
 * @param {object} [rootOptions]
 * @param {boolean} [rootOptions.sequence] employ a wrapping structure that
 *   preserves each value set within a single block, and default child nodes to
 *   do the same
 */
export function makeChainStorageRoot(
  handleStorageMessage,
  rootPath,
  rootOptions = {},
) {
  const messenger = cb.makeFunctionCallback(handleStorageMessage);

  // Use the heapZone directly.
  const rootNode = makeHeapChainStorageNode(messenger, rootPath, rootOptions);
  return rootNode;
}

/**
 * @returns {StorageNode} an object that confirms to StorageNode API but does
 *   not store anywhere.
 */
const makeNullStorageNode = () => {
  // XXX re-use "ChainStorage" methods above which don't actually depend on chains
  return makeChainStorageRoot(
    Far('NullMessenger', () => null),
    'null',
  );
};

/**
 * Convenience function for returning a storage node at or under its input,
 * falling back to an inert object with the correct interface (but incomplete
 * behavior) when that is unavailable.
 *
 * @param {ERef<Remote<StorageNode> | null>} storageNodeRef
 * @param {string} childName
 * @returns {Promise<Remote<StorageNode>>}
 */
export async function makeStorageNodeChild(storageNodeRef, childName) {
  const existingStorageNode = await storageNodeRef;
  const storageNode = existingStorageNode || makeNullStorageNode();
  return E(storageNode).makeChildNode(childName);
}
harden(makeStorageNodeChild);

// TODO find a better module for this
/**
 * @param {ERemote<StorageNode>} storageNode
 * @param {ERemote<EMarshaller>} marshaller
 * @returns {(value: Passable) => Promise<void>}
 */
export const makeSerializeToStorage = (storageNode, marshaller) => {
  return async value => {
    const marshalled = await E(marshaller).toCapData(value);
    const serialized = JSON.stringify(marshalled);
    return E(storageNode).setValue(serialized);
  };
};
