// @ts-check

import { E, Far } from '@endo/far';

const { details: X } = assert;

// TODO: Formalize segment constraints.
// Must be nonempty and disallow (unescaped) `.`, and for simplicity
// (and future possibility of e.g. escaping) we currently limit to
// ASCII alphanumeric plus underscore.
const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * @param {string} name
 */
export const sanitizePathSegment = name => {
  const candidate = name.replace(/[- ]/g, '_');
  assert(
    pathSegmentPattern.test(candidate),
    `Path sanitization failed for ${name}`,
  );
  return candidate;
};
harden(sanitizePathSegment);

/**
 * Must match the switch in vstorage.go using `vstorageMessage` type
 *
 * @typedef {'get' | 'getStoreKey' | 'set' | 'has' |'entries' | 'values' |'size' } StorageMessageMethod
 * @typedef {{key: string, method: StorageMessageMethod, value: string}} StorageMessage
 */

/**
 * Create a root storage node for a given backing function and root path.
 *
 * @param {(message: StorageMessage) => any} handleStorageMessage a function for sending a storageMessage object to the storage implementation (cf. golang/cosmos/x/vstorage/vstorage.go)
 * @param {'swingset'} storeName currently limited to "swingset"
 * @param {string} rootPath
 */
export function makeChainStorageRoot(
  handleStorageMessage,
  storeName,
  rootPath,
) {
  assert.equal(
    storeName,
    'swingset',
    'the only currently-supported store is "swingset"',
  );
  assert.typeof(rootPath, 'string');

  function makeChainStorageNode(path) {
    const node = {
      getStoreKey() {
        return handleStorageMessage({
          key: path,
          method: 'getStoreKey',
          value: '',
        });
      },
      getChildNode(name) {
        assert.typeof(name, 'string');
        assert(
          pathSegmentPattern.test(name),
          X`Path segment names must consist of 1 to 100 characters limited to ASCII alphanumerics, underscores, and/or dashes: ${name}`,
        );
        return makeChainStorageNode(`${path}.${name}`);
      },
      setValue(value) {
        assert.typeof(value, 'string');
        handleStorageMessage({ key: path, method: 'set', value });
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
/** @typedef {ReturnType<typeof makeChainStorageRoot>} ChainStorageNode */

/**
 * @returns {StorageNode} an object that confirms to StorageNode API but does not store anywhere.
 */
const makeNullStorageNode = () => {
  // XXX re-use "ChainStorage" methods above which don't actually depend on chains
  return makeChainStorageRoot(() => null, 'swingset', 'null');
};

/**
 * Convenience function for returning a storage node at or under its input,
 * falling back to an inert object with the correct interface (but incomplete
 * behavior) when that is unavailable.
 *
 * @param {ERef<ChainStorageNode?>} chainStorage
 * @param {string} [childName]
 * @returns {Promise<StorageNode>}
 */
export async function makeStorageNode(chainStorage, childName) {
  // eslint-disable-next-line @jessie.js/no-nested-await
  const storageNode = (await chainStorage) || makeNullStorageNode();
  if (childName) {
    return E(storageNode).getChildNode(childName);
  }
  return storageNode;
}
harden(makeStorageNode);
