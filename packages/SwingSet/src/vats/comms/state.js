import { assert, details as X } from '@agoric/assert';
import { insistCapData } from '../../capdata';
import { makeVatSlot } from '../../parseVatSlots';
import { makeLocalSlot } from './parseLocalSlots';
import { insistRemoteID } from './remote';

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
  const state = {
    nextRemoteIndex: 1,
    remotes: new Map(), // remoteNN -> { remoteID, name, fromRemote/toRemote, etc }
    names: new Map(), // name -> remoteNN

    fromKernel: new Map(), // o+NN/o-NN/p+NN/p-NN -> loNN/lpNN
    toKernel: new Map(), // loNN/lpNN -> o+NN/o-NN/p+NN/p-NN

    // o+NN/o-NN comms management meta-objects that shouldn't be in any clist
    metaObjects: new Set(),

    // we allocate `o+NN` with this counter
    nextKernelObjectIndex: identifierBase + 30,

    // we allocate `p+NN` with this counter
    nextKernelPromiseIndex: identifierBase + 40,

    // we allocate `loNN` with this counter
    nextLocalObjectIndex: identifierBase + 10,
    remoteReceivers: new Map(), // loNN -> remoteNN, for admin rx objects
    objectTable: new Map(), // loNN -> owning remote for non-admin objects

    // we allocate `lpNN` with this counter
    nextLocalPromiseIndex: identifierBase + 20,
    // lpNN -> { resolved, decider, subscribers, kernelIsSubscribed }
    // decider is one of: remoteID, 'kernel', 'comms'
    // once resolved, -> { resolved, resolution }
    // where resolution takes the form: {rejected, data}
    promiseTable: new Map(),

    identifierBase,
  };

  return state; // mutable
}

export function dumpState(state) {
  console.log(`Object Table:`);
  for (const id of state.objectTable.keys()) {
    console.log(`${id} : owner=${state.objectTable.get(id)}`);
  }
  console.log();

  console.log(`Promise Table:`);
  for (const id of state.promiseTable.keys()) {
    const p = state.promiseTable.get(id);
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

  for (const remoteID of state.remotes.keys()) {
    const r = state.remotes.get(remoteID);
    console.log(`${remoteID} '${r.name}':`);
    for (const inbound of r.fromRemote.keys()) {
      const id = r.fromRemote.get(inbound);
      const outbound = r.toRemote.get(id);
      console.log(` ${inbound} -> ${id} -> ${outbound}`);
    }
  }
}

export function makeStateKit(state) {
  function trackUnresolvedPromise(lpid) {
    assert(!state.promiseTable.has(lpid), X`${lpid} already present`);
    state.promiseTable.set(lpid, {
      resolved: false,
      decider: COMMS,
      subscribers: [],
      kernelIsSubscribed: false,
    });
  }

  function allocateLocalPromiseID() {
    const index = state.nextLocalPromiseIndex;
    state.nextLocalPromiseIndex += 1;
    return makeLocalSlot('promise', index);
  }

  function allocateLocalObjectID() {
    const index = state.nextLocalObjectIndex;
    state.nextLocalObjectIndex += 1;
    return makeLocalSlot('object', index);
  }

  function allocateUnresolvedPromise() {
    const lpid = allocateLocalPromiseID();
    trackUnresolvedPromise(lpid);
    return lpid;
  }

  function allocateKernelPromiseID() {
    const index = state.nextKernelPromiseIndex;
    state.nextKernelPromiseIndex += 1;
    return makeVatSlot('promise', true, index);
  }

  function allocateKernelObjectID() {
    const index = state.nextKernelObjectIndex;
    state.nextKernelObjectIndex += 1;
    return makeVatSlot('object', true, index);
  }

  function deciderIsKernel(lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    return decider === KERNEL;
  }

  function deciderIsRemote(lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    if (decider === KERNEL || decider === COMMS) {
      return undefined;
    }
    insistRemoteID(decider);
    return decider;
  }

  function insistDeciderIsRemote(lpid, remoteID) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      remoteID,
      `${lpid} is decided by ${decider}, not ${remoteID}`,
    );
  }

  function insistDeciderIsComms(lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      COMMS,
      `${decider} is the decider for ${lpid}, not me`,
    );
  }

  function insistDeciderIsKernel(lpid) {
    const p = state.promiseTable.get(lpid);
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
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = newDecider;
  }

  function changeDeciderFromRemoteToComms(lpid, oldDecider) {
    // console.log(`changeDecider ${lpid}: ${oldDecider}->COMMS`);
    insistRemoteID(oldDecider);
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, oldDecider);
    p.decider = COMMS;
  }

  function changeDeciderToKernel(lpid) {
    // console.log(`changeDecider ${lpid}: COMMS->KERNEL`);
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = KERNEL;
  }

  function changeDeciderFromKernelToComms(lpid) {
    // console.log(`changeDecider ${lpid}: KERNEL->COMMS`);
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert.equal(p.decider, KERNEL);
    p.decider = COMMS;
  }

  function getPromiseSubscribers(lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    const { subscribers, kernelIsSubscribed } = p;
    return { subscribers, kernelIsSubscribed };
  }

  function subscribeRemoteToPromise(lpid, subscriber) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.subscribers.push(subscriber);
  }

  function unsubscribeRemoteFromPromise(lpid, subscriber) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.subscribers = p.subscribers.filter(s => s !== subscriber);
  }

  function subscribeKernelToPromise(lpid) {
    const p = state.promiseTable.get(lpid);
    // console.log(`subscribeKernelToPromise ${lpid} d=${p.decider}`);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    assert(p.decider !== KERNEL, X`kernel is decider for ${lpid}, hush`);
    p.kernelIsSubscribed = true;
  }

  function unsubscribeKernelFromPromise(lpid) {
    const p = state.promiseTable.get(lpid);
    // console.log(`unsubscribeKernelFromPromise ${lpid} d=${p.decider}`);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} already resolved`);
    p.kernelIsSubscribed = false;
  }

  function insistPromiseIsUnresolved(lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`unknown ${lpid}`);
    assert(!p.resolved, X`${lpid} was already resolved`);
  }

  function markPromiseAsResolved(lpid, rejected, data) {
    const p = state.promiseTable.get(lpid);
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

  return harden({
    trackUnresolvedPromise,
    allocateUnresolvedPromise,
    allocateLocalPromiseID,
    allocateLocalObjectID,
    allocateKernelPromiseID,
    allocateKernelObjectID,

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

    dumpState: () => dumpState(state),
  });
}
