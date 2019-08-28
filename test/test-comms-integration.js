import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

export async function runVats(t, withSES, argv) {
  const config = await loadBasedir(
    path.resolve(__dirname, './basedir-commsvat'),
  );

  const ldSrcPath = require.resolve('../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];
  const c = await buildVatController(config, withSES, argv);
  return c;
}

// use e.g. runTest(test.only, name) to run only one test

const setupLogs = ['=> setup called', '=> bootstrap() called'];

export function runTest(testType, withSES, testStr, expectedLogs) {
  const expected = setupLogs.concat(expectedLogs);
  testType(testStr, async t => {
    const c = await runVats(t, withSES, [testStr]);
    /*
    while (c.dump().runQueue.length) {
      console.log('-');
      console.log(`--- turn starts`);
      await c.step();
      //console.log(c.dump().kernelTable);
    } */
    await c.run();
    const { log } = c.dump();
    t.deepEqual(log, expected);
    t.end();
  });
}

/* TABLE OF CONTENTS OF TESTS */
// left does: E(right.0).method() => returnData
// left does: E(right.0).method(dataArg1) => returnData
// left does: E(right.0).method(right.0) => returnData
// left does: E(right.0).method(left.1) => returnData
// left does: E(right.0).method(left.1) => returnData twice
// left does: E(right.1).method() => returnData
// left does: E(right.0).method() => right.presence
// left does: E(right.0).method() => left.presence
// left does: E(right.0).method() => right.promise => data
// left does: E(right.0).method() => right.promise => right.presence
// left does: E(right.0).method() => right.promise => left.presence
// left does: E(right.0).method() => right.promise => reject
// left does: E(right.0).method(left.promise) => returnData
// left does: E(right.0).method(right.promise) => returnData
// left does: E(right.0).method(right.promise => right.presence) => returnData
// left does: E(right.0).method(right.promise => left.presence) => returnData

/* TEST: left does: E(right.0).method() => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and returns data.
 */
runTest(test, false, 'left does: E(right.0).method() => returnData', [
  '=> right.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method(dataArg1) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with an argument and returns data connected to that argument.
 */
runTest(test, false, 'left does: E(right.0).method(dataArg1) => returnData', [
  '=> right.methodWithArgs got the arg: hello',
  '=> left vat receives the returnedData: hello was received',
]);

/* TEST: left does: E(right.0).method(right.0) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with the right vat's root object as an argument and does a
 * method call on the argument. It returns the result of the method
 * call on the argument, i.e. right.0.method() => 'called method'
 */
runTest(test, false, 'left does: E(right.0).method(right.0) => returnData', [
  '=> right.methodWithPresence got the ref [object Object]',
  '=> right.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method(left.1) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object with a new left object as an argument and returns data.
 */
runTest(test, false, 'left does: E(right.0).method(left.1) => returnData', [
  '=> right.methodWithPresence got the ref [Presence o-50]',
  '=> left.1.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method(left.1) => returnData twice
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object with a new left object as an argument and returns data. It
 * repeats this a second time. No new egresses/ingresses should be
 * allocated the second time. Also, both left.1 args should have the
 * same identity.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(left.1) => returnData twice',
  [
    '=> right.methodWithPresence got the ref [Presence o-50]',
    'ref equal each time: true',
    '=> right.methodWithPresence got the ref [Presence o-50]',
    '=> left.1.method was invoked',
    '=> left.1.method was invoked',
    '=> left vat receives the returnedData: called method',
    '=> left vat receives the returnedData: called method',
  ],
);

/* TEST: left does: E(right.1).method() => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object (a new object, not the root object) and returns data.
 */
runTest(test, false, 'left does: E(right.1).method() => returnData', [
  '=> right.1.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method() => right.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given presence that represents a new object on the right
 * side
 */
runTest(test, false, 'left does: E(right.0).method() => right.presence', [
  '=> right.1.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method() => left.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given presence that represents a new object on the left
 * side
 */
runTest(test, false, 'left does: E(right.0).method() => left.presence', [
  '=> left.1.method was invoked',
  '=> left vat receives the returnedData: called method',
]);

/* TEST: left does: E(right.0).method() => right.promise => data
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that is later resolved to data.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method() => right.promise => data',
  [
    '=> left vat receives the returnedPromise: [object Promise]',
    '=> right.methodReturnsPromise was invoked',
    '=> returnedPromise.then: foo',
  ],
);

/* TEST: left does: E(right.0).method() => right.promise => right.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that resolves to a presence that
 * represents an object on the right side.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method() => right.promise => right.presence',
  [
    '=> left vat receives the returnedPromise: [object Promise]',
    '=> returnedPromise.then: [Presence o-51]',
    '=> right.1.method was invoked',
    '=> presence methodCallResult: called method',
  ],
);

/* TEST: left does: E(right.0).method() => right.promise => left.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that resolves to a presence that
 * represents an object on the left side.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method() => right.promise => left.presence',
  [
    '=> left vat receives the returnedPromise: [object Promise]',
    '=> returnedPromise.then: [object Object]',
    '=> left.1.method was invoked',
    '=> presence methodCallResult: called method',
  ],
);

/* TEST: left does: E(right.0).method() => right.promise => reject
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that is rejected.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method() => right.promise => reject',
  [
    '=> right.methodReturnsPromiseReject was invoked',
    '=> left vat receives the rejected promise with error Error: this was rejected',
  ],
);

/* TEST: left does: E(right.0).method(left.promise) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that the left machine knows about
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(left.promise) => returnData',
  ['promise resolves to foo', '=> left vat receives the returnedData: foo'],
);

/* TEST: left does: E(right.0).method(right.promise) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that the right machine knows about. The promise
   should be unresolved at the time the right machine sends it.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(right.promise) => returnData 1',
  [
    '=> right.methodReturnsPromise was invoked',
    'promise resolves to foo',
    '=> left vat receives the returnedData: foo',
  ],
);

/* TEST: left does: E(right.0).method(right.promise) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that the right machine knows about. The promise
   should be resolved by the time the right machine sends it.
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(right.promise) => returnData 2',
  [
    '=> right.methodReturnsPromise was invoked',
    'promise resolves to foo',
    '=> left vat receives the returnedData: foo',
  ],
);

/* TEST: left does: E(right.0).method(right.promise => right.presence) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that resolves to a right.presence
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(right.promise => right.presence) => returnData',
  [
    '=> right.1.method was invoked',
    '=> left vat receives the returnedData: called method',
  ],
);

/* TEST: left does: E(right.0).method(right.promise => left.presence) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that resolves to a left.presence
 */
runTest(
  test,
  false,
  'left does: E(right.0).method(right.promise => left.presence) => returnData',
  [
    '=> left.1.method was invoked',
    '=> left vat receives the returnedData: called method',
  ],
);
