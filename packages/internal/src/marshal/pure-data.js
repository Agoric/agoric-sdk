// @ts-check
import { Fail } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';

/**
 * @import {CapData} from '@endo/marshal';
 */

/** @param {CapData<unknown>} cap */
const rejectOCap = cap => Fail`${cap} is not pure data`;
export const pureDataMarshaller = makeMarshal(rejectOCap, rejectOCap, {
  serializeBodyFormat: 'smallcaps',
});
harden(pureDataMarshaller);
