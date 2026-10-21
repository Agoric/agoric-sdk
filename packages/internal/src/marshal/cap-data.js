// @ts-check
import { Fail } from '@endo/errors';

/**
 * @import {CapData} from '@endo/marshal';
 */

/**
 * Assert that this is CapData
 *
 * @type {(data: unknown) => asserts data is CapData<unknown>}
 */
export const assertCapData = data => {
  assert.typeof(data, 'object');
  assert(data);
  typeof data.body === 'string' || Fail`data has non-string .body ${data.body}`;
  Array.isArray(data.slots) || Fail`data has non-Array slots ${data.slots}`;
};
harden(assertCapData);
