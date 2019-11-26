import Nat from '@agoric/nat';
import { insist } from '../insist';

// Object/promise references (in the kernel) contain a two-tuple of (type,
// index). All object references point to entries in the kernel Object
// Table, which records the vat that owns the actual object. In that vat,
// the object reference will be expressed as 'o+NN', and the NN was
// allocated by that vat when they first exported the reference into the
// kernel. In all other vats, if/when they are given a reference to this
// object, they will receive 'o-NN', with the NN allocated by the kernel
// clist for the recipient vat.

export function parseKernelSlot(s) {
  insist(s === `${s}`);
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

export function insistKernelType(type, kernelSlot) {
  insist(
    type === parseKernelSlot(kernelSlot).type,
    `kernelSlot ${kernelSlot} is not of type ${type}`,
  );
}
