import { assert, details as X } from '@agoric/assert';
import { insistCapData } from '../../capdata';
import { makeVatSlot, insistVatType } from '../../parseVatSlots';
import { makeLocalSlot } from './parseLocalSlots';
import { makeRemote, insistRemoteID } from './remote';
import { cdebug } from './cdebug';

const COMMS = 'comms';
const KERNEL = 'kernel';

// We maintain one clist for each remote.
// The remote clists map remote-side `ro+NN/ro-NN` identifiers to the `o+NN/o-NN`
// namespace used within the comms vat, and `rp+NN/rp-NN` to `p+NN/p-NN`.

// On the kernel side, we exchange `o+NN/o-NN` with the kernel, in the
// arguments of deliveries, resolutions, and notifications. We also exchange
// `p+NN/p-NN` values, but only for *unresolved* promises. The swingset
// kernel-vat interface contract says promise resolution causes the ID to be
// retired, forgotten immediately by both sides.

// If we ever have cause to send a retired vpid into the kernel, we must
// instead allocate a new `p+NN` value, send *that* into the kernel instead,
// immediately resolve it, and then forget about it again. We don't need to
// record the new `p+NN` value anywhere. The counter we use for allocation
// will continue on to the next higher NN.

export function makeState(identifierBase = 0) {
  // we allocate remote IDs `rNN` with this counter
  let nextRemoteIndex = 1;

  // remoteNN -> { remoteID, name, fromRemote/toRemote, etc }
  const remotes = new Map();

  // remoteName -> remoteNN
  const remoteNames = new Map();

  // loNN -> remoteNN, for admin rx objects
  const remoteReceivers = new Map();

  // we allocate `o+NN` with this counter
  let nextKernelObjectIndex = identifierBase + 30;

  // we allocate `p+NN` with this counter
  let nextKernelPromiseIndex = identifierBase + 40;

  // we allocate `loNN` with this counter
  let nextLocalObjectIndex = identifierBase + 10;

  // we allocate `lpNN` with this counter
  let nextLocalPromiseIndex = identifierBase + 20;

  // loNN -> owning remote for non-admin objects
  const objectTable = new Map();

  // lpNN -> { resolved, decider, subscribers, kernelIsSubscribed }
  // decider is one of: remoteID, 'kernel', 'comms'
  // once resolved, -> { resolved, resolution }
  // where resolution takes the form: {rejected, data}
  const promiseTable = new Map();

  // o+NN/o-NN comms management meta-objects that shouldn't be in any clist
  const metaObjects = new Set();

  // o+NN/o-NN/p+NN/p-NN -> loNN/lpNN
  const fromKernel = new Map();

  // loNN/lpNN -> o+NN/o-NN/p+NN/p-NN
  const toKernel = new Map();

  function mapFromKernel(kfref) {
    return fromKernel.get(kfref);
  }

  function mapToKernel(lref) {
    return toKernel.get(lref);
  }

  function addKernelMapping(kfref, lref) {
    fromKernel.set(kfref, lref);
    toKernel.set(lref, kfref);
  }

  function deleteKernelMapping(kfref, lref) {
    fromKernel.delete(kfref);
    toKernel.delete(lref);
  }

  function hasMetaObject(oid) {
    return metaObjects.has(oid);
  }

  function addMetaObject(oid) {
    metaObjects.add(oid);
  }

  function allocateKernelObjectID() {
    const index = nextKernelObjectIndex;
    nextKernelObjectIndex += 1;
    return makeVatSlot('object', true, index);
  }

  function allocateKernelPromiseID() {
    const index = nextKernelPromiseIndex;
    nextKernelPromiseIndex += 1;
    return makeVatSlot('promise', true, index);
  }

  function getObject(loid) {
    return objectTable.get(loid);
  }

  function allocateObject(owner) {
    const loid = makeLocalSlot('object', nextLocalObjectIndex);
    nextLocalObjectIndex += 1;
    objectTable.set(loid, owner);
    return loid;
  }

  function getPromise(lpid) {
    return promiseTable.get(lpid);
  }

  function allocatePromise() {
    const lpid = makeLocalSlot('promise', nextLocalPromiseIndex);
    nextLocalPromiseIndex += 1;
    promiseTable.set(lpid, {
      resolved: false,
      decider: COMMS,
      subscribers: [],
      kernelIsSubscribed: false,
    });
    return lpid;
  }

  function deciderIsKernel(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    return decider === KERNEL;
  }

  function deciderIsRemote(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    if (decider === KERNEL || decider === COMMS) {
      return undefined;
    }
    insistRemoteID(decider);
    return decider;
  }

  function insistDeciderIsRemote(lpid, remoteID) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      remoteID,
      `${lpid} is decided by ${decider}, not ${remoteID}`,
    );
  }

  function insistDeciderIsComms(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      COMMS,
      `${decider} is the decider for ${lpid}, not me`,
    );
  }

  function insistDeciderIsKernel(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      KERNEL,
      `${decider} is the decider for ${lpid}, not kernel`,
    );
  }

  // Decision authority always transfers through the comms vat, so the only
  // legal transitions are remote <-> comms <-> kernel.

  function changeDeciderToRemote(lpid, newDecider) {
    // console.log(`changeDecider ${lpid}: COMMS->${newDecider}`);
    insistRemoteID(newDecider);
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = newDecider;
  }

  function changeDeciderFromRemoteToComms(lpid, oldDecider) {
    // console.log(`changeDecider ${lpid}: ${oldDecider}->COMMS`);
    insistRemoteID(oldDecider);
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, oldDecider);
    p.decider = COMMS;
  }

  function changeDeciderToKernel(lpid) {
    // console.log(`changeDecider ${lpid}: COMMS->KERNEL`);
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = KERNEL;
  }

  function changeDeciderFromKernelToComms(lpid) {
    // console.log(`changeDecider ${lpid}: KERNEL->COMMS`);
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, KERNEL);
    p.decider = COMMS;
  }

  function getPromiseSubscribers(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { subscribers, kernelIsSubscribed } = p;
    return { subscribers, kernelIsSubscribed };
  }

  function subscribeRemoteToPromise(lpid, subscriber) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.subscribers.push(subscriber);
  }

  function unsubscribeRemoteFromPromise(lpid, subscriber) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.subscribers = p.subscribers.filter(s => s !== subscriber);
  }

  function subscribeKernelToPromise(lpid) {
    const p = promiseTable.get(lpid);
    // console.log(`subscribeKernelToPromise ${lpid} d=${p.decider}`);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    assert(p.decider !== KERNEL, X`kernel is decider for ${lpid}, hush`);
    p.kernelIsSubscribed = true;
  }

  function unsubscribeKernelFromPromise(lpid) {
    const p = promiseTable.get(lpid);
    // console.log(`unsubscribeKernelFromPromise ${lpid} d=${p.decider}`);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.kernelIsSubscribed = false;
  }

  function insistPromiseIsUnresolved(lpid) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} was already resolved`);
  }

  function markPromiseAsResolved(lpid, rejected, data) {
    const p = promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved);
    assert.typeof(
      rejected,
      'boolean',
      X`non-boolean "rejected" flag: ${rejected}`,
    );
    insistCapData(data);
    p.resolved = true;
    p.rejected = rejected;
    p.data = data;
    p.decider = undefined;
    p.subscribers = undefined;
    p.kernelIsSubscribed = undefined;
  }

  function getRemote(remoteID) {
    insistRemoteID(remoteID);
    const remote = remotes.get(remoteID);
    assert(remote, X`missing ${remoteID}`);
    return remote;
  }
  function addRemote(name, transmitterID) {
    assert(!remoteNames.has(name), X`remote name ${name} already in use`);

    insistVatType('object', transmitterID);
    addMetaObject(transmitterID);

    const remoteID = `r${nextRemoteIndex}`;
    nextRemoteIndex += 1;
    const remote = makeRemote(remoteID, identifierBase, name, transmitterID);
    identifierBase += 1000;
    remotes.set(remoteID, remote);
    remoteNames.set(name, remoteID);

    // inbound messages will be directed at this exported object
    const receiverID = allocateKernelObjectID();
    addMetaObject(receiverID);
    // remoteReceivers are our vat objects to which the transport layer will
    // send incoming messages. Each remote machine is assigned a separate
    // receiver object.
    remoteReceivers.set(receiverID, remoteID);
    // prettier-ignore
    cdebug(`comms add remote ${remoteID}/${name} xmit:${transmitterID} recv:${receiverID}`);
    return { remoteID, receiverID };
  }

  function getRemoteIDForName(remoteName) {
    return remoteNames.get(remoteName);
  }

  function getRemoteReceiver(receiverID) {
    return remoteReceivers.get(receiverID);
  }

  function dump() {
    console.log(`Object Table:`);
    for (const id of objectTable.keys()) {
      console.log(`${id} : owner=${objectTable.get(id)}`);
    }
    console.log();

    console.log(`Promise Table:`);
    for (const id of promiseTable.keys()) {
      const p = promiseTable.get(id);
      const subscribers = Array.from(p.subscribers);
      if (p.kernelIsSubscribed) {
        subscribers.push('kernel');
      }
      const subs = subscribers.join(',');
      console.log(
        `${id} : owner=${p.owner}, resolved=${p.resolved}, decider=${p.decider}, sub=${subs}`,
      );
    }
    console.log();

    for (const remoteID of remotes.keys()) {
      const r = remotes.get(remoteID);
      console.log(`${remoteID} '${r.name}':`);
      r.dump();
    }
  }

  return harden({
    mapFromKernel,
    mapToKernel,
    addKernelMapping,
    deleteKernelMapping,

    hasMetaObject,
    addMetaObject,

    allocateKernelObjectID,
    allocateKernelPromiseID,

    getObject,
    allocateObject,

    getPromise,
    allocatePromise,

    deciderIsKernel,
    deciderIsRemote,

    insistDeciderIsRemote,
    insistDeciderIsComms,
    insistDeciderIsKernel,

    changeDeciderToRemote,
    changeDeciderFromRemoteToComms,
    changeDeciderToKernel,
    changeDeciderFromKernelToComms,

    getPromiseSubscribers,
    subscribeRemoteToPromise,
    unsubscribeRemoteFromPromise,
    subscribeKernelToPromise,
    unsubscribeKernelFromPromise,

    insistPromiseIsUnresolved,
    markPromiseAsResolved,

    getRemote,
    addRemote,
    getRemoteIDForName,
    getRemoteReceiver,

    dump,
  });
}
