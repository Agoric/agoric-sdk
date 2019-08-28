import Nat from '@agoric/nat';
import { insist } from '../kernel/insist';

// Object/promise references (in vats) contain a three-tuple of (type,
// allocator flag, index). The 'ownership' flag is expressed as a sign: "-"
// means the index was allocated by the kernel, and thus the actual object
// lives in some other vat (and any messages sent to it must go into the
// kernel). "+" means the index was allocated by this vat, hence the object
// lives in this vat, and we can expect to receive messages for it.

export function parseVatSlot(s) {
  insist(s === `${s}`);
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
  } else if (typechar === 'r') {
    type = 'resolver';
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
  if (type === 'resolver') {
    return `r${idSuffix}`;
  }
  throw new Error(`unknown type ${type}`);
}

export function insistVatType(type, vatSlot) {
  insist(
    type === parseVatSlot(vatSlot).type,
    `vatSlot ${vatSlot} is not of type ${type}`,
  );
}
