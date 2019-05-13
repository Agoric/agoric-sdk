// eslint-disable-next-line no-unused-vars
import { runTest, runTestOnly, stepTestOnly, runTestSkip } from './run-test';

// 7. Something that represents promises over the wire
//      Passing promises as arguments, resolving a promise to an array
//      that contains a promise
//      left includes promise that it knows about in calling right,
//      the right ends up with its own promise and should be able to a
//      then on that promise, when left is creator/decider, the right
//      should be notified when it is resolved.
//        test different interleavings - wait for resolution, etc.

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
// left does: E(right.0).method(left.presence) => returnData
// left does: E(right.0).method(right.presence) => returnData

/* TEST: left does: E(right.0).method() => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and returns data.
 */
runTest('left does: E(right.0).method() => returnData');

/* TEST: left does: E(right.0).method(dataArg1) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with an argument and returns data connected to that argument.
 */
runTest('left does: E(right.0).method(dataArg1) => returnData');

/* TEST: left does: E(right.0).method(right.0) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with the right vat's root object as an argument and does a
 * method call on the argument. It returns the result of the method
 * call on the argument, i.e. right.0.method() => 'called method'
 */
runTest('left does: E(right.0).method(right.0) => returnData');

/* TEST: left does: E(right.0).method(left.1) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object with a new left object as an argument and returns data.
 */
runTest('left does: E(right.0).method(left.1) => returnData');

/* TEST: left does: E(right.0).method(left.1) => returnData twice
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object with a new left object as an argument and returns data. It
 * repeats this a second time. No new egresses/ingresses should be
 * allocated the second time. Also, both left.1 args should have the
 * same identity.
 */
runTest('left does: E(right.0).method(left.1) => returnData twice');

/* TEST: left does: E(right.1).method() => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's
 * object (a new object, not the root object) and returns data.
 */
runTest('left does: E(right.1).method() => returnData');

/* TEST: left does: E(right.0).method() => right.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given presence that represents a new object on the right
 * side
 */
runTest('left does: E(right.0).method() => right.presence');

/* TEST: left does: E(right.0).method() => left.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given presence that represents a new object on the left
 * side
 */
runTest('left does: E(right.0).method() => left.presence');

/* TEST: left does: E(right.0).method() => right.promise => data
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that resolves to data.
 */
runTest('left does: E(right.0).method() => right.promise => data');

/* TEST: left does: E(right.0).method() => right.promise => right.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that resolves to a presence that
 * represents an object on the right side.
 */
runTest('left does: E(right.0).method() => right.promise => right.presence');

/* TEST: left does: E(right.0).method() => right.promise => left.presence
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that resolves to a presence that
 * represents an object on the left side.
 */
runTest('left does: E(right.0).method() => right.promise => left.presence');

/* TEST: left does: E(right.0).method() => right.promise => reject
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object and is given a promise that is rejected.
 */

// TODO: How do we want to handle rejection? Currently errors in src/kernel/marshal.js:273
runTestSkip('left does: E(right.0).method() => right.promise => reject');

/* TEST: left does: E(right.0).method(left.promise) => returnData
 * DESCRIPTION: The left vat invokes a method on the right vat's root
 * object with a promise that the left machine knows about
 */
runTestSkip('left does: E(right.0).method(left.promise) => returnData');
