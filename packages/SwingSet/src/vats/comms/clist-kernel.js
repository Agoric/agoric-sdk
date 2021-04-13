import { assert, details as X } from '@agoric/assert';
import { parseVatSlot, insistVatType } from '../../parseVatSlots';
import { parseLocalSlot } from './parseLocalSlots';
import { cdebug } from './cdebug';

export function makeKernel(state, syscall) {
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

  function getKernelForLocal(lref) {
    const kfref = state.mapToKernel(lref);
    assert(kfref, X`${lref} must already be mapped to a kernel-facing ID`);
    return kfref;
  }

  function provideKernelForLocal(lref) {
    if (!state.mapToKernel(lref)) {
      let kfref;
      const { type } = parseLocalSlot(lref);

      if (type === 'object') {
        kfref = state.allocateKernelObjectID();
      } else if (type === 'promise') {
        const status = state.getPromiseStatus(lref);
        // We should always know about this lref. It is allocated upon
        // receipt.  We retain the promiseTable entry even after the
        // promise is resolved (to remember the resolution).
        assert(status, X`how did I forget about ${lref}`);
        kfref = state.allocateKernelPromiseID();
        if (status === 'unresolved' && !state.deciderIsKernel(lref)) {
          state.subscribeKernelToPromise(lref);
        }
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      state.addKernelMapping(kfref, lref);
      cdebug(`comms add mapping l->k ${kfref}<=>${lref}`);
    }
    return state.mapToKernel(lref);
  }

  function provideKernelForLocalResult(lpid) {
    if (!lpid) {
      return undefined;
    }
    const status = state.getPromiseStatus(lpid);
    assert(status === 'unresolved', X`result ${lpid} is already resolved`);
    // TODO: reject somehow rather than crashing weirdly if we are not
    // already the decider, but I'm not sure how we could hit that case.
    state.changeDeciderToKernel(lpid);
    // if we knew about this promise already, and thought the kernel
    // cared.. well, it doesn't now
    state.unsubscribeKernelFromPromise(lpid);
    return provideKernelForLocal(lpid);
  }

  function retireKernelPromiseID(kfpid) {
    insistVatType('promise', kfpid);
    const lpid = state.mapFromKernel(kfpid);
    assert(lpid, X`unknown kernel promise ${kfpid}`);
    assert(state.mapToKernel(lpid), X`unmapped local promise ${lpid}`);
    const { kernelIsSubscribed } = state.getPromiseSubscribers(lpid);
    assert(
      !kernelIsSubscribed,
      X`attempt to retire subscribed promise ${kfpid}`,
    );
    state.deleteKernelMapping(kfpid, lpid);
    cdebug(`comms delete mapping l<->k ${kfpid}<=>${lpid}`);
  }

  // *-LocalForKernel: kernel sending in to comms vat

  function getLocalForKernel(kfref) {
    const lref = state.mapFromKernel(kfref);
    assert(lref, X`${kfref} must already be mapped to a local ID`);
    return lref;
  }

  function addLocalObjectForKernel(kfoid) {
    assert(
      !state.mapFromKernel(kfoid),
      `I don't remember giving ${kfoid} to the kernel`,
    );

    const loid = state.allocateObject('kernel');
    state.addKernelMapping(kfoid, loid);
    cdebug(`comms import kernel ${loid} ${kfoid}`);
  }

  function addLocalPromiseForKernel(kfpid) {
    assert(
      !state.mapFromKernel(kfpid),
      `I don't remember giving ${kfpid} to the kernel`,
    );
    const lpid = state.allocatePromise();
    state.changeDeciderToKernel(lpid);
    state.addKernelMapping(kfpid, lpid);
    cdebug(`comms import kernel ${lpid} ${kfpid}`);
  }

  function provideLocalForKernel(kfref, doNotSubscribeSet) {
    const { type, allocatedByVat } = parseVatSlot(kfref);
    if (type !== 'object' && type !== 'promise') {
      // TODO: reject the message rather than crashing weirdly, we
      // can't prevent vats from attempting this
      assert.fail(X`cannot accept type ${type} from kernel`);
    }

    if (!state.mapFromKernel(kfref)) {
      if (type === 'object') {
        addLocalObjectForKernel(kfref);
      } else if (type === 'promise') {
        addLocalPromiseForKernel(kfref);
      } else {
        assert.fail(X`cannot accept type ${type} from kernel`);
      }
    }

    const lref = state.mapFromKernel(kfref);
    if (type === 'promise') {
      if (!allocatedByVat) {
        if (!doNotSubscribeSet || !doNotSubscribeSet.has(kfref)) {
          syscall.subscribe(kfref);
        }
      }
    }
    return lref;
  }

  function provideLocalForKernelResult(kfpid) {
    if (!kfpid) {
      return null;
    }
    insistVatType('promise', kfpid);
    const doNotSubscribeSet = new Set();
    doNotSubscribeSet.add(kfpid);
    const lpid = provideLocalForKernel(kfpid, doNotSubscribeSet);
    state.insistPromiseIsUnresolved(lpid);
    state.changeDeciderFromKernelToComms(lpid);
    state.subscribeKernelToPromise(lpid);
    return lpid;
  }

  return harden({
    getKernelForLocal,
    provideKernelForLocal,
    provideKernelForLocalResult,
    getLocalForKernel,
    provideLocalForKernel,
    provideLocalForKernelResult,
    retireKernelPromiseID,
  });
}
