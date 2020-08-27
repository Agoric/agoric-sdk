/* global harden */
import Nat from '@agoric/nat';
import { assert } from '@agoric/assert';
import { parseVatSlot, insistVatType } from '../../parseVatSlots';
import { flipRemoteSlot, makeRemoteSlot } from './parseRemoteSlot';
import { getRemote } from './remote';
import { makeInbound } from './clist-inbound';
import { makeOutbound } from './clist-outbound';
import { makeKernel } from './clist-kernel';

export function makeCListKit(state, syscall, stateKit) {
  const {
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
  } = makeInbound(state, stateKit);

  const {
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,
  } = makeOutbound(state, syscall, stateKit);

  const {
    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
  } = makeKernel(state, syscall, stateKit);

  // get-*: the entry must be present
  // add-*: the entry must not be present. add one.
  // provide-*: return an entry, adding one if necessary

  function addEgress(remoteID, remoteRefID, vatoid) {
    // Make 'vatoid' available to remoteID as 'remoteRefID'. This is kind of
    // like provideRemoteForLocal, but it uses a caller-provided remoteRef instead of
    // allocating a new one. This is used to bootstrap initial connectivity
    // between machines.
    const remote = getRemote(state, remoteID);
    Nat(remoteRefID);
    insistVatType('object', vatoid);
    const { allocatedByVat } = parseVatSlot(vatoid);
    assert(!allocatedByVat, `vatoid should be kernel-allocated`);
    assert(!remote.toRemote.has(vatoid), `already present ${vatoid}`);

    const inboundRRef = makeRemoteSlot('object', true, remoteRefID);
    const outboundRRef = flipRemoteSlot(inboundRRef);
    assert(!remote.fromRemote.has(inboundRRef), `already have ${inboundRRef}`);
    assert(!remote.toRemote.has(outboundRRef), `already have ${outboundRRef}`);
    remote.fromRemote.set(inboundRRef, vatoid);
    remote.toRemote.set(vatoid, outboundRRef);
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

  function addIngress(remoteID, remoteRefID) {
    // Return a local object-id that maps to a remote object with index
    // 'remoteRefID'. Just a wrapper around provideLocalForRemote.
    const inboundRRef = makeRemoteSlot('object', false, remoteRefID);
    const vatoid = provideLocalForRemote(state, remoteID, inboundRRef);
    return vatoid;
  }

  return harden({
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,

    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,

    addEgress,
    addIngress,

    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,

  });
}
