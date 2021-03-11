// @ts-check

import { getInterfaceOf } from '@agoric/marshal';

/**
 * Helper function to reject keys which are empty objects but not marked as
 * Remotable. This is intended to catch code which uses harden({}) (which
 * will become pass-by-copy, see #2018) as a "handle" or "marker object"
 * when they should have used Far().
 *
 * @param { unknown } key
 */
export function isEmptyNonRemotableObject(key) {
  return (
    typeof key === 'object' &&
    key !== null &&
    Reflect.ownKeys(key).length === 0 &&
    getInterfaceOf(key) === undefined
  );
}
harden(isEmptyNonRemotableObject);
