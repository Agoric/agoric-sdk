import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { insistCapData } from '../../capdata.js';
import { makeVatSlot, insistVatType } from '../../parseVatSlots.js';
import { makeLocalSlot, parseLocalSlot } from './parseLocalSlots.js';
import { initializeRemoteState, makeRemote, insistRemoteID } from './remote.js';
import { cdebug } from './cdebug.js';

const COMMS = 'comms';
const KERNEL = 'kernel';

const enableLocalPromiseGC = true;

function makeEphemeralSyscallVatstore() {
  console.log('making fake vatstore');
  const map = new Map();
  return harden({
    vatstoreGet: key => map.get(key),
    vatstoreSet: (key, value) => map.set(key, value),
    vatstoreDelete: key => map.delete(key),
  });
}

function makeSyscallStore(syscall) {
  return harden({
    get(key) {
      assert.typeof(key, 'string');
      return syscall.vatstoreGet(key);
    },
    set(key, value) {
      assert.typeof(key, 'string');
      assert.typeof(value, 'string');
      syscall.vatstoreSet(key, value);
    },
    delete(key) {
      assert.typeof(key, 'string');
      return syscall.vatstoreDelete(key);
    },
    getRequired(key) {
      assert.typeof(key, 'string');
      const result = syscall.vatstoreGet(key);
      assert(result !== undefined, X`store lacks required key ${key}`);
      return result;
    },
  });
}

function commaSplit(s) {
  if (s === undefined || s === '') {
    return [];
  }
  return s.split(',');
}

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

export function makeState(syscall, identifierBase = 0) {
  // Comms vat state is kept in the vatstore, which is managed by the kernel and
  // accessed as part of the syscall interface.  The schema used here is very
  // similar to (in fact, modelled upon) the schema the kernel uses for its own
  // store (since the message routing and object/promise identifier translation
  // functions the comms vat does are very parallel to what the kernel does).
  //
  // The schema is:
  //
  // initialized = true // present if this comms vat has had its storage intialized
  //
  // o.nextID = $NN  // kernel-facing object identifier allocation counter (o+NN)
  // p.nextID = $NN  // kernel-facing promise identifier allocation counter (p+NN)
  // c.$kfref = $lref // inbound kernel-facing c-list (o+NN/o-NN/p+NN/p-NN -> loNN/lpNN)
  // c.$lref = $kfref // outbound kernel-facing c-list (loNN/lpNN -> o+NN/o-NN/p+NN/p-NN)
  // meta.$kfref = true // flag that $kfref (o+NN/o-NN) is a directly addressable control object
  //
  // lo.nextID = $NN // local object identifier allocation counter (loNN)
  // lo$NN.owner = r$NN | kernel // owners of local objects (loNN -> rNN)
  //
  // lp.nextID = $NN // local promise identifier allocation counter (lpNN)
  // lp$NN.status = unresolved | fulfilled | rejected
  // lp$NN.refCount = $NN
  // // if unresolved:
  // lp$NN.decider = r$NN | comms | kernel
  // lp$NN.kernelSubscribed = true // present if kernel is subscribed
  // lp$NN.subscribers = '' | r$NN,$rNN...
  // // if fulfilled or rejected:
  // lp$NN.data.body = missing | JSON
  // lp$NN.data.slots = '' | $lref,$lref...
  //
  // r.nextID = $NN  // remote connection identifier allocation counter (rNN)
  // r.$loid = r$NN  // mapping receiver objects to remotes they receive from
  // rname.$name = r$NN // mapping from remote names to remote IDs
  //   (remote name strings are limited to sequences of [A-Za-z0-9.+-] )
  // r$NN.initialized = true // present if this remote has had its storage initialized
  // r$NN.name = name // name for this remote
  // r$NN.transmitterID = $kfref // transmitter object for sending to remote
  // r$NN.c.$rref = $lref // r$NN inbound c-list (ro+NN/ro-NN/rp+NN/rp-NN -> loNN/lpNN)
  // r$NN.c.$lref = $rref // r$NN outbound c-list (loNN/lpNN -> ro+NN/ro-NN/rp+NN/rp-NN)
  // r$NN.sendSeq = $NN // counter for outbound message sequence numbers to r$NN
  // r$NN.recvSeq = $NN // counter for inbound message sequence numbers from r$NN
  // r$NN.o.nextID = $NN // r$NN object identifier allocation counter (ro-NN)
  // r$NN.p.nextID = $NN // r$NN promise identifier allocation counter (rp-NN)
  // r$NN.rq = [[$seqnum,$rpid],[$seqnum,$rpid]...] // r$NN promise retirement queue

  if (!syscall) {
    syscall = makeEphemeralSyscallVatstore();
  }
  const store = makeSyscallStore(syscall);

  function initialize() {
    if (!store.get('initialized')) {
      store.set('identifierBase', `${identifierBase}`);
      store.set('lo.nextID', `${identifierBase + 10}`);
      store.set('lp.nextID', `${identifierBase + 20}`);
      store.set('o.nextID', `${identifierBase + 30}`);
      store.set('p.nextID', `${identifierBase + 40}`);
      store.set('r.nextID', '1');
      store.set('initialized', 'true');
    }
  }

  function deleteLocalPromiseState(lpid) {
    store.delete(`${lpid}.status`);
    store.delete(`${lpid}.decider`);
    store.delete(`${lpid}.kernelSubscribed`);
    store.delete(`${lpid}.subscribers`);
    store.delete(`${lpid}.data.body`);
    store.delete(`${lpid}.data.slots`);
    store.delete(`${lpid}.refCount`);
  }

  function deleteLocalPromise(lpid) {
    const status = store.getRequired(`${lpid}.status`);
    switch (status) {
      case 'unresolved':
        break;
      case 'fulfilled':
        break;
      case 'rejected':
        break;
      default:
        assert.fail(X`unknown status for ${lpid}: ${status}`);
    }
    deleteLocalPromiseState(lpid);
  }

  const deadLocalPromises = new Set();

  /**
   * Increment the reference count associated with some local object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all local objects.
   *
   * @param {string} lref  Ref of the local object whose refcount is to be incremented.
   * @param {string} _tag  Descriptive label for use in diagnostics
   */
  function incrementRefCount(lref, _tag) {
    const { type } = parseLocalSlot(lref);
    if (type === 'promise') {
      const refCount = Number(store.get(`${lref}.refCount`)) + 1;
      // cdebug(`++ ${lref}  ${tag} ${refCount}`);
      if (refCount === 1 && deadLocalPromises.has(lref)) {
        // Oops, turns out the zero refCount was a transient
        deadLocalPromises.delete(lref);
      }
      store.set(`${lref}.refCount`, `${refCount}`);
    }
  }

  /**
   * Decrement the reference count associated with some local object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all local objects.
   *
   * @param {string} lref  Ref of the local object whose refcount is to be decremented.
   * @param {string} tag  Descriptive label for use in diagnostics
   * @throws if this tries to decrement a reference count below zero.
   */
  function decrementRefCount(lref, tag) {
    const { type } = parseLocalSlot(lref);
    if (type === 'promise') {
      let refCount = Number(store.get(`${lref}.refCount`));
      assert(refCount > 0n, X`refCount underflow {lref} ${tag}`);
      refCount -= 1;
      // cdebug(`-- ${lref}  ${tag} ${refCount}`);
      store.set(`${lref}.refCount`, `${refCount}`);
      if (refCount === 0) {
        // If we are still in the middle of a resolve operation, and this lref
        // is an ancillary promise that was briefly added to the decider's
        // clist, we'll reach here when we retire that short-lived
        // identifier. However the lref is still in play: the resolution
        // function hasn't finished running, and we'll add the lref to the
        // subscriber's clist momentarily, where it will live until we get an
        // ack and can retire it from that clist too. We add the lref to the
        // maybe-dead set, but we do not trigger GC until the entire comms
        // dispatch is complete and any ancillary promises are safely referenced
        // by their subscribers clists.
        deadLocalPromises.add(lref);
      }
    }
  }

  /**
   * Delete any local promises that have zero references.
   *
   * Note that this should only be called *after* all work for a crank is done,
   * because transient zero refCounts are possible during the middle of a crank.
   */
  function purgeDeadLocalPromises() {
    if (enableLocalPromiseGC) {
      for (const lpid of deadLocalPromises.values()) {
        const refCount = Number(store.get(`${lpid}.refCount`));
        assert(
          refCount === 0,
          X`promise ${lpid} in deadLocalPromises with non-zero refcount`,
        );
        let idx = 0;
        const slots = commaSplit(store.get(`${lpid}.data.slots`));
        for (const slot of slots) {
          // Note: the following decrement can result in an addition to the
          // deadLocalPromises set, which we are in the midst of iterating.
          // TC39 went to a lot of trouble to ensure that this is kosher.
          decrementRefCount(slot, `gc|${lpid}|s${idx}`);
          idx += 1;
        }
        deleteLocalPromise(lpid);
      }
    }
    deadLocalPromises.clear();
  }

  function mapFromKernel(kfref) {
    // o+NN/o-NN/p+NN/p-NN -> loNN/lpNN
    return store.get(`c.${kfref}`);
  }

  function mapToKernel(lref) {
    // loNN/lpNN -> o+NN/o-NN/p+NN/p-NN
    return store.get(`c.${lref}`);
  }

  function addKernelMapping(kfref, lref) {
    store.set(`c.${kfref}`, lref);
    store.set(`c.${lref}`, kfref);
    incrementRefCount(lref, `{kfref}|k|clist`);
  }

  function deleteKernelMapping(kfref, lref) {
    store.delete(`c.${kfref}`);
    store.delete(`c.${lref}`);
    decrementRefCount(lref, `{kfref}|k|clist`);
  }

  function hasMetaObject(kfref) {
    return !!store.get(`meta.${kfref}`);
  }

  function addMetaObject(kfref) {
    store.set(`meta.${kfref}`, 'true');
  }

  function allocateKernelObjectID() {
    const index = Nat(BigInt(store.getRequired('o.nextID')));
    store.set('o.nextID', `${index + 1n}`);
    return makeVatSlot('object', true, index);
  }

  function allocateKernelPromiseID() {
    const index = Nat(BigInt(store.getRequired('p.nextID')));
    store.set('p.nextID', `${index + 1n}`);
    return makeVatSlot('promise', true, index);
  }

  function getObject(loid) {
    return store.get(`${loid}.owner`);
  }

  function allocateObject(owner) {
    const index = Nat(BigInt(store.getRequired('lo.nextID')));
    store.set('lo.nextID', `${index + 1n}`);
    const loid = makeLocalSlot('object', index);
    store.set(`${loid}.owner`, owner);
    return loid;
  }

  function allocatePromise() {
    const index = Nat(BigInt(store.getRequired('lp.nextID')));
    store.set('lp.nextID', `${index + 1n}`);
    const lpid = makeLocalSlot('promise', index);
    store.set(`${lpid}.status`, 'unresolved');
    store.set(`${lpid}.decider`, COMMS);
    store.set(`${lpid}.subscribers`, '');
    store.set(`${lpid}.refCount`, '0');
    return lpid;
  }

  function deciderIsKernel(lpid) {
    const decider = store.getRequired(`${lpid}.decider`);
    return decider === KERNEL;
  }

  function deciderIsRemote(lpid) {
    const decider = store.getRequired(`${lpid}.decider`);
    if (decider === KERNEL || decider === COMMS) {
      return undefined;
    }
    insistRemoteID(decider);
    return decider;
  }

  function insistDeciderIsRemote(lpid, remoteID) {
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(
      decider,
      remoteID,
      `${lpid} is decided by ${decider}, not ${remoteID}`,
    );
  }

  function insistDeciderIsComms(lpid) {
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(
      decider,
      COMMS,
      `${decider} is the decider for ${lpid}, not me`,
    );
  }

  function insistDeciderIsKernel(lpid) {
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(
      decider,
      KERNEL,
      `${decider} is the decider for ${lpid}, not kernel`,
    );
  }

  // Decision authority always transfers through the comms vat, so the only
  // legal transitions are remote <-> comms <-> kernel.

  function changeDeciderToRemote(lpid, newDecider) {
    // cdebug(`changeDecider ${lpid}: COMMS->${newDecider}`);
    insistRemoteID(newDecider);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, COMMS);
    store.set(`${lpid}.decider`, newDecider);
  }

  function changeDeciderFromRemoteToComms(lpid, oldDecider) {
    // cdebug(`changeDecider ${lpid}: ${oldDecider}->COMMS`);
    insistRemoteID(oldDecider);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, oldDecider);
    store.set(`${lpid}.decider`, COMMS);
  }

  function changeDeciderToKernel(lpid) {
    // cdebug(`changeDecider ${lpid}: COMMS->KERNEL`);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, COMMS);
    store.set(`${lpid}.decider`, KERNEL);
  }

  function changeDeciderFromKernelToComms(lpid) {
    // cdebug(`changeDecider ${lpid}: KERNEL->COMMS`);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, KERNEL);
    store.set(`${lpid}.decider`, COMMS);
  }

  function getPromiseStatus(lpid) {
    return store.get(`${lpid}.status`);
  }

  function getPromiseData(lpid) {
    const body = store.get(`${lpid}.data.body`);
    const slots = commaSplit(store.get(`${lpid}.data.slots`));
    return { body, slots };
  }

  function getPromiseSubscribers(lpid) {
    const rawSubscribers = store.get(`${lpid}.subscribers`);
    const subscribers = commaSplit(rawSubscribers);
    const kernelIsSubscribed = !!store.get(`${lpid}.kernelSubscribed`);
    return { subscribers, kernelIsSubscribed };
  }

  function insistPromiseIsUnresolved(lpid) {
    const status = store.getRequired(`${lpid}.status`);
    assert(status === 'unresolved', X`${lpid} already resolved`);
  }

  function subscribeRemoteToPromise(lpid, subscriber) {
    insistPromiseIsUnresolved(lpid);
    const key = `${lpid}.subscribers`;
    const rawSubscribers = store.get(key);
    const subscribers = commaSplit(rawSubscribers);
    subscribers.push(subscriber);
    store.set(key, subscribers.sort().join(','));
  }

  function unsubscribeRemoteFromPromise(lpid, subscriber) {
    insistPromiseIsUnresolved(lpid);
    const key = `${lpid}.subscribers`;
    const rawSubscribers = store.getRequired(key);
    const subscribers = commaSplit(rawSubscribers);
    const newSubscribers = subscribers.filter(s => s !== subscriber);
    store.set(key, newSubscribers.join(','));
  }

  function subscribeKernelToPromise(lpid) {
    insistPromiseIsUnresolved(lpid);
    const decider = store.getRequired(`${lpid}.decider`);
    assert(decider !== KERNEL, X`kernel is decider for ${lpid}, hush`);
    // cdebug(`subscribeKernelToPromise ${lpid} d=${decider}`);
    store.set(`${lpid}.kernelSubscribed`, 'true');
  }

  function unsubscribeKernelFromPromise(lpid) {
    insistPromiseIsUnresolved(lpid);
    // cdebug(`unsubscribeKernelFromPromise ${lpid} d=${decider}`);
    store.delete(`${lpid}.kernelSubscribed`);
  }

  function markPromiseAsResolved(lpid, rejected, data) {
    insistPromiseIsUnresolved(lpid);
    insistCapData(data);
    store.set(`${lpid}.status`, rejected ? 'rejected' : 'fulfilled');
    store.set(`${lpid}.data.body`, data.body);
    store.set(`${lpid}.data.slots`, data.slots.join(','));
    let idx = 0;
    for (const slot of data.slots) {
      incrementRefCount(slot, `resolve|s${idx}`);
      idx += 1;
    }
    store.delete(`${lpid}.decider`);
    store.delete(`${lpid}.subscribers`);
    store.delete(`${lpid}.kernelSubscribed`);
  }

  function addRemote(name, transmitterID) {
    assert(/^[-\w.+]+$/.test(name), `not a valid remote name: ${name}`);
    const nameKey = `rname.${name}`;
    assert(!store.get(nameKey), X`remote name ${name} already in use`);

    insistVatType('object', transmitterID);
    addMetaObject(transmitterID);

    const index = Number(store.getRequired('r.nextID'));
    store.set('r.nextID', `${index + 1}`);
    const remoteID = `r${index}`;
    const idBase = Number(store.get('identifierBase'));
    store.set('identifierBase', `${idBase + 1000}`);
    initializeRemoteState(store, remoteID, idBase, name, transmitterID);
    store.set(nameKey, remoteID);

    // inbound messages will be directed at this exported object
    const receiverID = allocateKernelObjectID();
    addMetaObject(receiverID);
    // receivers are vat objects to which the transport layer will send incoming
    // messages. Each remote machine is assigned a separate receiver object.
    store.set(`r.${receiverID}`, remoteID);
    // prettier-ignore
    cdebug(`comms add remote ${remoteID}/${name} xmit:${transmitterID} recv:${receiverID}`);
    return { remoteID, receiverID };
  }

  function getRemoteIDForName(remoteName) {
    return store.get(`rname.${remoteName}`);
  }

  function getRemoteReceiver(receiverID) {
    return store.get(`r.${receiverID}`);
  }

  const state = harden({
    initialize,

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

    getPromiseStatus,
    getPromiseData,
    allocatePromise,

    incrementRefCount,
    decrementRefCount,
    purgeDeadLocalPromises,

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

    // eslint-disable-next-line no-use-before-define
    getRemote,
    addRemote,
    getRemoteIDForName,
    getRemoteReceiver,
  });

  function getRemote(remoteID) {
    return makeRemote(state, store, remoteID);
  }

  return state;
}
