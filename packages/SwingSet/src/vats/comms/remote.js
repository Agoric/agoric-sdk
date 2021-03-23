import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { makeVatSlot, insistVatType } from '../../parseVatSlots';
import { cdebug } from './cdebug';

function makeRemoteID(index) {
  return `remote${Nat(index)}`;
}

export function insistRemoteID(remoteID) {
  assert(remoteID.startsWith('remote'), X`not a remoteID: ${remoteID}`);
}

export function getRemote(state, remoteID) {
  insistRemoteID(remoteID);
  const remote = state.remotes.get(remoteID);
  assert(remote, X`missing ${remoteID}`);
  return remote;
}

export function addRemote(state, name, transmitterID) {
  insistVatType('object', transmitterID);
  assert(!state.names.has(name), X`remote name ${name} already in use`);
  state.metaObjects.add(transmitterID);

  const remoteID = makeRemoteID(state.nextRemoteIndex);
  state.nextRemoteIndex += 1;

  // The keys of the fromRemote table will have the opposite allocator flag
  // as the corresponding value of the toRemote table. The only time we must
  // reverse the polarity of the flag is when we add a new entry to the
  // clist.

  // fromRemote has:
  // ro-NN -> loNN (imported/importing from remote machine)
  // ro+NN -> loNN (previously exported to remote machine)
  const fromRemote = new Map(); //    {ro/rp+-NN} -> loNN/lpNN

  // toRemote has:
  // loNN -> ro+NN (previously imported from remote machine)
  // loNN -> ro-NN (exported/exporting to remote machine)
  const toRemote = new Map(); // lo/lpNN -> ro/rp+-NN

  state.remotes.set(remoteID, {
    remoteID,
    name,
    fromRemote,
    toRemote,
    nextObjectIndex: state.identifierBase + 20,
    nextResolverIndex: state.identifierBase + 30,
    nextPromiseIndex: state.identifierBase + 40,
    transmitterID,
    nextSendSeqNum: 1,
    nextExpectedRecvSeqNum: 1,
  });
  state.identifierBase += 1000;
  state.names.set(name, remoteID);

  // inbound messages will be directed at this exported object
  const receiverID = makeVatSlot('object', true, state.nextKernelObjectIndex);
  state.nextKernelObjectIndex += 1;
  state.metaObjects.add(receiverID);
  // remoteReceivers are our vat objects to which the transport layer will
  // send incoming messages. Each remote machine is assigned a separate
  // receiver object.
  state.remoteReceivers.set(receiverID, remoteID);
  // prettier-ignore
  cdebug(`comms add remote ${remoteID}/${name} xmit:${transmitterID} recv:${receiverID}`);
  return { remoteID, receiverID };
}
