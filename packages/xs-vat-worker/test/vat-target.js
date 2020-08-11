import { E } from '@agoric/eventual-send';
import { makePromiseKit as producePromise } from '@agoric/promise-kit';

function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}

// We arrange for this vat, 'vat-target', to receive a specific set of
// inbound events ('dispatch'), which will provoke a set of outbound events
// ('syscall'), that cover the full range of the dispatch/syscall interface

export function buildRootObject() {
  const precB = producePromise();
  const precC = producePromise();
  let callbackObj;

  // zero: dispatch.deliver(target, method="one", result=pA, args=[callbackObj, pD, pE])
  //       syscall.subscribe(pD)
  //       syscall.subscribe(pE)
  //       syscall.send(callbackObj, method="callback", result=rp2, args=[11, 12]);
  //       syscall.subscribe(rp2)
  //       syscall.fulfillToData(pA, [pB, pC]);
  function zero(obj, pD, pE) {
    callbackObj = obj;
    E(callbackObj).callback(11, 12); // syscall.send
    ignore(pD);
    ignore(pE);
    return [precB.promise, precC.promise]; // syscall.fulfillToData
  }

  // one: dispatch.deliver(target, method="two", result=rp3, args=[])
  //      syscall.fulfillToPresence(pB, callbackObj)
  //      syscall.reject(pC, Error('oops'))
  //      syscall.fulfillToData(rp3, 1)
  function one() {
    precB.resolve(callbackObj); // syscall.fulfillToPresence
    precC.reject(Error('oops')); // syscall.reject
    return 1;
  }

  // two: dispatch.notifyFulfillToPresence(pD, callbackObj)
  // three: dispatch.notifyReject(pE, Error('four'))

  // four: dispatch.notifyFulfillToData(pF, ['data', callbackObj])

  const target = harden({
    zero,
    one,
  });

  return target;
}
