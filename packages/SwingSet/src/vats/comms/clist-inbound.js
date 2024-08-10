import { Fail } from '@endo/errors';
import {
  flipRemoteSlot,
  insistRemoteType,
  parseRemoteSlot,
} from './parseRemoteSlot.js';
import { cdebug } from './cdebug.js';

function rname(remote) {
  return `${remote.remoteID()} (${remote.name()})`;
}

export function makeInbound(state) {
  // get-*: the entry must be present
  // add-*: the entry must not be present. add one.
  // provide-*: return an entry, adding one if necessary

  // *-LocalForRemote: receiving an object/promise from a remote machine

  function retireRemotePromiseID(remoteID, rpid) {
    insistRemoteType('promise', rpid);
    const remote = state.getRemote(remoteID);
    const lpid = remote.mapFromRemote(rpid);
    lpid || Fail`unknown remote ${remoteID} promise ${rpid}`;
    const { subscribers } = state.getPromiseSubscribers(lpid);
    subscribers.indexOf(remoteID) === -1 ||
      Fail`attempt to retire remote ${remoteID} subscribed promise ${rpid}`;
    remote.deleteRemoteMapping(lpid);
    cdebug(`comms delete mapping r<->k ${remoteID} ${rpid}<=>${lpid}`);
  }

  function beginRemotePromiseIDRetirement(remoteID, rpid) {
    insistRemoteType('promise', rpid);
    const remote = state.getRemote(remoteID);
    const lpid = remote.mapFromRemote(flipRemoteSlot(rpid));
    remote.enqueueRetirement(rpid);
    cdebug(`comms begin retiring ${remoteID} ${rpid} ${lpid}`);
  }

  function retireAcknowledgedRemotePromiseIDs(remoteID, ackSeqNum) {
    const remote = state.getRemote(remoteID);
    const readyToRetire = remote.getReadyRetirements(ackSeqNum);
    for (const rpid of readyToRetire) {
      retireRemotePromiseID(remoteID, flipRemoteSlot(rpid));
    }
  }

  function getLocalForRemote(remoteID, rref) {
    const remote = state.getRemote(remoteID);
    const { mapFromRemote, isReachable } = remote;
    const lref = mapFromRemote(rref);
    lref || Fail`${rref} must already be in remote ${rname(remote)}`;
    if (parseRemoteSlot(rref).type === 'object') {
      isReachable(lref) || Fail`remote sending to unreachable ${lref}`;
    }
    return lref;
  }

  function addLocalObjectForRemote(remote, roid) {
    // The index must be allocated by them. If we allocated it, it should
    // have been in our table already, and the fact that it isn't means
    // they're reaching for something we haven't given them.
    !parseRemoteSlot(roid).allocatedByRecipient ||
      Fail`I don't remember giving ${roid} to remote ${rname(remote)}`;

    // So this must be a new import. Allocate a new vat object for it, which
    // will be the local machine's proxy for use by all other local vats, as
    // well as third party machines.
    const loid = state.allocateObject(remote.remoteID());

    remote.addRemoteMapping(roid, loid);
    cdebug(
      `comms import ${remote.remoteID()}/${remote.name()} ${loid} ${roid}`,
    );
  }

  function addLocalPromiseForRemote(remote, rpid) {
    !parseRemoteSlot(rpid).allocatedByRecipient ||
      Fail`I don't remember giving ${rpid} to remote ${rname(remote)}`;
    // allocate a new lpNN, remember them as the decider, add to clist
    const lpid = state.allocatePromise();
    state.changeDeciderToRemote(lpid, remote.remoteID());
    remote.addRemoteMapping(rpid, lpid);
    cdebug(
      `comms import ${remote.remoteID()}/${remote.name()} ${lpid} ${rpid}`,
    );
  }

  function provideLocalForRemote(remoteID, rref) {
    // We're receiving a slot from a remote system. If they've sent it to us
    // previously, or if we're the ones who sent it to them earlier, it will be
    // in the inbound table already.
    const remote = state.getRemote(remoteID);
    const { type, allocatedByRecipient } = parseRemoteSlot(rref);
    // !allocatedByRecipient means we're willing to allocate
    let lref = remote.mapFromRemote(rref);
    if (!lref) {
      if (type === 'object') {
        addLocalObjectForRemote(remote, rref);
      } else if (type === 'promise') {
        addLocalPromiseForRemote(remote, rref);
      } else {
        Fail`cannot accept type ${type} from remote`;
      }
      lref = remote.mapFromRemote(rref);
    }

    // in either case, we need to mark imports or re-imports as reachable
    if (type === 'object') {
      // Senders are very polite and always translate rrefs into the
      // recipient's number space. So if we receive ro-2 from the remote
      // (!allocatedByRecipient), that means it was allocated by the remote,
      // and this is an exporting reference. We're willing to allocate an
      // lref on this inbound pathway.
      const doSetReachable = !allocatedByRecipient;
      if (doSetReachable) {
        // the remote is exporting, not importing
        const isImportFromComms = false;
        remote.setReachable(lref, isImportFromComms);
      }
      remote.isReachable(lref) || Fail`remote using unreachable ${lref}`;
    }

    return lref;
  }

  function provideLocalForRemoteResult(remoteID, result) {
    insistRemoteType('promise', result);
    // Comms is a pipelining vat which means the result may be allocated by
    // any side, at any time. Unlike the kernel checks, as long as the decider
    // is correct, and the promise is unresolved, it's valid as a result.
    const lpid = provideLocalForRemote(remoteID, result);
    // this asserts they had control over lpid, and that it wasn't already
    // resolved. TODO: reject somehow rather than crash weirdly, we can't
    // keep them from trying either
    state.insistPromiseIsUnresolved(lpid);
    state.changeDeciderFromRemoteToComms(lpid, remoteID);
    state.subscribeRemoteToPromise(lpid, remoteID); // auto-subscribe sender
    return lpid;
  }

  return harden({
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
    retireRemotePromiseID,
    beginRemotePromiseIDRetirement,
    retireAcknowledgedRemotePromiseIDs,
  });
}
