// @ts-check
import { Far, makeMarshal } from '@endo/marshal';
import { makeChainStorageRoot } from '../src/lib-chainStorage.js';

/**
 * For testing, creates a chainStorage root node over an in-memory map
 * and exposes both the map and the sequence of received messages.
 *
 * @param {string} rootPath
 */
export const makeFakeStorageKit = rootPath => {
  /** @type {Map<string, string>} */
  const data = new Map();
  /** @type {import('../src/lib-chainStorage.js').StorageMessage[]} */
  const messages = [];
  /** @param {import('../src/lib-chainStorage.js').StorageMessage} message */
  // eslint-disable-next-line consistent-return
  const toStorage = message => {
    messages.push(message);
    switch (message.method) {
      case 'getStoreKey': {
        return {
          storeName: 'swingset',
          storeSubkey: `fake:${message.key}`,
        };
      }
      case 'set':
        if ('value' in message) {
          data.set(message.key, message.value);
        } else {
          data.delete(message.key);
        }
        break;
      case 'size':
        // Intentionally incorrect because it counts non-child descendants,
        // but nevertheless supports a "has children" test.
        return [...data.keys()].filter(k => k.startsWith(`${message.key}.`))
          .length;
      default:
        throw new Error(`unsupported method: ${message.method}`);
    }
  };
  const rootNode = makeChainStorageRoot(toStorage, 'swingset', rootPath);
  return { rootNode, data, messages };
};
harden(makeFakeStorageKit);

export const makeMockChainStorageRoot = () => {
  const { rootNode, data } = makeFakeStorageKit('mockChainStorageRoot');

  const defaultMarshaller = makeMarshal(undefined, (_slotId, iface) => ({
    iface,
  }));

  return Far('mockChainStorage', {
    ...rootNode,
    /**
     *  Defaults to deserializing pass-by-presence objects into { iface } representations.
     * Note that this is **not** a null transformation; capdata `@qclass` and `index` properties
     * are dropped and `iface` is _added_ for repeat references.
     *
     * @param {string} path
     * @param {Marshaller} marshaller
     * @returns {unknown}
     */
    getBody: (path, marshaller = defaultMarshaller) => {
      assert(data.size, 'no data in storage');
      const dataStr = data.get(path);
      if (!dataStr) {
        console.debug('mockChainStorage data:', data);
        assert.fail(`no data at ${path}`);
      }
      assert.typeof(dataStr, 'string');
      const datum = JSON.parse(dataStr);
      return marshaller.unserialize(datum);
    },
  });
};
/** @typedef {ReturnType<typeof makeMockChainStorageRoot>} MockChainStorageRoot */
