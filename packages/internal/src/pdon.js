import { Fail } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';

/**
 * @typedef {`#{string}`} PureDataObjectNotation
 */
/**
 * @import {PureData} from '@endo/pass-style';
 */

/** @param {import('@endo/marshal').CapData<unknown>} cap */
const rejectOCap = cap => Fail`${cap} is not pure data`;
const pureDataMarshaller = makeMarshal(rejectOCap, rejectOCap, {
  serializeBodyFormat: 'smallcaps',
});

/**
 * Pure-Data Object Notation
 */
export const pdon = {
  /**
   * @type {(value: PureData) => PureDataObjectNotation}
   */
  stringify(value) {
    harden(value);
    const { body, slots } = pureDataMarshaller.toCapData(value);
    slots.length === 0 || Fail`slots ${slots} unexpected for pure data`;
    // Constraining to pure data guarantees empty slots and allows for direct use of `body`.
    return /** @type {PureDataObjectNotation} */ (body);
  },
  /**
   * @type {(text: PureDataObjectNotation) => PureData}
   */
  parse(txt) {
    return pureDataMarshaller.fromCapData({ body: txt, slots: [] });
  },
};
harden(pdon);
