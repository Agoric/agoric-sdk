import Nat from '@agoric/nat';
import { assert, details } from '@agoric/assert';
import { makeVatSlot, insistVatType } from '../../parseVatSlots';

function makeRemoteID(index) {
  return `remote${Nat(index)}`;
}

export function insistRemoteID(remoteID) {
  assert(remoteID.startsWith('remote'), details`not a remoteID: ${remoteID}`);
}

export function getRemote(state, remoteID) {
  insistRemoteID(remoteID);
  const remote = state.remotes.get(remoteID);
  assert(remote, `missing ${remoteID}`);
  return remote;
}

export function addRemote(state, name, transmitterID) {
  insistVatType('object', transmitterID);
  assert(!state.names.has(name), details`remote name ${name} already in use`);

  const remoteID = makeRemoteID(state.nextRemoteIndex);
  state.nextRemoteIndex += 1;

  // The keys of the fromRemote table will have the opposite allocator flag
  // as the corresponding value of the toRemote table. The only time we must
  // reverse the polarity of the flag is when we add a new entry to the
  // clist.

  // fromRemote has:
  // ro-NN -> o+NN (imported/importing from remote machine)
  // ro+NN -> o-NN (previously exported to remote machine)
  const fromRemote = new Map(); //    {ro/rp/rr+-NN} -> o+-NN/p+-NN/r+-NN

  // toRemote has:
  // o+NN -> ro+NN (previously imported from remote machine)
  // o-NN -> ro-NN (exported/exporting to remote machine)
  const toRemote = new Map(); // o/p/r+-NN -> ro/rp/rr+-NN

  state.remotes.set(remoteID, {
    remoteID,
    name,
    fromRemote,
    toRemote,
    nextObjectIndex: 20,
    nextResolverIndex: 30,
    nextPromiseIndex: 40,
    transmitterID,
  });
  state.names.set(name, remoteID);

  // inbound messages will be directed at this exported object
  const receiverID = makeVatSlot('object', true, state.nextObjectIndex);
  state.nextObjectIndex += 1;
  // remoteReceivers are our vat objects to which the transport layer will
  // send incoming messages. Each remote machine is assigned a separate
  // receiver object.
  state.remoteReceivers.set(receiverID, remoteID);
  return { remoteID, receiverID };
}
