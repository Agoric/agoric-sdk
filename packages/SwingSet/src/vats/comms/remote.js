import { assert, details as X } from '@agoric/assert';
import { makeRemoteSlot, flipRemoteSlot } from './parseRemoteSlot';

export function insistRemoteID(remoteID) {
  assert(/^r[0-9]+$/.test(remoteID), X`not a remoteID: ${remoteID}`);
}

export function makeRemote(remoteID, identifierBase, name, transmitterID) {
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

  function mapFromRemote(rref) {
    return fromRemote.get(rref);
  }

  function mapToRemote(lref) {
    return toRemote.get(lref);
  }

  function addRemoteMapping(rref, lref) {
    assert(!fromRemote.has(rref), X`already have ${rref}`);
    assert(!toRemote.has(lref), X`already have ${lref}`);
    fromRemote.set(rref, lref);
    toRemote.set(lref, flipRemoteSlot(rref));
  }

  function deleteRemoteMapping(rref, lref) {
    fromRemote.delete(rref);
    toRemote.delete(lref);
  }

  function deleteToRemoteMapping(lref) {
    toRemote.delete(lref);
  }

  let nextSendSeqNum = 1;

  function advanceSendSeqNum() {
    nextSendSeqNum += 1;
  }

  let lastReceivedSeqNum = 0;

  function advanceReceivedSeqNum() {
    lastReceivedSeqNum += 1;
  }

  let nextObjectIndex = identifierBase + 20;

  function allocateRemoteObject() {
    const index = nextObjectIndex;
    nextObjectIndex += 1;
    // The recipient will receive ro-NN
    return makeRemoteSlot('object', false, index);
  }

  function skipRemoteObjectID(remoteRefID) {
    if (nextObjectIndex <= remoteRefID) {
      nextObjectIndex = remoteRefID + 1;
    }
  }

  let nextPromiseIndex = identifierBase + 40;

  function allocateRemotePromise() {
    const index = nextPromiseIndex;
    nextPromiseIndex += 1;
    // The recipient will receive rp-NN
    return makeRemoteSlot('promise', false, index);
  }

  const retirementQueue = [];

  function enqueueRetirement(retirement) {
    retirementQueue.push(retirement);
  }

  function nextReadyRetirement(ackSeqNum) {
    if (retirementQueue.length > 0) {
      const [sentSeqNum, rpid] = retirementQueue[0];
      if (sentSeqNum <= ackSeqNum) {
        // XXX TODO?: consider implementing an actual queue, because shift()
        retirementQueue.shift();
        return rpid;
      }
    }
    return undefined;
  }

  function dump() {
    for (const inbound of fromRemote.keys()) {
      const id = fromRemote.get(inbound);
      const outbound = toRemote.get(id);
      console.log(` ${inbound} -> ${id} -> ${outbound}`);
    }
  }

  return harden({
    remoteID,
    name,
    mapFromRemote,
    mapToRemote,
    addRemoteMapping,
    deleteRemoteMapping,
    deleteToRemoteMapping,
    allocateRemoteObject,
    skipRemoteObjectID,
    allocateRemotePromise,
    transmitterID,
    nextSendSeqNum: () => nextSendSeqNum,
    advanceSendSeqNum,
    lastReceivedSeqNum: () => lastReceivedSeqNum,
    advanceReceivedSeqNum,
    enqueueRetirement,
    nextReadyRetirement,
    dump,
  });
}
