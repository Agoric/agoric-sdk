import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { makeRemoteSlot, flipRemoteSlot } from './parseRemoteSlot';

export function insistRemoteID(remoteID) {
  assert(/^r\d+$/.test(remoteID), X`not a remoteID: ${remoteID}`);
}

export function initializeRemoteState(
  store,
  remoteID,
  identifierBase,
  name,
  transmitterID,
) {
  assert(
    !store.get(`${remoteID}.initialized`),
    X`remote ${remoteID} already exists`,
  );
  store.set(`${remoteID}.sendSeq`, '1');
  store.set(`${remoteID}.recvSeq`, '0');
  store.set(`${remoteID}.o.nextID`, `${identifierBase + 20}`);
  store.set(`${remoteID}.p.nextID`, `${identifierBase + 40}`);
  store.set(`${remoteID}.rq`, '[]');
  store.set(`${remoteID}.transmitterID`, transmitterID);
  store.set(`${remoteID}.name`, name);
  store.set(`${remoteID}.initialized`, 'true');
}

export function makeRemote(state, store, remoteID) {
  insistRemoteID(remoteID);
  assert(store.get(`${remoteID}.initialized`), X`missing ${remoteID}`);

  function name() {
    return store.get(`${remoteID}.name`);
  }

  function transmitterID() {
    return store.get(`${remoteID}.transmitterID`);
  }

  function mapFromRemote(rref) {
    // ro-NN -> loNN (imported/importing from remote machine)
    // ro+NN -> loNN (previously exported to remote machine)
    return store.get(`${remoteID}.c.${rref}`);
  }

  function mapToRemote(lref) {
    // loNN -> ro+NN (previously imported from remote machine)
    // loNN -> ro-NN (exported/exporting to remote machine)
    return store.get(`${remoteID}.c.${lref}`);
  }

  function addRemoteMapping(rref, lref) {
    const fromKey = `${remoteID}.c.${rref}`;
    const toKey = `${remoteID}.c.${lref}`;
    assert(!store.get(fromKey), X`already have ${rref}`);
    assert(!store.get(toKey), X`already have ${lref}`);
    store.set(fromKey, lref);
    store.set(toKey, flipRemoteSlot(rref));
    state.incrementRefCount(lref, `{rref}|${remoteID}|clist`);
  }

  function deleteRemoteMapping(rref, lref) {
    store.delete(`${remoteID}.c.${rref}`);
    store.delete(`${remoteID}.c.${lref}`);
    state.decrementRefCount(lref, `{rref}|${remoteID}|clist`);
  }

  function deleteToRemoteMapping(lref) {
    store.delete(`${remoteID}.c.${lref}`);
  }

  function nextSendSeqNum() {
    return Number(store.getRequired(`${remoteID}.sendSeq`));
  }

  function advanceSendSeqNum() {
    const key = `${remoteID}.sendSeq`;
    const seqNum = Number(store.getRequired(key));
    store.set(key, `${seqNum + 1}`);
  }

  function lastReceivedSeqNum() {
    return Number(store.getRequired(`${remoteID}.recvSeq`));
  }

  function advanceReceivedSeqNum() {
    const key = `${remoteID}.recvSeq`;
    let seqNum = Number(store.getRequired(key));
    seqNum += 1;
    store.set(key, `${seqNum}`);
    return seqNum;
  }

  function allocateRemoteObject() {
    const key = `${remoteID}.o.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    store.set(key, `${index + 1n}`);
    // The recipient will receive ro-NN
    return makeRemoteSlot('object', false, index);
  }

  function skipRemoteObjectID(remoteRefID) {
    const key = `${remoteID}.o.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    if (index <= remoteRefID) {
      store.set(key, `${remoteRefID + 1n}`);
    }
  }

  function allocateRemotePromise() {
    const key = `${remoteID}.p.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    store.set(key, `${index + 1n}`);
    // The recipient will receive rp-NN
    return makeRemoteSlot('promise', false, index);
  }

  function enqueueRetirement(rpid) {
    const seqNum = nextSendSeqNum();
    const queueKey = `${remoteID}.rq`;
    const retirementQueue = JSON.parse(store.getRequired(queueKey));
    retirementQueue.push([seqNum, rpid]);
    store.set(queueKey, JSON.stringify(retirementQueue));
  }

  function getReadyRetirements(ackSeqNum) {
    const key = `${remoteID}.rq`;
    const retirementQueue = JSON.parse(store.getRequired(key));
    const ready = [];
    while (retirementQueue.length > 0) {
      const [sentSeqNum, rpid] = retirementQueue[0];
      if (sentSeqNum > ackSeqNum) {
        break;
      }
      ready.push(rpid);
      retirementQueue.shift();
    }
    if (ready.length > 0) {
      store.set(key, JSON.stringify(retirementQueue));
    }
    return ready;
  }

  return harden({
    remoteID: () => remoteID,
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
    nextSendSeqNum,
    advanceSendSeqNum,
    lastReceivedSeqNum,
    advanceReceivedSeqNum,
    enqueueRetirement,
    getReadyRetirements,
  });
}
