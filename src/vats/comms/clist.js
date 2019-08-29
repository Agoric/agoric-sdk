import Nat from '@agoric/nat';
import { makeVatSlot, parseVatSlot, insistVatType } from '../parseVatSlots';
import {
  flipRemoteSlot,
  makeRemoteSlot,
  parseRemoteSlot,
} from './parseRemoteSlot';
import { getRemote } from './remote';
import { allocatePromise } from './state';
import { insist } from '../../kernel/insist';

export function getOutbound(state, remoteID, target) {
  const remote = getRemote(state, remoteID);

  if (!remote.toRemote.has(target)) {
    throw new Error(
      `target ${target} must already be in ${remote.remoteID} (${remote.name})`,
    );
  }
  return remote.toRemote.get(target);
}

export function mapOutbound(state, remoteID, s, syscall) {
  // We're sending a slot to a remote system. If we've ever sent it before,
  // or if they're the ones who sent it to us in the first place, it will be
  // in the outbound table already.
  const remote = getRemote(state, remoteID);
  const existing = remote.toRemote.get(s);

  if (existing === undefined) {
    const { type, allocatedByVat } = parseVatSlot(s);
    if (type === 'object') {
      if (allocatedByVat) {
        // we (the comms vat) allocated this local object earlier, because
        // we sent it into the kernel to some other local vat, because it
        // represents some object on a remote vat that we're proxying. But
        // if it wasn't in the outbound table for *this* remote, then it
        // must have arrived from some *different* remote, which makes this
        // a three-party handoff, and we haven't implemented that yet.
        if (!state.objectTable.has(s)) {
          // Or it's a local object (like one of the receivers) that isn't
          // supposed to be sent off-device
          throw new Error(`sending non-remote object ${s} to remote machine`);
        }
        const owner = state.objectTable.get(s);
        throw new Error(
          `unimplemented three-party handoff (object ${s}) from ${owner} to ${remote.id})`,
        );
      } else {
        // allocated by kernel: a local vat is exposing an object to the
        // remote machine. Allocate a clist entry for it.
        const index = remote.nextObjectIndex;
        remote.nextObjectIndex += 1;
        // The recipient will receive ro-NN
        remote.toRemote.set(s, makeRemoteSlot('object', false, index));
        // but when they send it back, they'll send ro+NN
        remote.fromRemote.set(makeRemoteSlot('object', true, index), s);
      }
    } else if (type === 'promise') {
      if (allocatedByVat) {
        throw new Error(`unable to handle vat-allocated promise ${s} yet`);
      } else {
        if (state.promiseTable.has(s)) {
          // We already know about this promise, either because it arrived
          // from some other remote, or because we sent it to some other
          // remote. That limits what we can do with it. We can only send the
          // promise if we allocated the index and we are the decider.
          const p = state.promiseTable.get(s);
          insist(
            !p.owner,
            `promise ${s} owner is ${p.owner}, not me, so I cannot send to ${remoteID}`,
          );
          insist(
            !p.decider,
            `promise ${s} decider is ${p.decider}, not me, so I cannot send to ${remoteID}`,
          );
          // also we can't handle more than a single subscriber yet
          insist(
            !p.subscriber,
            `promise ${s} already has subscriber ${p.subscriber}`,
          );
          // TODO: we currently only handle sending unresolved promises, but
          // obviously we must fix that, by arranging to send a resolution
          // message just after we send the reference that creates it, or
          // perhaps tolerating sending the messages in the opposite order.
          insist(
            !p.resolved,
            `promise ${s} is already resolved and I can't deal with that yet`,
          );
        }
        const index = remote.nextPromiseIndex;
        remote.nextPromiseIndex += 1;
        // the recipient receives rp-NN
        const rs = makeRemoteSlot('promise', false, index);
        remote.toRemote.set(s, rs);
        remote.fromRemote.set(flipRemoteSlot(rs), s);
        if (!state.promiseTable.has(s)) {
          state.promiseTable.set(s, {
            owner: null, // kernel-allocated, so ID is this-machine-allocated
            resolved: false,
            decider: null, // we decide
            subscriber: remoteID,
          });
          syscall.subscribe(s);
        }
      }
    } else if (type === 'resolver') {
      // TODO: is this clause currently unused?
      insist(!allocatedByVat, `resolver ${s} must be kernel-allocated for now`);
      const index = remote.nextResolverIndex;
      remote.nextResolverIndex += 1;
      // recipient gets rr-NN
      remote.toRemote.set(s, makeRemoteSlot('resolver', false, index));
      // recipient sends rr+NN
      remote.fromRemote.set(makeRemoteSlot('resolver', true, index), s);
    } else {
      throw new Error(`unknown type ${type}`);
    }
  }
  return remote.toRemote.get(s);
}

export function mapOutboundResult(state, remoteID, s) {
  // We're sending a slot to a remote system for use as a result. We must do
  // some additional who-is-the-decider checks.
  const remote = getRemote(state, remoteID);
  insistVatType('promise', s);

  if (!state.promiseTable.has(s)) {
    state.promiseTable.set(s, {
      owner: null, // todo: what is this for anyways?
      resolved: false,
      decider: null, // for a brief moment, we're the decider
      subscriber: null,
    });
  }
  const p = state.promiseTable.get(s);
  // we (the local machine) must have resolution authority, which happens for
  // new promises, and for old ones that arrived as the 'result' of inbound
  // messages from remote machines (transferring authority to us).
  insist(!p.decider, `result ${s} has decider ${p.decider}, not us`);
  insist(!p.resolved, `result ${s} is already resolved`);
  // if we received this promise from remote1, we can send it back to them,
  // but we can't send it to any other remote.
  insist(
    !p.subscriber || p.subscriber === remoteID,
    `result ${s} has subscriber ${p.subscriber}, not none or ${remoteID}`,
  );
  // todo: if we previously held resolution authority for this promise, then
  // transferred it to some local vat, we'll have subscribed to the kernel to
  // hear about it. If we then get the authority back again, we no longer
  // want to hear about its resolution (since we're the ones doing the
  // resolving), but the kernel still thinks of us as subscribing, so we'll
  // get a bogus dispatch.notifyFulfill*. Currently we throw an error, which
  // is currently ignored but might prompt a vat shutdown in the future.

  p.decider = remoteID; // transfer authority to recipient

  const existing = remote.toRemote.get(s);
  if (!existing) {
    const index = remote.nextPromiseIndex;
    remote.nextPromiseIndex += 1;
    // the recipient receives rp-NN
    const rs = makeRemoteSlot('promise', false, index);
    remote.toRemote.set(s, rs);
    remote.fromRemote.set(flipRemoteSlot(rs), s);
  }

  return remote.toRemote.get(s);
}

export function mapInbound(state, remoteID, s, _syscall) {
  // We're receiving a slot from a remote system. If they've sent it to us
  // previously, or if we're the ones who sent it to them earlier, it will be
  // in the inbound table already.
  const remote = getRemote(state, remoteID);
  const existing = remote.fromRemote.get(s);

  if (existing === undefined) {
    const { type, allocatedByRecipient } = parseRemoteSlot(s);
    if (type === 'object') {
      if (allocatedByRecipient) {
        throw new Error(`I don't remember giving ${s} to ${remoteID}`);
      }
      // this must be a new import. Allocate a new vat object for it, which
      // will be the local machine's proxy for use by all other local vats
      const localSlot = makeVatSlot(type, true, state.nextObjectIndex);
      state.nextObjectIndex += 1;

      // they sent us ro-NN
      remote.fromRemote.set(s, localSlot);
      // when we send it back, we'll send ro+NN
      remote.toRemote.set(localSlot, flipRemoteSlot(s));
      // and remember how to route this later
      state.objectTable.set(localSlot, remoteID);
    } else if (type === 'promise') {
      if (allocatedByRecipient) {
        throw new Error(`promises not implemented yet`);
      } else {
        const promiseID = allocatePromise(state);
        state.promiseTable.set(promiseID, {
          owner: remoteID,
          resolved: false,
          decider: remoteID,
          subscriber: null,
        });
        remote.fromRemote.set(s, promiseID);
        remote.toRemote.set(promiseID, s);
        console.log(`inbound promise ${s} mapped to ${promiseID}`);
      }
    } else {
      throw new Error(`unknown type ${type}`);
    }
  }
  return remote.fromRemote.get(s);
}

export function getInbound(state, remoteID, target) {
  const remote = getRemote(state, remoteID);
  if (!remote.fromRemote.has(target)) {
    throw new Error(
      `target ${target} must already be in ${remote.remoteID} (${remote.name})`,
    );
  }
  return remote.fromRemote.get(target);
}

export function addEgress(state, remoteID, remoteRefID, localRef) {
  // Make 'localRef' available to remoteID as 'remoteRefID'. This is kind of
  // like mapOutbound, but it uses a caller-provided remoteRef instead of
  // allocating a new one. This is used to bootstrap initial connectivity
  // between machines.
  const remote = getRemote(state, remoteID);
  Nat(remoteRefID);
  insistVatType('object', localRef);
  const { allocatedByVat } = parseVatSlot(localRef);
  insist(!allocatedByVat, `localRef should be kernel-allocated`);
  insist(!remote.toRemote.has(localRef), `already present ${localRef}`);

  const inboundRemoteRef = makeRemoteSlot('object', true, remoteRefID);
  const outboundRemoteRef = flipRemoteSlot(inboundRemoteRef);
  insist(
    !remote.fromRemote.has(inboundRemoteRef),
    `already present ${inboundRemoteRef}`,
  );
  insist(
    !remote.toRemote.has(outboundRemoteRef),
    `already present ${outboundRemoteRef}`,
  );
  remote.fromRemote.set(inboundRemoteRef, localRef);
  remote.toRemote.set(localRef, outboundRemoteRef);
  if (remote.nextObjectIndex <= remoteRefID) {
    remote.nextObjectIndex = remoteRefID + 1;
  }
}

// to let machine2 access 'o-5' on machine1, pick an unused index (12), then:
// * machine1 does addEgress(state, 'machine2', 12, 'o-5')
// * machine2 does addIngress(state, 'machine1', 12, 'o+8')
// Messages sent to the object:
// * machine2 toRemote[o+8] = ro+12
// * machine1 fromRemote[ro+12] = o-5
// Messages sent from m1 to m2 that reference the object:
// * machine1 toRemote[o-5] = ro-12
// * machine2 fromRemote[ro-12] = o+8

export function addIngress(state, remoteID, remoteRefID) {
  // Return a localRef that maps to 'remoteRef' at remoteRefID. Just a
  // wrapper around mapInbound.
  const inboundRemoteRef = makeRemoteSlot('object', false, remoteRefID);
  const localRef = mapInbound(
    state,
    remoteID,
    inboundRemoteRef,
    'fake syscall unused',
  );
  return localRef;
}
