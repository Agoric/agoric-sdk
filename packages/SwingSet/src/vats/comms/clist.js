/* global harden */
import { makeInbound } from './clist-inbound';
import { makeOutbound } from './clist-outbound';
import { makeKernel } from './clist-kernel';
import { makeIngressEgress } from './clist-xgress.js';

// get-*: the entry must be present
// add-*: the entry must not be present. add one.
// provide-*: return an entry, adding one if necessary

export function makeCListKit(state, syscall, stateKit) {
  const {
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
  } = makeInbound(state, stateKit);

  // *-RemoteForLocal: sending a local object/promise to a remote machine
  const outbound = makeOutbound(state, stateKit);
  const {
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,
  } = outbound;

  const kernel = makeKernel(state, syscall, stateKit);
  const {
    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
  } = kernel;

  const {
    addEgress, addIngress,
  } = makeIngressEgress(state, provideLocalForRemote);

  function setDeliveryKit(deliveryKit) {
    outbound.setDeliveryKit(deliveryKit);
    kernel.setDeliveryKit(deliveryKit);
  }

  return harden({
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,

    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,

    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,

    addEgress,
    addIngress,

    setDeliveryKit,
  });
}
