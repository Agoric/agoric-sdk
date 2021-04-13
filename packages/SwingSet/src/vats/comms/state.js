import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { insistCapData } from '../../capdata';
import { makeVatSlot, insistVatType } from '../../parseVatSlots';
import { makeLocalSlot } from './parseLocalSlots';
import { initializeRemoteState, makeRemote, insistRemoteID } from './remote';
import { cdebug } from './cdebug';

const COMMS = 'comms';
const KERNEL = 'kernel';

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
  // lp$NN.state = unresolved | fulfilled | rejected
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
  }

  function deleteKernelMapping(kfref, lref) {
    store.delete(`c.${kfref}`);
    store.delete(`c.${lref}`);
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
    // console.log(`changeDecider ${lpid}: COMMS->${newDecider}`);
    insistRemoteID(newDecider);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, COMMS);
    store.set(`${lpid}.decider`, newDecider);
  }

  function changeDeciderFromRemoteToComms(lpid, oldDecider) {
    // console.log(`changeDecider ${lpid}: ${oldDecider}->COMMS`);
    insistRemoteID(oldDecider);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, oldDecider);
    store.set(`${lpid}.decider`, COMMS);
  }

  function changeDeciderToKernel(lpid) {
    // console.log(`changeDecider ${lpid}: COMMS->KERNEL`);
    const decider = store.getRequired(`${lpid}.decider`);
    assert.equal(decider, COMMS);
    store.set(`${lpid}.decider`, KERNEL);
  }

  function changeDeciderFromKernelToComms(lpid) {
    // console.log(`changeDecider ${lpid}: KERNEL->COMMS`);
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
    // console.log(`subscribeKernelToPromise ${lpid} d=${decider}`);
    store.set(`${lpid}.kernelSubscribed`, 'true');
  }

  function unsubscribeKernelFromPromise(lpid) {
    insistPromiseIsUnresolved(lpid);
    // console.log(`unsubscribeKernelFromPromise ${lpid} d=${decider}`);
    store.delete(`${lpid}.kernelSubscribed`);
  }

  function markPromiseAsResolved(lpid, rejected, data) {
    insistPromiseIsUnresolved(lpid);
    insistCapData(data);
    store.set(`${lpid}.status`, rejected ? 'rejected' : 'fulfilled');
    store.set(`${lpid}.data.body`, data.body);
    store.set(`${lpid}.data.slots`, data.slots.join(','));
    store.delete(`${lpid}.decider`);
    store.delete(`${lpid}.subscribers`);
    store.delete(`${lpid}.kernelSubscribed`);
  }

  function getRemote(remoteID) {
    return makeRemote(store, remoteID);
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

  return harden({
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

    getRemote,
    addRemote,
    getRemoteIDForName,
    getRemoteReceiver,
  });
}
