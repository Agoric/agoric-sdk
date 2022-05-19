import { E, Far } from '@endo/far';

const { details: X } = assert;

// TODO: Extract into testable library?
export function buildRootObject(_vatPowers) {
  function createChainStorageRoot(bridgeManager, bridgeId, rootKey) {
    const toStorage = message => E(bridgeManager).toBridge(bridgeId, message);

    // TODO: Formalize segment constraints.
    // Must be nonempty and disallow (unescaped) `.`, and for simplicity
    // (and future possibility of e.g. escaping) we currently limit to
    // ASCII alphanumeric plus underscore.
    const pathSegmentPattern = /^[a-zA-Z0-9_]{1,100}$/;
    const makeChainStorageNode = key => {
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
          // TODO: Fix on the chain side.
          // https://github.com/Agoric/agoric-sdk/issues/5381
          assert(value !== '');
          toStorage({ key, method: 'set', value });
        },
        async delete() {
          assert(key !== rootKey);
          // A 'set' with no value deletes a key but leaves any descendants.
          // We therefore want to disallow that (at least for now).
          // This check is unfortunately racy (e.g., a vat could wake up
          // and set data for a child before _this_ vat receives an
          // already-enqueued no-children response), but we can tolerate
          // that once https://github.com/Agoric/agoric-sdk/issues/5381
          // is fixed because then the 'set' message sent after erroneously
          // passing the no-children check will be transformed into a
          // set-to-empty which is at least *visibly* not deleted and
          // indistinguishable from a valid deep-create scenario (in which
          // parent keys are created automatically).
          const childKeys = await toStorage({ key, method: 'keys' });
          if (childKeys.length > 0) {
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
    };

    const rootNode = makeChainStorageNode(rootKey);
    return rootNode;
  }
  return Far('root', {
    createChainStorageRoot,
  });
}
