import { assert, details as X } from '@agoric/assert';
import { parseLocalSlot, insistLocalType } from './parseLocalSlots';
import {
  flipRemoteSlot,
  insistRemoteType,
  makeRemoteSlot,
} from './parseRemoteSlot';
import { getRemote } from './remote';
import { cdebug } from './cdebug';

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

  function getRemoteForLocal(remoteID, lref) {
    const remote = getRemote(state, remoteID);
    const rref = remote.toRemote.get(lref);
    assert(rref, X`${lref} must already be in ${rname(remote)}`);
    remote.lastMentioned.set(rref, remote.nextSendSeqNum);
    return rref;
  }

  function addRemoteObjectForLocal(remote, loid) {
    const owner = state.objectTable.get(loid);
    assert(owner !== remote, `hey ${loid} already came from ${rname(remote)}`);

    // allocate a clist entry for it
    const index = remote.nextObjectIndex;
    remote.nextObjectIndex += 1;
    // The recipient will receive ro-NN
    const roid = makeRemoteSlot('object', false, index);
    remote.toRemote.set(loid, roid);
    // but when they send it back, they'll send ro+NN
    remote.fromRemote.set(flipRemoteSlot(roid), loid);
    cdebug(`comms export ${remote.remoteID}/${remote.name} ${loid} ${roid}`);
  }

  function addRemotePromiseForLocal(remote, lpid) {
    const p = state.promiseTable.get(lpid);
    assert(p, X`promise ${lpid} wasn't being tracked`);

    const index = remote.nextPromiseIndex;
    remote.nextPromiseIndex += 1;
    // the recipient receives rp-NN
    const rpid = makeRemoteSlot('promise', false, index);
    remote.toRemote.set(lpid, rpid);
    remote.fromRemote.set(flipRemoteSlot(rpid), lpid);
    cdebug(`comms export ${remote.remoteID}/${remote.name} ${lpid} ${rpid}`);

    if (!p.resolved) {
      // arrange to send it later, once it resolves
      subscribeRemoteToPromise(lpid, remote.remoteID);
    }
  }

  function provideRemoteForLocal(remoteID, lref) {
    // We're sending a slot to a remote system. If we've ever sent it before,
    // or if they're the ones who sent it to us in the first place, it will be
    // in the outbound table already.
    const remote = getRemote(state, remoteID);
    if (!remote.toRemote.has(lref)) {
      const { type } = parseLocalSlot(lref);
      if (type === 'object') {
        addRemoteObjectForLocal(remote, lref);
      } else if (type === 'promise') {
        addRemotePromiseForLocal(remote, lref);
      } else {
        assert.fail(X`cannot send type ${type} to remote`);
      }
    }
    const rref = remote.toRemote.get(lref);
    remote.lastMentioned.set(rref, remote.nextSendSeqNum);
    return rref;
  }

  function provideRemoteForLocalResult(remoteID, lpid) {
    // TODO: if this fails, we somehow tried to use a previously-resolved
    // promise as a result. I think we check for this on the way in
    // (sendFromKernel and sendFromRemote), so I don't think we should be
    // able to trigger that. In other places, we have a TODO note to "reject
    // somehow rather than crash weirdly" for broken things that we can't
    // prevent other vats from trying to do. But I don't think we need one
    // here.
    insistLocalType('promise', lpid);
    insistPromiseIsUnresolved(lpid);

    const rpid = provideRemoteForLocal(remoteID, lpid);
    insistRemoteType('promise', rpid);

    changeDeciderToRemote(lpid, remoteID);
    unsubscribeRemoteFromPromise(lpid, remoteID);

    // TODO: think about this todo, it might still be a concern
    // todo: if we previously held resolution authority for this promise, then
    // transferred it to some local vat, we'll have subscribed to the kernel to
    // hear about it. If we then get the authority back again, we no longer
    // want to hear about its resolution (since we're the ones doing the
    // resolving), but the kernel still thinks of us as subscribing, so we'll
    // get a bogus dispatch.notify. Currently we throw an error, which
    // is currently ignored but might prompt a vat shutdown in the future.

    return rpid;
  }

  return harden({
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,
  });
}
