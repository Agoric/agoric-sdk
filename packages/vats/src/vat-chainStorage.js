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
          if (!pathSegmentPattern.test(name)) {
            assert.fail(
              X`Path segment must be a short ASCII identifier: ${name}`,
            );
          }
          return makeChainStorageNode(`${key}.${name}`);
        },
        setValue(value) {
          assert.typeof(value, 'string');
          // TODO: Fix on the Go side.
          // https://github.com/Agoric/agoric-sdk/issues/5381
          assert(value !== '');
          toStorage({ key, method: 'set', value });
        },
        async delete() {
          assert(key !== rootKey);
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
