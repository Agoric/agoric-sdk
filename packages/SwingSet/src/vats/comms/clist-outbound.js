import { Fail } from '@endo/errors';
import { parseLocalSlot, insistLocalType } from './parseLocalSlots.js';
import {
  flipRemoteSlot,
  insistRemoteType,
  parseRemoteSlot,
} from './parseRemoteSlot.js';
import { cdebug } from './cdebug.js';

function rname(remote) {
  return `${remote.remoteID()} (${remote.name()})`;
}

export function makeOutbound(state) {
  function getRemoteForLocal(remoteID, lref) {
    const remote = state.getRemote(remoteID);
    const { mapToRemote, isReachable } = remote;
    const rref = mapToRemote(lref);
    rref || Fail`${lref} must already be in remote ${rname(remote)}`;
    if (parseRemoteSlot(rref).type === 'object') {
      isReachable(lref) || Fail`sending unreachable ${lref} to remote`;
    }
    return rref;
  }

  function addRemoteObjectForLocal(remote, loid) {
    const owner = state.getObject(loid);
    owner !== remote || Fail`${loid} already came from remote ${rname(remote)}`;

    // The recipient will receive ro-NN
    const roid = remote.allocateRemoteObject();
    remote.addRemoteMapping(flipRemoteSlot(roid), loid);
    // but when they send it back, they'll send ro+NN
    cdebug(
      `comms export ${remote.remoteID()}/${remote.name()} ${loid} ${roid}`,
    );
  }

  function addRemotePromiseForLocal(remote, lpid) {
    const status = state.getPromiseStatus(lpid);
    status || Fail`promise ${lpid} wasn't being tracked`;

    const rpid = remote.allocateRemotePromise();
    remote.addRemoteMapping(flipRemoteSlot(rpid), lpid);
    cdebug(
      `comms export ${remote.remoteID()}/${remote.name()} ${lpid} ${rpid}`,
    );

    if (status === 'unresolved') {
      // arrange to send it later, once it resolves
      state.subscribeRemoteToPromise(lpid, remote.remoteID());
    }
  }

  function provideRemoteForLocal(remoteID, lref) {
    // We're sending a slot to a remote system. If we've ever sent it before,
    // or if they're the ones who sent it to us in the first place, it will be
    // in the outbound table already.
    const remote = state.getRemote(remoteID);
    const { type } = parseLocalSlot(lref);
    let rref = remote.mapToRemote(lref);
    if (!rref) {
      if (type === 'object') {
        addRemoteObjectForLocal(remote, lref);
      } else if (type === 'promise') {
        addRemotePromiseForLocal(remote, lref);
      } else {
        Fail`cannot send type ${type} to remote`;
      }
      rref = remote.mapToRemote(lref);
    }

    // in either case, we need to mark exports or re-exports as reachable,
    // and update the last-sent counter
    if (type === 'object') {
      const { allocatedByRecipient } = parseRemoteSlot(rref);
      // `rref` is what the remote wants to hear, so allocatedByRecipient
      // means they exported it, !allocatedByRecipient means we did
      const doSetReachable = !allocatedByRecipient;
      if (doSetReachable) {
        // the remote is always importing it
        const isImportFromComms = true;
        remote.setReachable(lref, isImportFromComms);
        // This provideRemoteForLocal was called as part of translating a
        // message to send (either a delivery, in `sendToRemote()`, or a
        // resolution notification, in `resolveToRemote`). Both cases finish
        // with a `transmit()`, which uses `remote.nextSendSeqNum()` to learn
        // what sequence number to use. (nextSendSeqNum should always know
        // the right number even if seqnums are elided). We snarf that seqnum
        // here, to remember when we last told the remote about this object.
        // We can safely ignore any drop or retire that doesn't demonstrate
        // knowledge of this outbound message.
        const seqNum = remote.nextSendSeqNum();
        remote.setLastSent(lref, seqNum);
      }
      remote.isReachable(lref) || Fail`sending unreachable rref ${lref}`;
    }

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
    state.insistPromiseIsUnresolved(lpid);

    const rpid = provideRemoteForLocal(remoteID, lpid);
    insistRemoteType('promise', rpid);

    state.changeDeciderToRemote(lpid, remoteID);
    state.unsubscribeRemoteFromPromise(lpid, remoteID);

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
