import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';

// Object/promise references (in remote messages) contain a three-tuple of
// (type, allocator flag, index). The allocator flag inside an inbound
// message is "+" when the index was allocated by the recipient of that
// message, and "-" when allocated by the sender of the message.

export function parseRemoteSlot(s) {
  assert.typeof(s, 'string');
  let type;
  let allocatedByRecipient;
  const typechars = s.slice(0, 2);
  const allocchar = s[2];
  const indexSuffix = s.slice(3);

  if (typechars === 'ro') {
    type = 'object';
  } else if (typechars === 'rp') {
    type = 'promise';
  } else if (typechars === 'rr') {
    type = 'resolver';
  } else {
    assert.fail(X`invalid remoteSlot ${s}`);
  }

  if (allocchar === '+') {
    allocatedByRecipient = true;
  } else if (allocchar === '-') {
    allocatedByRecipient = false;
  } else {
    assert.fail(X`invalid remoteSlot ${s}`);
  }

  const id = Nat(BigInt(indexSuffix));
  return { type, allocatedByRecipient, id };
}

export function makeRemoteSlot(type, allocatedByRecipient, id) {
  let indexSuffix;
  if (allocatedByRecipient) {
    indexSuffix = `+${Nat(id)}`;
  } else {
    indexSuffix = `-${Nat(id)}`;
  }

  if (type === 'object') {
    return `ro${indexSuffix}`;
  }
  if (type === 'promise') {
    return `rp${indexSuffix}`;
  }
  if (type === 'resolver') {
    return `rr${indexSuffix}`;
  }
  assert.fail(X`unknown type ${type}`);
}

export function insistRemoteType(type, remoteSlot) {
  type === parseRemoteSlot(remoteSlot).type ||
    assert.fail(X`remoteSlot ${remoteSlot} is not of type ${type}`);
}

// The clist for each remote-machine has two sides: fromRemote (used to
// parse inbound messages arriving from a remote machine) and toRemote (used
// to create outbound messages). The keys of the fromRemote table will have
// the opposite allocator flag as the corresponding value of the toRemote
// table. The only time we must reverse the polarity of the flag is when we
// add a new entry to the clist.

export function flipRemoteSlot(remoteSlot) {
  const { type, allocatedByRecipient, id } = parseRemoteSlot(remoteSlot);
  return makeRemoteSlot(type, !allocatedByRecipient, id);
}
