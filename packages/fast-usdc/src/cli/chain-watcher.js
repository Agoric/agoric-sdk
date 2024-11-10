import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeClientMarshaller } from './marshal-tables.js';

// TODO: refactor overlap with makeAgoricChainWatcher
/** @param {ReturnType<typeof import('./vstorage-client').makeVStorage>} vs */
export const makeWatcher = vs => {
  const m = makeClientMarshaller();

  /** @param {string} path */
  const queryOnce = async path => {
    const { value: serialized } = await vs.readStorage(path);
    assert.string(serialized);
    const aKey = 'aKey';
    const data = new Map([[aKey, serialized]]);
    return unmarshalFromVstorage(data, aKey, m.fromCapData, -1);
  };
  return harden({ queryOnce, marshaller: m });
};
