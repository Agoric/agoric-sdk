// @ts-check

import { Far } from '@endo/far';

const { details: X } = assert;

// TODO: Formalize segment constraints.
// Must be nonempty and disallow (unescaped) `.`, and for simplicity
// (and future possibility of e.g. escaping) we currently limit to
// ASCII alphanumeric plus underscore.
const pathSegmentPattern = /^[a-zA-Z0-9_]{1,100}$/;

/**
 * Create a root storage node for a given backing function and root key.
 *
 * @param {(message: any) => any} toStorage a function for sending a storageMessage object to the storage implementation (cf. golang/cosmos/x/swingset/storage.go)
 * @param {string} rootKey
 */
export function makeChainStorageRoot(toStorage, rootKey) {
  assert.typeof(rootKey, 'string');

  function makeChainStorageNode(key) {
    const node = {
      getKey() {
        return key;
      },
      getChildNode(name) {
        assert.typeof(name, 'string');
        assert(
          pathSegmentPattern.test(name),
          X`Path segment must be a short ASCII identifier: ${name}`,
        );
        return makeChainStorageNode(`${key}.${name}`);
      },
      setValue(value) {
        assert.typeof(value, 'string');
        toStorage({ key, method: 'set', value });
      },
      async delete() {
        assert(key !== rootKey);
        // A 'set' with no value deletes a key if it has no children, but
        // otherwise sets data to the empty string and leaves all nodes intact.
        // We want to reject silently incomplete deletes (at least for now).
        // This check is unfortunately racy (e.g., a vat could wake up
        // and set data for a child before _this_ vat receives an
        // already-enqueued response claiming no children), but we can tolerate
        // that because transforming a deletion into a set-to-empty is
        // effectively indistinguishable from a valid reordering where a fully
        // successful 'delete' is followed by a child-key 'set' (for which
        // absent parent keys are automatically created with empty-string data).
        const childCount = await toStorage({ key, method: 'size' });
        if (childCount > 0) {
          assert.fail(X`Refusing to delete node with children: ${key}`);
        }
        toStorage({ key, method: 'set' });
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

  const rootNode = makeChainStorageNode(rootKey);
  return rootNode;
}
