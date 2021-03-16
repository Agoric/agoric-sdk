import { assert, details as X } from '@agoric/assert';
import { parseVatSlot, insistVatType } from '../../parseVatSlots';
import { parseLocalSlot } from './parseLocalSlots';
import { cdebug } from './cdebug';

export function makeKernel(state, syscall, stateKit) {
  const {
    trackUnresolvedPromise,
    allocateLocalObjectID,
    allocateLocalPromiseID,
    allocateKernelObjectID,
    allocateKernelPromiseID,
    subscribeKernelToPromise,
    unsubscribeKernelFromPromise,
    deciderIsKernel,
    changeDeciderToKernel,
    changeDeciderFromKernelToComms,
  } = stateKit;

  // *-KernelForLocal: comms vat sending out to kernel
  //
  // When we send new promises into the kernel, we need to remember to notify
  // the kernel about their eventual (or existing) resolution. And we need to
  // keep track of the "decider" of each Promise, which changes when used as a
  // message result. Using translation-shaped functions like these allow
  // delivery.js to be more uniform, and gives us a place to perform this
  // subscription and tracking. We must also keep track of whether this vpid has
  // been retired or not, and create a new (short-lived) identifier to reference
  // resolved promises if necessary.

  function provideKernelForLocal(lref) {
    if (!state.toKernel.has(lref)) {
      let kfref;
      const { type } = parseLocalSlot(lref);

      if (type === 'object') {
        kfref = allocateKernelObjectID();
      } else if (type === 'promise') {
        const p = state.promiseTable.get(lref);
        // We should always know about this lref. It is allocated upon
        // receipt.  We retain the promiseTable entry even after the
        // promise is resolved (to remember the resolution).
        assert(p, X`how did I forget about ${lref}`);
        kfref = allocateKernelPromiseID();
        if (!p.resolved && !deciderIsKernel(lref)) {
          subscribeKernelToPromise(lref);
        }
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      state.toKernel.set(lref, kfref);
      state.fromKernel.set(kfref, lref);
      cdebug(`comms add mapping l->k ${kfref}<=>${lref}`);
    }
    return state.toKernel.get(lref);
  }

  function provideKernelForLocalResult(lpid) {
    if (!lpid) {
      return null;
    }
    const p = state.promiseTable.get(lpid);
    assert(!p.resolved, X`result ${lpid} is already resolved`);
    // TODO: reject somehow rather than crashing weirdly if we are not
    // already the decider, but I'm not sure how we could hit that case.
    changeDeciderToKernel(lpid);
    // if we knew about this promise already, and thought the kernel
    // cared.. well, it doesn't now
    unsubscribeKernelFromPromise(lpid);
    return provideKernelForLocal(lpid);
  }

  function kernelSlotToLocalSlot(kernelSlot) {
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    if (!state.fromKernel.has(kernelSlot)) {
      const { type } = parseVatSlot(kernelSlot);
      let localSlot;
      if (type === 'object') {
        localSlot = allocateLocalObjectID();
      } else if (type === 'promise') {
        localSlot = allocateLocalPromiseID();
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      state.fromKernel.set(kernelSlot, localSlot);
      state.toKernel.set(localSlot, kernelSlot);
      cdebug(`comms add mapping k->l ${kernelSlot}<=>${localSlot}`);
    }
    return state.fromKernel.get(kernelSlot);
  }

  function retireKernelPromiseID(kfpid) {
    insistVatType('promise', kfpid);
    const lpid = state.fromKernel.get(kfpid);
    assert(lpid, X`unknown kernel promise ${kfpid}`);
    assert(state.toKernel.has(lpid), X`unmapped local promise ${lpid}`);
    state.fromKernel.delete(kfpid);
    state.toKernel.delete(lpid);
    cdebug(`comms delete mapping l<->k ${kfpid}<=>${lpid}`);
  }

  // *-LocalForKernel: kernel sending in to comms vat

  function provideLocalForKernel(kfref, doNotSubscribeSet) {
    const { type, allocatedByVat } = parseVatSlot(kfref);
    if (type !== 'object' && type !== 'promise') {
      // TODO: reject the message rather than crashing weirdly, we
      // can't prevent vats from attempting this
      assert.fail(X`cannot accept type ${type} from kernel`);
    }
    const lref = kernelSlotToLocalSlot(kfref);
    if (type === 'object') {
      if (allocatedByVat) {
        assert(
          state.objectTable.has(lref),
          `I don't remember giving ${lref}/${kfref} to the kernel`,
        );
      }
    } else if (type === 'promise') {
      const vpid = kfref;
      if (allocatedByVat) {
        assert(
          state.promiseTable.has(lref),
          `I don't remember giving ${lref}/${vpid} to the kernel`,
        );
      } else {
        const p = state.promiseTable.get(lref);
        if (p) {
          // hey, we agreed to never speak of the resolved VPID again. maybe
          // the kernel is recycling p-NN VPIDs, or is just confused
          assert(!p.resolved, X`kernel sent retired ${lref}/${vpid}`);
        } else {
          // the kernel is telling us about a new promise, so it's the decider
          trackUnresolvedPromise(lref);
          changeDeciderToKernel(lref);
          if (!doNotSubscribeSet || !doNotSubscribeSet.has(vpid)) {
            syscall.subscribe(vpid);
          }
        }
      }
    }
    return lref;
  }

  function provideLocalForKernelResult(vpid) {
    if (!vpid) {
      return null;
    }
    const { type, allocatedByVat } = parseVatSlot(vpid);
    assert.equal(type, 'promise');
    const lpid = kernelSlotToLocalSlot(vpid);
    const p = state.promiseTable.get(lpid);
    // regardless of who allocated it, we should not get told about a promise
    // we know to be resolved. We agreed to never speak of the resolved VPID
    // again. maybe the kernel is recycling p-NN VPIDs, or is just confused
    if (p) {
      assert(!p.resolved, X`kernel sent retired ${lpid}/${vpid}`);
    }

    // if we're supposed to have allocated the number, we better recognize it
    if (allocatedByVat) {
      assert(p, X`I don't remember giving ${lpid}/${vpid} to the kernel`);
    }

    if (p) {
      // The kernel is using a pre-existing promise as the result. It had
      // better already have control. TODO: if the decider was not already
      // the kernel, somehow reject the message, rather than crashing
      // weirdly, since we can't prevent low-level vats from using a 'result'
      // promise that they don't actually control
      changeDeciderFromKernelToComms(lpid);
      // TODO: ideally we'd syscall.unsubscribe here, but that doesn't exist
    } else {
      // the kernel is telling us about a new promise, and new unresolved
      // promises are born with us being the decider
      trackUnresolvedPromise(lpid);
    }
    // either way, the kernel is going to want to know about the resolution
    subscribeKernelToPromise(lpid);
    return lpid;
  }

  return harden({
    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
    retireKernelPromiseID,
  });
}
