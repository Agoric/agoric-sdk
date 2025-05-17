import { krefOf, kunser } from '@agoric/kmarshal';
import { passStyleOf } from '@endo/far';

/**
 * @import {CapData} from '@endo/marshal';
 */

export { insistCapData } from '@agoric/swingset-liveslots/src/capdata.js';

/**
 * Returns the slot of a presence if the provided capdata is composed
 * of a single presence, `null` otherwise
 *
 * @param {import('@endo/marshal').CapData<string>} data
 */
export function extractSingleSlot(data) {
  const value = kunser(data);
  const style = passStyleOf(value);
  if (style === 'remotable' || style === 'promise') {
    return krefOf(value);
  }
  return null;
}
