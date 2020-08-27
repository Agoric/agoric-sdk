/* global harden */
import { assert } from '@agoric/assert';
import { parseVatSlot } from '../../parseVatSlots';

export function makeKernel(state, syscall, stateKit, resolveToKernel) {
  const {
    trackUnresolvedPromise,
    subscribeKernelToPromise,
    unsubscribeKernelFromPromise,
    changeDeciderToKernel,
    changeDeciderFromKernelToComms,
  } = stateKit;

  // *-KernelForLocal
  // *-LocalForKernel
  //
  // Our local identifiers (vpid/void) are the same as the ones we use when
  // talking to the kernel, so this doesn't require any translation, per se.
  // However when we send new promises into the kernel, we need to remember
  // to notify the kernel about their eventual (or existing) resolution. And
  // we need to keep track of the "decider" of each Promise, which changes
  // when used as a message result. Using translation-shaped functions like
  // these allow delivery.js to be more uniform, and gives us a place to
  // perform this subscription and tracking.

  function provideKernelForLocal(lref) {
    const { type, allocatedByVat } = parseVatSlot(lref);
    if (type !== 'object' && type !== 'promise') {
      throw Error(`cannot give type ${type} to kernel`);
    }
    // the only interesting case is for our own promises
    if (type === 'promise' && allocatedByVat) {
      const vpid = lref;
      const p = state.promiseTable.get(vpid);
      assert(p, `how did I forget about ${vpid}`);
      if (p.resolved) {
        // we must tell the kernel about the resolution *after* the message
        // which introduces it
        Promise.resolve().then(() => resolveToKernel(vpid, p.resolution));
      } else {
        // or arrange to send it later, once it resolves
        subscribeKernelToPromise(vpid);
      }
    }
    return lref;
  }

  function provideKernelForLocalResult(vpid) {
    const p = state.promiseTable.get(vpid);
    assert(!p.resolved, `result ${vpid} is already resolved`);
    // TODO: reject somehow rather than crashing weirdly if we are not
    // already the decider, but I'm not sure how we could hit that case.
    changeDeciderToKernel(vpid);
    // if we knew about this promise already, and thought the kernel
    // cared.. well, it doesn't now
    unsubscribeKernelFromPromise(vpid);
    return vpid;
  }


  function provideLocalForKernel(kref) {
    const { type, allocatedByVat } = parseVatSlot(kref);
    if (type !== 'object' && type !== 'promise') {
      // TODO: reject the message rather than crashing weirdly, we
      // can't prevent vats from attempting this
      throw Error(`cannot accept type ${type} from kernel`);
    }
    if (type === 'object') {
      if (allocatedByVat) {
        assert(state.objectTable.has(kref),
             `I don't remember giving ${kref} to the kernel`);
      }
    } else if (type === 'promise') {
      const vpid = kref;
      if (allocatedByVat) {
        assert(state.promiseTable.has(vpid),
               `I don't remember giving ${vpid} to the kernel`);
      } else {
        if (!state.promiseTable.has(vpid)) {
          // the kernel is telling us about a new promise, so it's the decider
          trackUnresolvedPromise(vpid);
          changeDeciderToKernel(vpid);
          syscall.subscribe(vpid);
        }
      }
    }
    return kref;
  }

  function provideLocalForKernelResult(vpid) {
    assert.equal(parseVatSlot(vpid).type, 'promise');
    // first, make sure we're tracking the promise at all
    provideLocalForKernel(vpid);
    // Now switch the decider from the kernel to us. If the kernel referenced
    // an existing promise, this will assert that the kernel had decision
    // making authority in the first place. TODO: if the decider was not
    // already the kernel, somehow reject the message, rather than crashing
    // weirdly, since we can't prevent low-level vats from using a 'result'
    // promise that they don't actually control
    changeDeciderFromKernelToComms(vpid);
    subscribeKernelToPromise(vpid);
    // TODO: ideally we'd syscall.unsubscribe here, but that doesn't exist
    return vpid;
  }

  return harden({
    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
  });
}
