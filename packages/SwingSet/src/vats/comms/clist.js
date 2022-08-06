import { makeInbound } from './clist-inbound.js';
import { makeOutbound } from './clist-outbound.js';
import { makeKernel } from './clist-kernel.js';
import { makeIngressEgress } from './clist-xgress.js';

// get-*: the entry must be present
// add-*: the entry must not be present. add one.
// provide-*: return an entry, adding one if necessary

// we deal with three different kinds of slot namespace ("slotspace") here:
// 1: remote[NAME] : ro+NN/etc
// 2: local: o+NN/etc
// 3: kernel: same as local

// At each boundary, we translate all slot identifiers (message targets,
// arguments, result promises, notification targets, resolution data) from
// one namespace to the other. This boundary is also where we manage
// promises: we keep track of who is the decider, and we prepare to notify
// the recipient of resolution. For promises that are already resolved, we
// queue up a resolution notification immediately, to be delivered after the
// message which contained that promise. For unresolved promises, we add the
// recipient to the subscriber list, so they'll be notified later.

// The translation process may add entries to the clist, or reference
// existing entries.

// For messages coming in from a remote machine, we start by translating
// those inbound messages from the remote's slotspace to our own (the comms
// vat). For messages coming from the kernel, we translate those outbound
// messages from the kernel slotspace to the local one.

// Then we figure out where the message is headed. Inbound messages are
// usually for a local vat, but they might be destined for a different remote
// (if we shared a third-party reference for the target), or maybe even the
// same remote who gave us the message (if the target is a promise that we
// resolved to them, but they haven't gotten the resolution message yet).
// Outbound messages (from the kernel) always start out headed to a remote
// system.

// Either kind of message might be directed at a promise that has been
// resolved to something undeliverable (data or rejection), in which case
// we'll reject any result promise, which will generate some number of
// notification messages (possibly headed somewhere else entirely).

// If the resulting message or notification is going to our kernel,translate
// the message from our local vat slotspace into the kernel slotspace (the
// namespaces are the same, but the act of "translation" is where we manage
// the Promises). If the message is headed to a remote machine, translate it
// into the destination remote's slotspace.

export function makeCListKit(state, syscall) {
  const {
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
    retireRemotePromiseID,
    beginRemotePromiseIDRetirement,
    retireAcknowledgedRemotePromiseIDs,
  } = makeInbound(state);

  // *-RemoteForLocal: sending a local object/promise to a remote machine
  const outbound = makeOutbound(state);
  const {
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,
  } = outbound;

  const kernel = makeKernel(state, syscall);
  const {
    getKernelForLocal,
    provideKernelForLocal,
    provideKernelForLocalResult,
    getLocalForKernel,
    provideLocalForKernel,
    provideLocalForKernelResult,
    retireKernelPromiseID,
  } = kernel;

  const { addEgress, addIngress } = makeIngressEgress(
    state,
    provideLocalForRemote,
  );

  return harden({
    provideLocalForRemote,
    getLocalForRemote,
    provideLocalForRemoteResult,
    retireRemotePromiseID,
    beginRemotePromiseIDRetirement,
    retireAcknowledgedRemotePromiseIDs,

    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,

    getKernelForLocal,
    provideKernelForLocal,
    provideKernelForLocalResult,
    getLocalForKernel,
    provideLocalForKernel,
    provideLocalForKernelResult,
    retireKernelPromiseID,

    addEgress,
    addIngress,
  });
}
