import { assert } from '@agoric/assert';
import { makeVatSlot } from '../../parseVatSlots';
import {
  flipRemoteSlot,
  insistRemoteType,
  parseRemoteSlot,
} from './parseRemoteSlot';
import { getRemote } from './remote';

function rname(remote) {
  return `${remote.remoteID} (${remote.name})`;
}

export function makeInbound(state, stateKit) {
  const {
    allocateUnresolvedPromise,
    insistPromiseIsUnresolved,
    subscribeRemoteToPromise,
    changeDeciderToRemote,
    changeDeciderFromRemoteToComms,
  } = stateKit;

  // get-*: the entry must be present
  // add-*: the entry must not be present. add one.
  // provide-*: return an entry, adding one if necessary

  // *-LocalForRemote: receiving an object/promise from a remote machine

  function getLocalForRemote(remoteID, rref) {
    const remote = getRemote(state, remoteID);
    const lref = remote.fromRemote.get(rref);
    assert(lref, `${rref} must already be in ${rname(remote)}`);
    return lref;
  }

  function addLocalObjectForRemote(remote, roid) {
    // The index must be allocated by them. If we allocated it, it should
    // have been in our table already, and the fact that it isn't means
    // they're reaching for something we haven't given them.
    assert(
      !parseRemoteSlot(roid).allocatedByRecipient,
      `I don't remember giving ${roid} to ${rname(remote)}`,
    );

    // So this must be a new import. Allocate a new vat object for it, which
    // will be the local machine's proxy for use by all other local vats, as
    // well as third party machines.
    const vatoid = makeVatSlot('object', true, state.nextObjectIndex);
    state.nextObjectIndex += 1;

    // remember who owns this object, to route messages later
    state.objectTable.set(vatoid, remote.remoteID);

    // they sent us ro-NN
    remote.fromRemote.set(roid, vatoid);
    // when we send it back, we'll send ro+NN
    remote.toRemote.set(vatoid, flipRemoteSlot(roid));
  }

  function addLocalPromiseForRemote(remote, rpid) {
    assert(
      !parseRemoteSlot(rpid).allocatedByRecipient,
      `I don't remember giving ${rpid} to ${rname(remote)}`,
    );
    // allocate a new p+NN, remember them as the decider, add to clist
    const vpid = allocateUnresolvedPromise();
    changeDeciderToRemote(vpid, remote.remoteID);
    remote.fromRemote.set(rpid, vpid);
    remote.toRemote.set(vpid, flipRemoteSlot(rpid));
  }

  function provideLocalForRemote(remoteID, rref) {
    // We're receiving a slot from a remote system. If they've sent it to us
    // previously, or if we're the ones who sent it to them earlier, it will be
    // in the inbound table already.
    const remote = getRemote(state, remoteID);
    if (!remote.fromRemote.has(rref)) {
      const { type } = parseRemoteSlot(rref);
      if (type === 'object') {
        addLocalObjectForRemote(remote, rref);
      } else if (type === 'promise') {
        addLocalPromiseForRemote(remote, rref);
      } else {
        throw Error(`cannot accept type ${type} from remote`);
      }
    }
    return remote.fromRemote.get(rref);
  }

  function provideLocalForRemoteResult(remoteID, result) {
    insistRemoteType('promise', result);
    const vpid = provideLocalForRemote(remoteID, result);
    // this asserts they had control over vpid, and that it wasn't already
    // resolved. TODO: reject somehow rather than crash weirdly, we can't
    // keep them from trying either
    insistPromiseIsUnresolved(vpid);
    changeDeciderFromRemoteToComms(vpid, remoteID);
    subscribeRemoteToPromise(vpid, remoteID); // auto-subscribe sender
    return vpid;
  }

  return harden({
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
  });
}
