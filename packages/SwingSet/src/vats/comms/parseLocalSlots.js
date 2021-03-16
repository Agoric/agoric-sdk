import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';

// Local object/promise references (in the comms vat) contain a two-tuple of
// (type, index).  All object references point to entries in the Local Object
// Table, which records the owner (kernel or remote connection) of the actual
// object.

/**
 * Parse a local slot reference string into a kernel slot object:
 *   {
 *      type: STRING, // 'object' or 'promise'
 *      id: Nat
 *   }
 *
 * @param {string} s  The string to be parsed, as described above.
 *
 * @returns {{type: 'object' | 'promise', id: number}} a local slot object corresponding to the parameter.
 *
 * @throws {Error} if the given string is syntactically incorrect.
 */
export function parseLocalSlot(s) {
  assert.typeof(s, 'string');
  let type;
  let idSuffix;
  if (s.startsWith('lo')) {
    type = 'object';
    idSuffix = s.slice(2);
  } else if (s.startsWith('lp')) {
    type = 'promise';
    idSuffix = s.slice(2);
  } else {
    assert.fail(X`invalid localSlot ${s}`);
  }
  const id = Nat(BigInt(idSuffix));
  return { type, id };
}

/**
 * Generate a local slot reference string given a type and id.
 *
 * @param {'object' | 'promise'} type  The type
 * @param {number} id    The id, a Nat.
 *
 * @returns {string} the corresponding local slot reference string.
 *
 * @throws {Error} if type is not one of the above known types.
 */
export function makeLocalSlot(type, id) {
  if (type === 'object') {
    return `lo${Nat(id)}`;
  }
  if (type === 'promise') {
    return `lp${Nat(id)}`;
  }
  assert.fail(X`unknown type ${type}`);
}

/**
 * Assert function to ensure that a local slot reference string refers to a
 * slot of a given type.
 *
 * @param {'object' | 'promise'} type  The local slot type desired, a string.
 * @param {string} localSlot  The local slot reference string being tested
 *
 * @throws if localSlot is not of the given type or is malformed.
 *
 * @returns {void}
 */
export function insistLocalType(type, localSlot) {
  assert(
    type === parseLocalSlot(localSlot).type,
    X`localSlot ${localSlot} is not of type ${type}`,
  );
}
