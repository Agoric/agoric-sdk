/* global harden */
import { makeInbound } from './clist-inbound';
import { makeOutbound } from './clist-outbound';
import { makeKernel } from './clist-kernel';
import { makeIngressEgress } from './clist-xgress.js';

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

  const {
    addEgress, addIngress,
  } = makeIngressEgress(state, provideLocalForRemote);

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
  });
}
