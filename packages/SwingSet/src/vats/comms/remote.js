import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { parseLocalSlot, insistLocalType } from './parseLocalSlots.js';
import {
  makeRemoteSlot,
  flipRemoteSlot,
  parseRemoteSlot,
} from './parseRemoteSlot.js';

export const insistRemoteID = remoteID => {
  assert(/^r\d+$/.test(remoteID), X`not a remoteID: ${remoteID}`);
};

export const initializeRemoteState = (
  store,
  remoteID,
  identifierBase,
  name,
  transmitterID,
) => {
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
};

export const makeRemote = (state, store, remoteID) => {
  insistRemoteID(remoteID);
  assert(store.get(`${remoteID}.initialized`), X`missing ${remoteID}`);

  const name = () => store.get(`${remoteID}.name`);

  const transmitterID = () => store.get(`${remoteID}.transmitterID`);

  const mapFromRemote = rref => store.get(`${remoteID}.c.${rref}`);

  const mapToRemote = lref => store.get(`${remoteID}.c.${lref}`);

  // is/set/clear are used on both imports and exports, but set/clear needs
  // to be told which one it is

  const isReachable = lref => {
    assert.equal(parseLocalSlot(lref).type, 'object');
    return !!store.get(`${remoteID}.cr.${lref}`);
  };
  const setReachable = (lref, isImportFromComms) => {
    const wasReachable = isReachable(lref);
    if (!wasReachable) {
      store.set(`${remoteID}.cr.${lref}`, `1`);
      if (isImportFromComms) {
        state.changeReachable(lref, 1n);
      }
    }
  };
  const clearReachable = (lref, isImportFromComms) => {
    const wasReachable = isReachable(lref);
    if (wasReachable) {
      store.delete(`${remoteID}.cr.${lref}`);
      if (isImportFromComms) {
        const reachable = state.changeReachable(lref, -1n);
        if (!reachable) {
          state.lrefMightBeFree(lref);
        }
      }
    }
  };

  const setLastSent = (lref, seqNum) => {
    insistLocalType('object', lref);
    const key = `${remoteID}.lastSent.${lref}`;
    store.set(key, `${seqNum}`);
  };

  const getLastSent = lref => {
    // for objects only, what was the outgoing seqnum on the most recent
    // message that could have re-exported the object?
    insistLocalType('object', lref);
    const key = `${remoteID}.lastSent.${lref}`;
    return Number(store.getRequired(key));
  };

  const deleteLastSent = lref => {
    insistLocalType('object', lref);
    const key = `${remoteID}.lastSent.${lref}`;
    store.delete(key);
  };

  // rref is what we would get from them, so + means our export
  const addRemoteMapping = (rref, lref) => {
    const { type, allocatedByRecipient } = parseRemoteSlot(rref);
    const isImportFromComms = allocatedByRecipient;
    const fromKey = `${remoteID}.c.${rref}`;
    const toKey = `${remoteID}.c.${lref}`;
    assert(!store.get(fromKey), X`already have ${rref}`);
    assert(!store.get(toKey), X`already have ${lref}`);
    store.set(fromKey, lref);
    store.set(toKey, flipRemoteSlot(rref));
    const mode = isImportFromComms ? 'clist-import' : 'clist-export';
    state.incrementRefCount(lref, `{rref}|${remoteID}|clist`, mode);
    if (type === 'object') {
      if (isImportFromComms) {
        state.addImporter(lref, remoteID);
        setLastSent(lref, '1'); // should be updated momentarily
      }
    }
  };

  const deleteRemoteMapping = lref => {
    const rrefOutbound = store.get(`${remoteID}.c.${lref}`);
    const rrefInbound = flipRemoteSlot(rrefOutbound);
    let mode = 'data'; // close enough
    const { type, allocatedByRecipient } = parseRemoteSlot(rrefInbound);
    const isImportFromComms = allocatedByRecipient;
    if (type === 'object') {
      clearReachable(lref, isImportFromComms);
      mode = isImportFromComms ? 'clist-import' : 'clist-export';
    }
    store.delete(`${remoteID}.c.${rrefInbound}`);
    store.delete(`${remoteID}.c.${lref}`);
    state.decrementRefCount(lref, `{rref}|${remoteID}|clist`, mode);
    if (type === 'object') {
      if (isImportFromComms) {
        state.removeImporter(lref, remoteID);
        deleteLastSent(lref);
      } else {
        // deleting the upstream/export-side mapping should trigger
        // processMaybeFree
        state.lrefMightBeFree(lref);
      }
    }
  };

  const nextSendSeqNum = () =>
    parseInt(store.getRequired(`${remoteID}.sendSeq`), 10);

  const advanceSendSeqNum = () => {
    const key = `${remoteID}.sendSeq`;
    const seqNum = parseInt(store.getRequired(key), 10);
    store.set(key, `${seqNum + 1}`);
  };

  const lastReceivedSeqNum = () =>
    parseInt(store.getRequired(`${remoteID}.recvSeq`), 10);

  const advanceReceivedSeqNum = () => {
    const key = `${remoteID}.recvSeq`;
    let seqNum = parseInt(store.getRequired(key), 10);
    seqNum += 1;
    store.set(key, `${seqNum}`);
    return seqNum;
  };

  const allocateRemoteObject = () => {
    const key = `${remoteID}.o.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    store.set(key, `${index + 1n}`);
    // The recipient will receive ro-NN
    return makeRemoteSlot('object', false, index);
  };

  const skipRemoteObjectID = remoteRefID => {
    const key = `${remoteID}.o.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    if (index <= remoteRefID) {
      store.set(key, `${remoteRefID + 1n}`);
    }
  };

  const allocateRemotePromise = () => {
    const key = `${remoteID}.p.nextID`;
    const index = Nat(BigInt(store.getRequired(key)));
    store.set(key, `${index + 1n}`);
    // The recipient will receive rp-NN
    return makeRemoteSlot('promise', false, index);
  };

  const enqueueRetirement = rpid => {
    const seqNum = nextSendSeqNum();
    const queueKey = `${remoteID}.rq`;
    const retirementQueue = JSON.parse(store.getRequired(queueKey));
    retirementQueue.push([seqNum, rpid]);
    store.set(queueKey, JSON.stringify(retirementQueue));
  };

  const getReadyRetirements = ackSeqNum => {
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
  };

  return harden({
    remoteID: () => remoteID,
    name,

    mapFromRemote,
    mapToRemote,
    isReachable,
    setReachable,
    clearReachable,
    addRemoteMapping,
    deleteRemoteMapping,
    setLastSent,
    getLastSent,

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
};
