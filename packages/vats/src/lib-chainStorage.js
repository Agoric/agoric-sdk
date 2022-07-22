// @ts-check

import { E, Far } from '@endo/far';

const { details: X } = assert;

// TODO: Formalize segment constraints.
// Must be nonempty and disallow (unescaped) `.`, and for simplicity
// (and future possibility of e.g. escaping) we currently limit to
// ASCII alphanumeric plus underscore.
const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Create a root storage node for a given backing function and root path.
 *
 * @param {(message: any) => any} toStorage a function for sending a storageMessage object to the storage implementation (cf. golang/cosmos/x/swingset/storage.go)
 * @param {string} storeName currently limited to "swingset"
 * @param {string} rootPath
 */
export function makeChainStorageRoot(toStorage, storeName, rootPath) {
  assert.equal(
    storeName,
    'swingset',
    'the only currently-supported store is "swingset"',
  );
  assert.typeof(rootPath, 'string');

  function makeChainStorageNode(path) {
    const node = {
      getStoreKey() {
        return toStorage({ key: path, method: 'getStoreKey' });
      },
      getChildNode(name) {
        assert.typeof(name, 'string');
        assert(
          pathSegmentPattern.test(name),
          X`Path segment must be a short snake_case alphanumeric identifier: ${name}`,
        );
        return makeChainStorageNode(`${path}.${name}`);
      },
      setValue(value) {
        assert.typeof(value, 'string');
        toStorage({ key: path, method: 'set', value });
      },
      clearValue() {
        toStorage({ key: path, method: 'set' });
      },
      // Possible extensions:
      // * getValue()
      // * getChildNames() and/or getChildNodes()
      // * getName()
      // * recursive delete
      // * batch operations
      // * local buffering (with end-of-block commit)
    };
    return Far('chainStorageNode', node);
  }

  const rootNode = makeChainStorageNode(rootPath);
  return rootNode;
}

/**
 * @returns {StorageNode} an object that confirms to StorageNode API but does not store anywhere.
 */
const makeNullStorageNode = () => {
  // XXX re-use "ChainStorage" methods above which don't actually depend on chains
  return makeChainStorageRoot(() => null, 'swingset', 'null');
};

/**
 * Convience function for falling back to non-storage when chain storage isn't available.
 * Also takes an optional childname.
 *
 * @param {ERef<ChainStorageNode?>} chainStorage
 * @param {string} [childName]
 * @returns {Promise<StorageNode>}
 */
export async function makeStorageNode(chainStorage, childName) {
  const storageNode = (await chainStorage) || makeNullStorageNode();
  if (childName) {
    return E(storageNode).getChildNode(childName);
  }
  return storageNode;
}
harden(makeStorageNode);
