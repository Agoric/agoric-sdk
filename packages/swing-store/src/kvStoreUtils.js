// @ts-check
import { Fail } from '@endo/errors';

/**
 * @param {string} key
 */
export function getKeyType(key) {
  typeof key === 'string' || Fail`key must be a string`;
  if (key.startsWith('local.')) {
    return 'local';
  } else if (key.startsWith('host.')) {
    return 'host';
  }
  return 'consensus';
}
