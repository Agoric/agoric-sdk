import { assert, details as X } from '@agoric/assert';
import {
  flipRemoteSlot,
  insistRemoteType,
  parseRemoteSlot,
} from './parseRemoteSlot';
import { cdebug } from './cdebug';

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
    assert(lpid, X`unknown remote ${remoteID} promise ${rpid}`);
    const { subscribers } = state.getPromiseSubscribers(lpid);
    assert(
      subscribers.indexOf(remoteID) === -1,
      X`attempt to retire remote ${remoteID} subscribed promise ${rpid}`,
    );
    remote.deleteRemoteMapping(rpid, lpid);
    cdebug(`comms delete mapping r<->k ${remoteID} {rpid}<=>${lpid}`);
  }

  function beginRemotePromiseIDRetirement(remoteID, rpid) {
    insistRemoteType('promise', rpid);
    const remote = state.getRemote(remoteID);
    const lpid = remote.mapFromRemote(flipRemoteSlot(rpid));
    remote.deleteToRemoteMapping(lpid);
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
    const lref = remote.mapFromRemote(rref);
    assert(lref, X`${rref} must already be in remote ${rname(remote)}`);
    return lref;
  }

  function addLocalObjectForRemote(remote, roid) {
    // The index must be allocated by them. If we allocated it, it should
    // have been in our table already, and the fact that it isn't means
    // they're reaching for something we haven't given them.
    assert(
      !parseRemoteSlot(roid).allocatedByRecipient,
      `I don't remember giving ${roid} to remote ${rname(remote)}`,
    );

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
    assert(
      !parseRemoteSlot(rpid).allocatedByRecipient,
      `I don't remember giving ${rpid} to remote ${rname(remote)}`,
    );
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
    if (!remote.mapFromRemote(rref)) {
      const { type } = parseRemoteSlot(rref);
      if (type === 'object') {
        addLocalObjectForRemote(remote, rref);
      } else if (type === 'promise') {
        addLocalPromiseForRemote(remote, rref);
      } else {
        assert.fail(X`cannot accept type ${type} from remote`);
      }
    }
    return remote.mapFromRemote(rref);
  }

  function provideLocalForRemoteResult(remoteID, result) {
    insistRemoteType('promise', result);
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
