import { assert } from '@agoric/assert';
import { parseVatSlot, insistVatType } from '../../parseVatSlots';
import {
  flipRemoteSlot,
  insistRemoteType,
  makeRemoteSlot,
} from './parseRemoteSlot';
import { getRemote } from './remote';

function rname(remote) {
  return `${remote.remoteID} (${remote.name})`;
}

export function makeOutbound(state, stateKit) {
  const {
    insistPromiseIsUnresolved,
    subscribeRemoteToPromise,
    unsubscribeRemoteFromPromise,
    changeDeciderToRemote,
  } = stateKit;

  let resolveToRemote; // cyclic, set later

  function setDeliveryKit(deliveryKit) {
    resolveToRemote = deliveryKit.resolveToRemote;
  }

  function getRemoteForLocal(remoteID, lref) {
    const remote = getRemote(state, remoteID);
    const rref = remote.toRemote.get(lref);
    assert(rref, `${lref} must already be in ${rname(remote)}`);
    return rref;
  }

  function addRemoteObjectForLocal(remote, vatoid) {
    if (parseVatSlot(vatoid).allocatedByVat) {
      // We (the comms vat in machine A) allocated this local object earlier,
      // because it arrived from some remote system. But if it came from the
      // machine we're talking to now (C), it would have already been in
      // their clist. So it must be coming from some other remote (B), making
      // this a three-party transfer. We handle these by creating a proxy:
      // when C sends it messages, we'll relay them to B.

      const owner = state.objectTable.get(vatoid);
      // make sure it's not a local object (like one of the receivers): those
      // aren't supposed to be sent off-device
      assert(owner, `sending non-remote object ${vatoid} to remote machine`);
      assert(
        owner !== remote,
        `hey ${vatoid} already came from ${rname(remote)}`,
      );
      // if we were logging these things
      // console.log(`three-party proxy for ${vatoid} from ${owner} to ${rname(remote)}`);
    }

    // allocate a clist entry for it
    const index = remote.nextObjectIndex;
    remote.nextObjectIndex += 1;
    // The recipient will receive ro-NN
    const roid = makeRemoteSlot('object', false, index);
    remote.toRemote.set(vatoid, roid);
    // but when they send it back, they'll send ro+NN
    remote.fromRemote.set(flipRemoteSlot(roid), vatoid);
  }

  function addRemotePromiseForLocal(remote, vpid) {
    const p = state.promiseTable.get(vpid);
    assert(p, `promise ${vpid} wasn't being tracked`);

    const index = remote.nextPromiseIndex;
    remote.nextPromiseIndex += 1;
    // the recipient receives rp-NN
    const rpid = makeRemoteSlot('promise', false, index);
    remote.toRemote.set(vpid, rpid);
    remote.fromRemote.set(flipRemoteSlot(rpid), vpid);

    if (p.resolved) {
      // we must send the resolution *after* the message which introduces it
      const { remoteID } = remote;
      Promise.resolve().then(() =>
        resolveToRemote(remoteID, vpid, p.resolution),
      );
    } else {
      // or arrange to send it later, once it resolves
      subscribeRemoteToPromise(vpid, remote.remoteID);
    }
  }

  function provideRemoteForLocal(remoteID, lref) {
    // We're sending a slot to a remote system. If we've ever sent it before,
    // or if they're the ones who sent it to us in the first place, it will be
    // in the outbound table already.
    const remote = getRemote(state, remoteID);
    if (!remote.toRemote.has(lref)) {
      const { type } = parseVatSlot(lref);
      if (type === 'object') {
        addRemoteObjectForLocal(remote, lref);
      } else if (type === 'promise') {
        addRemotePromiseForLocal(remote, lref);
      } else {
        throw Error(`cannot send type ${type} to remote`);
      }
    }
    return remote.toRemote.get(lref);
  }

  function provideRemoteForLocalResult(remoteID, vpid) {
    // TODO: if this fails, we somehow tried to use a previously-resolved
    // promise as a result. I think we check for this on the way in
    // (sendFromKernel and sendFromRemote), so I don't think we should be
    // able to trigger that. In other places, we have a TODO note to "reject
    // somehow rather than crash weirdly" for broken things that we can't
    // prevent other vats from trying to do. But I don't think we need one
    // here.
    insistVatType('promise', vpid);
    insistPromiseIsUnresolved(vpid);

    const rpid = provideRemoteForLocal(remoteID, vpid);
    insistRemoteType('promise', rpid);

    changeDeciderToRemote(vpid, remoteID);
    unsubscribeRemoteFromPromise(vpid, remoteID);

    // TODO: think about this todo, it might still be a concern
    // todo: if we previously held resolution authority for this promise, then
    // transferred it to some local vat, we'll have subscribed to the kernel to
    // hear about it. If we then get the authority back again, we no longer
    // want to hear about its resolution (since we're the ones doing the
    // resolving), but the kernel still thinks of us as subscribing, so we'll
    // get a bogus dispatch.notifyFulfill*. Currently we throw an error, which
    // is currently ignored but might prompt a vat shutdown in the future.

    return rpid;
  }

  return harden({
    setDeliveryKit,

    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,
  });
}
