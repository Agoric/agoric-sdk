import Nat from '@agoric/nat';
import { assert, details } from '@agoric/assert';

// Object/promise references (in the kernel) contain a two-tuple of (type,
// index). All object references point to entries in the kernel Object
// Table, which records the vat that owns the actual object. In that vat,
// the object reference will be expressed as 'o+NN', and the NN was
// allocated by that vat when they first exported the reference into the
// kernel. In all other vats, if/when they are given a reference to this
// object, they will receive 'o-NN', with the NN allocated by the kernel
// clist for the recipient vat.

/**
 * Parse a kernel slot reference string into a kernel slot object:
 *   {
 *      type: STRING, // 'object', 'device', or 'promise'
 *      id: Nat
 *   }
 *
 * @param s  The string to be parsed, as described above.
 *
 * @return a kernel slot object corresponding to the parameter.
 *
 * @throws if the given string is syntactically incorrect.
 */
export function parseKernelSlot(s) {
  assert.equal(s, `${s}`);
  let type;
  let idSuffix;
  if (s.startsWith('ko')) {
    type = 'object';
    idSuffix = s.slice(2);
  } else if (s.startsWith('kd')) {
    type = 'device';
    idSuffix = s.slice(2);
  } else if (s.startsWith('kp')) {
    type = 'promise';
    idSuffix = s.slice(2);
  } else {
    throw new Error(`invalid kernelSlot ${s}`);
  }
  const id = Nat(Number(idSuffix));
  return { type, id };
}

/**
 * Generate a kernel slot reference string given a type and id.
 *
 * @param type  The type, 'object', 'device', or 'promise'.
 * @param id    The id, a Nat.
 *
 * @return the corresponding kernel slot reference string.
 *
 * @throws if type is not one of the above known types.
 */
export function makeKernelSlot(type, id) {
  if (type === 'object') {
    return `ko${Nat(id)}`;
  }
  if (type === 'device') {
    return `kd${Nat(id)}`;
  }
  if (type === 'promise') {
    return `kp${Nat(id)}`;
  }
  throw new Error(`unknown type ${type}`);
}

/**
 * Assert function to ensure that a kernel slot reference string refers to a
 * slot of a given type.
 *
 * @param type  The kernel slot type desired, a string.
 * @param kernelSlot  The kernel slot reference string being tested
 *
 * @throws if kernelSlot is not of the given type or is malformed.
 *
 * @return nothing
 */
export function insistKernelType(type, kernelSlot) {
  assert(
    type === parseKernelSlot(kernelSlot).type,
    details`kernelSlot ${kernelSlot} is not of type ${type}`,
  );
}
