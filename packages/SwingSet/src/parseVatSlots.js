import Nat from '@agoric/nat';
import { assert } from '@agoric/assert';

// NOTE: confusing terminology: "slot" vs. "reference".  All these things
// called "slots" are references, but the word "slot" suggests something into
// which something else is put and a reference isn't one of those.  So improved
// terminology would be an improvement, though any such change should be
// thought through very carefully since changing these names will touch many
// files.  (You could call it a "reference", except that a phrase like "vat
// reference" is ambiguous as to whether it means a reference belonging to a
// vat or a reference *to* a vat, whereas "vat slot" does not have this problem
// as badly.  Also, "slot" is a short, single syllable word, which is nice.
// But still "slot" implies containership which I think is wrong.)

// Object/promise references (in vats) contain a three-tuple of (type,
// allocator flag, index). The 'ownership' flag is expressed as a sign: "-"
// means the index was allocated by the kernel, and thus the actual object
// lives in some other vat (and any messages sent to it must go into the
// kernel). "+" means the index was allocated by this vat, hence the object
// lives in this vat, and we can expect to receive messages for it.

/**
 * Parse a vat slot reference string into a vat slot object:
 *   {
 *      type: STRING, // 'object', 'device', 'promise'
 *      allocatedByVat: BOOL, // true=>allocated by vat, false=>by the kernel
 *      id: Nat
 *   }
 *
 * @param s  The string to be parsed, as described above.
 *
 * @return a vat slot object corresponding to the parameter.
 *
 * @throws if the given string is syntactically incorrect.
 */
export function parseVatSlot(s) {
  assert.typeof(s, 'string');
  let type;
  let allocatedByVat;
  const typechar = s[0];
  const allocchar = s[1];
  const idSuffix = s.slice(2);

  if (typechar === 'o') {
    type = 'object';
  } else if (typechar === 'd') {
    type = 'device';
  } else if (typechar === 'p') {
    type = 'promise';
  } else {
    throw new Error(`invalid vatSlot ${s}`);
  }

  if (allocchar === '+') {
    allocatedByVat = true;
  } else if (allocchar === '-') {
    allocatedByVat = false;
  } else {
    throw new Error(`invalid vatSlot ${s}`);
  }

  const id = Nat(Number(idSuffix));
  return { type, allocatedByVat, id };
}

/**
 * Generate a vat slot reference string given a type, ownership, and id.
 *
 * @param type  The type, 'object', 'device', 'promise'
 * @param allocatedByVat  Flag: true=>vat allocated, false=>kernel allocated
 * @param id    The id, a Nat.
 *
 * @return the corresponding vat slot reference string.
 *
 * @throws if type is not one of the above known types.
 */
export function makeVatSlot(type, allocatedByVat, id) {
  let idSuffix;
  if (allocatedByVat) {
    idSuffix = `+${Nat(id)}`;
  } else {
    idSuffix = `-${Nat(id)}`;
  }

  if (type === 'object') {
    return `o${idSuffix}`;
  }
  if (type === 'device') {
    return `d${idSuffix}`;
  }
  if (type === 'promise') {
    return `p${idSuffix}`;
  }
  throw new Error(`unknown type ${type}`);
}

/**
 * Assert function to ensure that a vat slot reference string refers to a
 * slot of a given type.
 *
 * @param type  The vat slot type desired, a string.
 * @param vatSlot  The vat slot reference string being tested
 *
 * @throws if vatSlot is not of the given type or is malformed.
 *
 * @return nothing
 */
export function insistVatType(type, vatSlot) {
  assert.equal(
    type,
    parseVatSlot(vatSlot).type,
    `vatSlot ${vatSlot} is not of type ${type}`,
  );
}
