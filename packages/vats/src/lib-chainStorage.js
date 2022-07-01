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
          X`Path segment must be a short ASCII identifier: ${name}`,
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
 *
 * @param {ERef<ChainStorageNode | undefined>} chainStorage
 * @param {string} childName
 */
export async function getChildNode(chainStorage, childName) {
  const chainStoragePresence = await chainStorage;
  const storageNode = await (chainStoragePresence &&
    E(chainStoragePresence).getChildNode(childName));
  return storageNode;
}
harden(getChildNode);
