import { assert } from '@agoric/assert';
import { insistCapData } from '../../capdata';
import { makeVatSlot } from '../../parseVatSlots';
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

export function makeState() {
  const state = {
    nextRemoteIndex: 1,
    remotes: new Map(), // remoteNN -> { remoteID, name, fromRemote/toRemote, etc }
    names: new Map(), // name -> remoteNN

    // we allocate `o+NN` with this counter
    nextObjectIndex: 10,
    remoteReceivers: new Map(), // o+NN -> remoteNN, for admin rx objects
    objectTable: new Map(), // o+NN -> owning remote for non-admin objects

    promiseTable: new Map(),
    // p+NN/p-NN -> { resolved, decider, subscribers, kernelIsSubscribed }
    // decider is one of: remoteID, 'kernel', 'comms'
    // once resolved, -> { resolved, resolution }
    // where resolution is one of:
    // * {type: 'object', slot}
    // * {type: 'data', data}
    // * {type: 'reject', data}
    nextPromiseIndex: 20,
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
  function trackUnresolvedPromise(vpid) {
    assert(!state.promiseTable.has(vpid), `${vpid} already present`);
    state.promiseTable.set(vpid, {
      resolved: false,
      decider: COMMS,
      subscribers: [],
      kernelIsSubscribed: false,
    });
  }

  function allocateUnresolvedPromise() {
    const index = state.nextPromiseIndex;
    state.nextPromiseIndex += 1;
    const pid = makeVatSlot('promise', true, index);
    trackUnresolvedPromise(pid);
    return pid;
  }

  function allocateResolvedPromiseID() {
    // these are short-lived, and don't live in the table
    const index = state.nextPromiseIndex;
    state.nextPromiseIndex += 1;
    const pid = makeVatSlot('promise', true, index);
    return pid;
  }

  function deciderIsKernel(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    const { decider } = p;
    return decider === KERNEL;
  }

  function deciderIsRemote(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    const { decider } = p;
    if (decider === KERNEL || decider === COMMS) {
      return undefined;
    }
    insistRemoteID(decider);
    return decider;
  }

  function insistDeciderIsRemote(vpid, remoteID) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      remoteID,
      `${vpid} is decided by ${decider}, not ${remoteID}`,
    );
  }

  function insistDeciderIsComms(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      COMMS,
      `${decider} is the decider for ${vpid}, not me`,
    );
  }

  function insistDeciderIsKernel(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    const { decider } = p;
    assert.equal(
      decider,
      KERNEL,
      `${decider} is the decider for ${vpid}, not kernel`,
    );
  }

  // Decision authority always transfers through the comms vat, so the only
  // legal transitions are remote <-> comms <-> kernel.

  function changeDeciderToRemote(vpid, newDecider) {
    // console.log(`changeDecider ${vpid}: COMMS->${newDecider}`);
    insistRemoteID(newDecider);
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = newDecider;
  }

  function changeDeciderFromRemoteToComms(vpid, oldDecider) {
    // console.log(`changeDecider ${vpid}: ${oldDecider}->COMMS`);
    insistRemoteID(oldDecider);
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert.equal(p.decider, oldDecider);
    p.decider = COMMS;
  }

  function changeDeciderToKernel(vpid) {
    // console.log(`changeDecider ${vpid}: COMMS->KERNEL`);
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(p, `unknown ${vpid}`);
    assert.equal(p.decider, COMMS);
    p.decider = KERNEL;
  }

  function changeDeciderFromKernelToComms(vpid) {
    // console.log(`changeDecider ${vpid}: KERNEL->COMMS`);
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(p, `unknown ${vpid}`);
    assert.equal(p.decider, KERNEL);
    p.decider = COMMS;
  }

  function getPromiseSubscribers(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(p, `unknown ${vpid}`);
    const { subscribers, kernelIsSubscribed } = p;
    return { subscribers, kernelIsSubscribed };
  }

  function subscribeRemoteToPromise(vpid, subscriber) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved, `${vpid} already resolved`);
    p.subscribers.push(subscriber);
  }

  function unsubscribeRemoteFromPromise(vpid, subscriber) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved, `${vpid} already resolved`);
    p.subscribers = p.subscribers.filter(s => s !== subscriber);
  }

  function subscribeKernelToPromise(vpid) {
    const p = state.promiseTable.get(vpid);
    // console.log(`subscribeKernelToPromise ${vpid} d=${p.decider}`);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved, `${vpid} already resolved`);
    assert(p.decider !== KERNEL, `kernel is decider for ${vpid}, hush`);
    p.kernelIsSubscribed = true;
  }

  function unsubscribeKernelFromPromise(vpid) {
    const p = state.promiseTable.get(vpid);
    // console.log(`unsubscribeKernelToPromise ${vpid} d=${p.decider}`);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved, `${vpid} already resolved`);
    p.kernelIsSubscribed = false;
  }

  function insistPromiseIsUnresolved(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved, `${vpid} was already resolved`);
  }

  function markPromiseAsResolved(vpid, resolution) {
    const p = state.promiseTable.get(vpid);
    assert(p, `unknown ${vpid}`);
    assert(!p.resolved);
    if (resolution.type === 'object') {
      assert(resolution.slot, `resolution(object) requires .slot`);
    } else if (resolution.type === 'data') {
      insistCapData(resolution.data);
    } else if (resolution.type === 'reject') {
      insistCapData(resolution.data);
    } else {
      throw new Error(`unknown resolution type ${resolution.type}`);
    }
    p.resolved = true;
    p.resolution = resolution;
    p.decider = undefined;
    p.subscribers = undefined;
    p.kernelIsSubscribed = undefined;
  }

  return harden({
    trackUnresolvedPromise,
    allocateUnresolvedPromise,
    allocateResolvedPromiseID,

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
