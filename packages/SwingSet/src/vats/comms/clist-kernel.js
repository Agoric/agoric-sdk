import { assert } from '@agoric/assert';
import { parseVatSlot } from '../../parseVatSlots';

export function makeKernel(state, syscall, stateKit) {
  const {
    trackUnresolvedPromise,
    allocateResolvedPromiseID,
    subscribeKernelToPromise,
    unsubscribeKernelFromPromise,
    deciderIsKernel,
    changeDeciderToKernel,
    changeDeciderFromKernelToComms,
  } = stateKit;

  let resolveToKernel; // cyclic, set later

  function setDeliveryKit(deliveryKit) {
    resolveToKernel = deliveryKit.resolveToKernel;
  }

  // *-KernelForLocal: comms vat sending out to kernel
  //
  // Our local identifiers (vpid/void) are the same as the ones we use when
  // talking to the kernel, so this doesn't require any translation, per se.
  // However when we send new promises into the kernel, we need to remember
  // to notify the kernel about their eventual (or existing) resolution. And
  // we need to keep track of the "decider" of each Promise, which changes
  // when used as a message result. Using translation-shaped functions like
  // these allow delivery.js to be more uniform, and gives us a place to
  // perform this subscription and tracking. We must also keep track of
  // whether this vpid has been retired or not, and create a new
  // (short-lived) identifier to reference resolved promises if necessary.

  function provideKernelForLocal(lref) {
    const { type } = parseVatSlot(lref);

    if (type === 'object') {
      return lref;
    }

    if (type === 'promise') {
      const vpid = lref;
      const p = state.promiseTable.get(vpid);
      // We should always know about this vpid. p+NN is allocated upon
      // receipt of a remote promise, and p-NN is added upon receipt of a
      // kernel promise. We retain the promiseTable entry even after the
      // promise is retired (to remember the resolution).
      assert(p, `how did I forget about ${vpid}`);

      if (p.resolved) {
        // The vpid might have been retired, in which case we must not use it
        // when speaking to the kernel. It will only be retired if 1: it
        // crossed the commsvat-kernel boundary already, and 2: the decider
        // (either commsvat or kernel) resolved it. If we allocated the vpid
        // for a message which arrived from one remote and went straight out
        // to another, we won't have mentioned it to the kernel yet. Rather
        // than keep track of this, we just use a fresh vpid each time we
        // need to talk about a resolved promise to the kernel. We must send
        // the resolution and then immediately retire the vpid again.

        const fresh = allocateResolvedPromiseID();
        // console.log(`fresh: ${fresh} for ${vpid}`, p.resolution);
        // we must tell the kernel about the resolution *after* the message
        // which introduces it
        Promise.resolve().then(() => resolveToKernel(fresh, p.resolution));
        return fresh;
      }

      // Unresolved promises can use the same VPID until it is retired. Since
      // we're telling the kernel about this VPID, we must arrange to notify
      // the kernel when it resolves, unless the kernel itself is in control.
      if (!deciderIsKernel(vpid)) {
        subscribeKernelToPromise(vpid);
      }
      return vpid;
    }
    throw Error(`cannot give type ${type} to kernel`);
  }

  function provideKernelForLocalResult(vpid) {
    if (!vpid) {
      return null;
    }
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

  // *-LocalForKernel: kernel sending in to comms vat

  function provideLocalForKernel(kref) {
    const { type, allocatedByVat } = parseVatSlot(kref);
    if (type !== 'object' && type !== 'promise') {
      // TODO: reject the message rather than crashing weirdly, we
      // can't prevent vats from attempting this
      throw Error(`cannot accept type ${type} from kernel`);
    }
    if (type === 'object') {
      if (allocatedByVat) {
        assert(
          state.objectTable.has(kref),
          `I don't remember giving ${kref} to the kernel`,
        );
      }
    } else if (type === 'promise') {
      const vpid = kref;
      if (allocatedByVat) {
        assert(
          state.promiseTable.has(vpid),
          `I don't remember giving ${vpid} to the kernel`,
        );
      } else {
        const p = state.promiseTable.get(vpid);
        if (p) {
          // hey, we agreed to never speak of the resolved VPID again. maybe
          // the kernel is recycling p-NN VPIDs, or is just confused
          assert(!p.resolved, `kernel sent retired ${vpid}`);
        } else {
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
    if (!vpid) {
      return null;
    }
    const { type, allocatedByVat } = parseVatSlot(vpid);
    assert.equal(type, 'promise');
    const p = state.promiseTable.get(vpid);
    // regardless of who allocated it, we should not get told about a promise
    // we know to be resolved. We agreed to never speak of the resolved VPID
    // again. maybe the kernel is recycling p-NN VPIDs, or is just confused
    if (p) {
      assert(!p.resolved, `kernel sent retired ${vpid}`);
    }

    // if we're supposed to have allocated the number, we better recognize it
    if (allocatedByVat) {
      assert(p, `I don't remember giving ${vpid} to the kernel`);
    }

    if (p) {
      // The kernel is using a pre-existing promise as the result. It had
      // better already have control. TODO: if the decider was not already
      // the kernel, somehow reject the message, rather than crashing
      // weirdly, since we can't prevent low-level vats from using a 'result'
      // promise that they don't actually control
      changeDeciderFromKernelToComms(vpid);
      // TODO: ideally we'd syscall.unsubscribe here, but that doesn't exist
    } else {
      // the kernel is telling us about a new promise, and new unresolved
      // promises are born with us being the decider
      trackUnresolvedPromise(vpid);
    }
    // either way, the kernel is going to want to know about the resolution
    subscribeKernelToPromise(vpid);
    return vpid;
  }

  return harden({
    setDeliveryKit,

    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
  });
}
