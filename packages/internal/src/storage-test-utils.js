// @ts-check
import { Far } from '@endo/far';
import { makeMarshal, Remotable } from '@endo/marshal';
import { makeChainStorageRoot } from './lib-chainStorage.js';
import { bindAllMethods } from './method-tools.js';

const { Fail, quote: q } = assert;

/**
 * A convertSlotToVal function that produces basic Remotables. Assumes
 * that all slots are Remotables (i.e. none are Promises).
 *
 * @param {string} _slotId
 * @param {string} iface
 */
export const slotToRemotable = (_slotId, iface = 'Remotable') =>
  Remotable(iface);

/**
 * A basic marshaller whose unserializer produces Remotables. It can
 * only serialize plain data, not Remotables.
 */
export const defaultMarshaller = makeMarshal(undefined, slotToRemotable, {
  serializeBodyFormat: 'smallcaps',
});

/**
 * A deserializer which produces slot strings instead of Remotables,
 * so if `a = Far('iface')`, and serializing `{ a }` into `capData`
 * assigned it slot `board123`, then `slotStringUnserialize(capData)`
 * would produce `{ a: 'board123' }`.
 *
 * This may be useful for display purposes.
 *
 * Limitations:
 *  * it cannot handle Symbols (registered or well-known)
 *  * it can handle BigInts, but serialized data that contains a
 *     particular unusual string will be unserialized into a BigInt by
 *     mistake
 *  * it cannot handle Promises, NaN, +/- Infinity, undefined, or
 *    other non-JSONable JavaScript values
 */
const makeSlotStringUnserialize = () => {
  /** @type { (slot: string, iface: string) => any } */
  const identitySlotToValFn = (slot, _) => Far('unk', { toJSON: () => slot });
  const { fromCapData } = makeMarshal(undefined, identitySlotToValFn);
  /** @type { (capData: any) => any } */
  const unserialize = capData =>
    JSON.parse(
      JSON.stringify(fromCapData(capData), (_, val) => {
        if (typeof val === 'bigint') {
          // JSON cannot accept BigInts. This unusual string is a
          // cheap alternative to a proper Hilbert Hotel.
          return `@encromulate:${val}`;
        } else {
          return val;
        }
      }),
      (_key, val) => {
        if (typeof val === 'string' && val.startsWith('@encromulate')) {
          return BigInt(val.split(':')[1]);
        } else {
          return val;
        }
      },
    );
  return harden(unserialize);
};
export const slotStringUnserialize = makeSlotStringUnserialize();

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
            throw Error(`attempt to append with no value`);
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
        throw Error(`unsupported method: ${message.method}`);
    }
  };
  const rootNode = makeChainStorageRoot(toStorage, rootPath, rootOptions);
  return { rootNode, data, messages, toStorage };
};
harden(makeFakeStorageKit);
/** @typedef {ReturnType< typeof makeFakeStorageKit>} FakeStorageKit */

export const makeMockChainStorageRoot = () => {
  const { rootNode, data } = makeFakeStorageKit('mockChainStorageRoot');
  return Far('mockChainStorage', {
    ...bindAllMethods(rootNode),
    /**
     * Defaults to deserializing slot references into plain Remotable
     * objects, but if supplied with a different marshaller, it could
     * produce Remotables with e.g. the slot string embedded in the
     * iface.
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
      return marshaller.fromCapData(datum);
    },
    keys: () => [...data.keys()],
  });
};
/** @typedef {ReturnType<typeof makeMockChainStorageRoot>} MockChainStorageRoot */
