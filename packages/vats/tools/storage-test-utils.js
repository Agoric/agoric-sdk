// @ts-check
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
