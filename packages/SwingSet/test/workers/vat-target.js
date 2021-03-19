import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';

function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}

// We arrange for this vat, 'vat-target', to receive a specific set of
// inbound events ('dispatch'), which will provoke a set of outbound events
// ('syscall'), that cover the full range of the dispatch/syscall interface

export function buildRootObject(vatPowers, vatParameters) {
  console.log(`vat does buildRootObject`); // make sure console works
  // note: XS doesn't appear to print console.log unless an exception happens
  vatPowers.testLog('testLog works');

  const { canCallNow } = vatParameters;
  const precB = makePromiseKit();
  const precC = makePromiseKit();
  let callbackObj;

  // crank 1:
  //   dispatch.deliver(target, method="zero", result=pA, args=[callbackObj, pD, pE, adder])
  //   syscall.subscribe(pD)
  //   syscall.subscribe(pE)
  //   syscall.callNow(adder, args=[1, 2]) -> 3
  //   syscall.dropImports([dropMe])
  //   syscall.send(callbackObj, method="callback", result=rp2, args=[11, 12]);
  //   syscall.subscribe(rp2)
  //   syscall.fulfillToData(pA, [pB, pC, 3]);
  function zero(obj, pD, pE, adder, dropMe) {
    callbackObj = obj;
    const pF = E(callbackObj).callback(11, 12); // syscall.send
    ignore(pD);
    ignore(pE);
    const three = canCallNow ? vatPowers.D(adder).add(1, 2) : 3;
    vatPowers.disavow(dropMe);
    return [precB.promise, precC.promise, pF, three]; // syscall.fulfillToData
  }

  // crank 2:
  //   dispatch.deliver(target, method="one", result=rp3, args=[])
  //   syscall.fulfillToPresence(pB, callbackObj)
  //   syscall.reject(pC, Error('oops'))
  //   syscall.fulfillToData(rp3, 'rp3 good')
  function one() {
    precB.resolve(callbackObj); // syscall.fulfillToPresence
    precC.reject(Error('oops')); // syscall.reject
    return 'rp3 good';
  }

  // crank 3: dispatch.notify(pD, false, callbackObj)
  // crank 4: dispatch.notify(pE, true, Error('four'))

  // crank 5: dispatch.notify(pF, false, ['data', callbackObj])

  const target = Far('root', {
    zero,
    one,
  });

  return target;
}
