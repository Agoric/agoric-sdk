import { Nat } from '@endo/nat';
import { insistLocalType } from './parseLocalSlots.js';
import { makeRemoteSlot } from './parseRemoteSlot.js';
import { cdebug } from './cdebug.js';

export function makeIngressEgress(state, provideLocalForRemote) {
  function addEgress(remoteID, remoteRefID, loid) {
    // Make `loid` available to remoteID as `remoteRefID`. This is kind of
    // like provideRemoteForLocal, but it uses a caller-provided remoteRef instead of
    // allocating a new one. This is used to bootstrap initial connectivity
    // between machines.
    const remote = state.getRemote(remoteID);
    Nat(remoteRefID);
    insistLocalType('object', loid);

    const inboundRRef = makeRemoteSlot('object', true, remoteRefID);
    remote.addRemoteMapping(inboundRRef, loid);
    remote.skipRemoteObjectID(remoteRefID);
    const isImportFromComms = true;
    remote.setReachable(loid, isImportFromComms);

    // prettier-ignore
    cdebug(`comms add egress ${loid} to ${remoteID} in ${inboundRRef}`);
  }

  // to let machine2 access 'o-5' on machine1, pick an unused index (12), then:
  // * machine1 does addEgress('machine2', 12, 'o-5')
  // * machine2 does addIngress('machine1', 12, 'o+8')
  // Messages sent to the object:
  // * machine2 toRemote[o+8] = ro+12
  // * machine1 fromRemote[ro+12] = o-5
  // Messages sent from m1 to m2 that reference the object:
  // * machine1 toRemote[o-5] = ro-12
  // * machine2 fromRemote[ro-12] = o+8

  function addIngress(remoteID, remoteRefID) {
    // Return a local object-id that maps to a remote object with index
    // `remoteRefID`. Just a wrapper around provideLocalForRemote.
    const inboundRRef = makeRemoteSlot('object', false, remoteRefID);
    const loid = provideLocalForRemote(remoteID, inboundRRef);
    cdebug(`comms add ingress ${loid} to ${remoteID} in ${inboundRRef}`);
    return loid;
  }

  return harden({ addEgress, addIngress });
}
