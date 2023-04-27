// @ts-check
import { Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { makeChainStorageRoot } from './lib-chainStorage.js';
import { bindAllMethods } from './method-tools.js';

const { Fail, quote: q } = assert;

/**
 * For testing, creates a chainStorage root node over an in-memory map
 * and exposes both the map and the sequence of received messages.
 *
 * @param {string} rootPath
 * @param {Parameters<typeof makeChainStorageRoot>[2]} [rootOptions]
 */
export const makeFakeStorageKit = (rootPath, rootOptions) => {
  /** @type {Map<string, any[]>} */
  const data = new Map();
  /** @type {import('../src/lib-chainStorage.js').StorageMessage[]} */
  const messages = [];
  /** @param {import('../src/lib-chainStorage.js').StorageMessage} message */
  // eslint-disable-next-line consistent-return
  const toStorage = async message => {
    messages.push(message);
    switch (message.method) {
      case 'getStoreKey': {
        return {
          storeName: 'swingset',
          storeSubkey: `fake:${message.args[0]}`,
        };
      }
      case 'set':
        for (const [key, value] of message.args) {
          if (value !== undefined) {
            data.set(key, [value]);
          } else {
            data.delete(key);
          }
        }
        break;
      case 'append':
        for (const [key, value] of message.args) {
          if (value === undefined) {
            throw new Error(`attempt to append with no value`);
          }
          let sequence = data.get(key);
          if (!Array.isArray(sequence)) {
            if (sequence === undefined) {
              // Initialize an empty collection.
              sequence = [];
            } else {
              // Wrap a previous single value in a collection.
              sequence = [sequence];
            }
            data.set(key, sequence);
          }
          sequence.push(value);
        }
        break;
      case 'size':
        // Intentionally incorrect because it counts non-child descendants,
        // but nevertheless supports a "has children" test.
        return [...data.keys()].filter(k => k.startsWith(`${message.args[0]}.`))
          .length;
      default:
        throw new Error(`unsupported method: ${message.method}`);
    }
  };
  const rootNode = makeChainStorageRoot(toStorage, rootPath, rootOptions);
  return { rootNode, data, messages, toStorage };
};
harden(makeFakeStorageKit);
/** @typedef {ReturnType< typeof makeFakeStorageKit>} FakeStorageKit */

export const makeMockChainStorageRoot = () => {
  const { rootNode, data } = makeFakeStorageKit('mockChainStorageRoot');

  const defaultMarshaller = makeMarshal(undefined, (_slotId, iface) => ({
    iface,
  }));

  return Far('mockChainStorage', {
    ...bindAllMethods(rootNode),
    /**
     * Defaults to deserializing pass-by-presence objects into { iface } representations.
     * Note that this is **not** a null transformation; capdata `@qclass` and `index` properties
     * are dropped and `iface` is _added_ for repeat references.
     *
     * @param {string} path
     * @param {import('./lib-chainStorage.js').Marshaller} marshaller
     * @returns {unknown}
     */
    getBody: (path, marshaller = defaultMarshaller) => {
      data.size || Fail`no data in storage`;
      const dataStr = data.get(path)?.at(-1);
      if (!dataStr) {
        console.debug('mockChainStorage data:', data);
        Fail`no data at ${q(path)}`;
      }
      assert.typeof(dataStr, 'string');
      const datum = JSON.parse(dataStr);
      return marshaller.unserialize(datum);
    },
    keys: () => [...data.keys()],
  });
};
/** @typedef {ReturnType<typeof makeMockChainStorageRoot>} MockChainStorageRoot */
