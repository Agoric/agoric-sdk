// eslint-disable-next-line import/order
import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { Far, makeMarshal } from '@endo/marshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import { setupTestLiveslots } from '../test/liveslots-helpers.js';

export { test };

// This file contains two test harnesses for virtual objects.  The first,
// runVOTest, is to to help verify that a VO can be garbage collected and then
// reloaded from persistent storage while maintaining functionality.  The
// second, runDVOTest, is to help verify that a durable VO can survive having
// its containing vat shutdown and then restarted while maintaining
// functionality (including maintaining any necessary state that it must keep
// track of).

// Testing VO swapping with runVOTest:
//
// Step 1: import the necessary harness paraphernalia
//
//   import { test, runVOTest } from '@agoric/swingset-vat/tools/vo-test-harness.js';
//
// `test` is the regular Ava test object that you'd normally import from
// `@agoric/swingset-vat/tools/prepare-test-env-ava.js`.  The test harness will
// import it for you, since it needs to set up some test things itself.
//
// Step 2: write three functions that you will pass to the test harness
//
// `prepare(VatData)` should perform any necessary environmental setup that the
// virtual object kind under test will require.  In particular, this includes
// executing any necessary `defineKind` or `defineDurableKind` calls to
// establish the VO itself.  The `VatData` parameter is a regular `VatData`
// object that can be used to obtain functions like `defineKind`.
//
// `makeTestObject()` should create and return an instance of the VO to be tested.
//
// `testTestObject(obj, phase)` should execute whatever actual testing and test
// assertions you care to perform to verify your VO kind.  `obj` will be a
// reference to an in-memory representative of the virtual object being tested
// and `phase` will be a string, either 'before' or 'after', indicating whether
// this instance of the object is before or after having been swapped out of
// memory and then reloaded.  A correctly functioning VO should, among other
// things, behave exactly the same in both cases.
//
// Step 3: write an Ava test that invokes the test harness
//
// The outer portion of this should be a conventional Ava test written in the
// conventional way, e.g.:
//
// test('test name', async t => {
//   ...your test here...
// });
//
// The body of your test most likely will enclose the three functions described
// above, since your `testTestObject` function (and possibly the others,
// depending on how you code things) will need access to the `t` object in order
// to execute test assertions.  Then, from inside your test invoke:
//
//   await runVOTest(t, prepare, makeTestObject, testTestObject);
//
// This will:
//   1 - execute the `prepare` function
//   2 - create a test object instance via `makeTestObject`
//   3 - run `testTestObject` on the test object (this is the 'before' phase)
//   4 - drop all in-memory references to the test object and force a GC pass
//   5 - run `testTestObject` on the test object *again* (this is the 'after' phase)
//
// The key thing that the test harness provides for you is step 4, which
// packages up some awkward boilerplate that's a bit of mysterious if you're not
// already pretty familiar with how the VO GC mechanism works (or perhaps even
// if you are).
//
// Note: It is critical that none of your own code retain any in-memory
// references to the test object beyond step 3.  However, another key service
// that the test harness provides is to detect if you did this and if so fail
// the test.  One use of the test harness is to verify that you aren't
// accidentally holding such references when you didn't mean to.
//
// The SwingSet test `vo-test-harness/test-vo-test-harness.js` is a test of the
// VO test harness itself, but can be used as a simple example of how to set
// things up.

export async function runVOTest(t, prepare, makeTestObject, testTestObject) {
  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { defineKind } = VatData;

    const freeChecker = new WeakSet();

    const makeSlug = defineKind('slug', label => ({ label }), {
      getLabel: ({ state }) => state.label,
    });
    const cacheDisplacer = makeSlug('cacheDisplacer');

    const makeHolder = defineKind('holder', (held = null) => ({ held }), {
      setValue: ({ state }, value) => {
        state.held = value;
      },
      getValue: ({ state }) => state.held,
    });
    const holder = makeHolder();

    let held = null;

    prepare(VatData);

    function displaceCache() {
      return cacheDisplacer.getLabel();
    }

    return Far('root', {
      makeAndHold() {
        held = makeTestObject();
        freeChecker.add(held);
        displaceCache();
      },
      storeHeld() {
        holder.setValue(held);
        displaceCache();
      },
      dropHeld() {
        held = null;
        displaceCache();
      },
      fetchAndHold() {
        held = holder.getValue();
        t.falsy(
          freeChecker.has(held),
          'somebody continues to hold test object',
        );
        displaceCache();
      },
      testHeld(phase) {
        testTestObject(held, phase);
      },
    });
  }

  const { dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
    true,
  );

  await dispatchMessage('makeAndHold');
  await dispatchMessage('testHeld', 'before');
  await dispatchMessage('storeHeld');
  await dispatchMessage('dropHeld');
  await dispatchMessage('fetchAndHold');
  await dispatchMessage('testHeld', 'after');
}

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

const stupidM = makeMarshal(
  () => undefined,
  slot => `@${slot}`,
  {
    serializeBodyFormat: 'smallcaps',
  },
);
const extractLog = capdata => stupidM.unserialize(capdata);

// Testing DVO resurrection with runDVOTest:
//
// Step 1: import the necessary harness paraphernalia
//
//   import { test, runDVOTest } from '@agoric/swingset-vat/tools/vo-test-harness.js';
//
// `test` is the regular Ava test object that you'd normally import from
// `@agoric/swingset-vat/tools/prepare-test-env-ava.js`.  The test harness will
// import it for you, since it needs to set up some test things itself.
//
// Step 2: write a simple vat for exercising your object implementation
//
// The vat's `buildRootObject` function should:
//
//   Step 2a: Attempt to retrieve a kind handle from the vat's baggage and if
//       not found create one and store it there.
//
//   Step 2b: Execute a `defineDurableObject` or `defineDurableObjectMulti`
//       call, using this kind handle, to define the kind for the object that
//       will be the subject of the test.
//
//   Step 2c: Attempt to retrieve the test object (of the kind just defined or
//       retrieved) from the baggage and if not found create an instance and
//       store *it* in the baggage as well.
//
// The vat's root object should provide a method `runTests(testDriver, phase)`,
// where `testDriver` is an object that will be passed into it by the test
// driver to communicate results back, and phase is a string, either 'before' or
// 'after', indicating which phase of the test is being run.
//
// The `runTests` method should perform whatever checks you find suitable to
// verify that the durable object instance is working properly and has all the
// approriate state it needs to do its job.  `runTests` should report back to
// the test driver by sending it one or more `log(whatever)` messages (where
// `whatever` is whatever information the `runTests` method cares to report;
// typically this will be a string but can be any serializable data object).
// Once it is done testing the object, it should send the message
// `testComplete()` to the test driver, signalling that no further log results
// will be forthcoming.
//
// Step 3: write a check function that you will pass to the test harness
//
// `logCheck(t, phase, log)` where `t` is the regular Ava test assertion object,
// `phase` will be a string, either 'before' or 'after', indicating whether is
// checking the pre-shutdown test run or the post-restart test run, and `log` is
// an array of log items as transmitted by the test using the `log` message as
// described above.
//
// Step 4: write an Ava test that invokes the test harness
//
// test('test name', async t => {
//   ...your test here...
// });
//
// The body of your test most likely will enclose the `logCheck` functions described
// above, though it need not.  From inside your test invoke:
//
//   await runDVOTest(t, logCheck, testVatSourcePath, testVatParams);
//
// The `testVatSourcePath` parameter is the full path to the source file
// containing your test vat as implemented in Step 2.  The `testVatParams`
// object will be given to the test vat's `buildRootObject` function as its
// `vatParameters` parameter; it is entirely optional but if provided should be
// a serializable data object.
//
// This will:
//   1 - Launch your test vat
//   2 - Send it the message `runTests(testDriver, 'before')`
//   3 - Collect log messages from the test vat until it sends the `testComplete()` message
//   5 - Call `logCheck` with the sequence of log messages sent by the test vat
//   4 - Shutdown the test vat
//   6 - Relaunch the test vat, as if it had been upgraded (though with the same code as before)
//   7 - Send it the message `runTests(testDriver, 'after')`
//   8 - Collect log messages from the test vat until it sends the `testComplete()` message
//   9 - Call `logCheck` with the sequence of log messages sent during the 'after' phase
//
// The SwingSet test `vo-test-harness/test-dvo-test-harness.js` and the
// accompanying vat definition `vo-test-harness/vat-dvo-test-test.js` form a
// test of the durable VO test harness itself, but can be used as a simple
// example of how to set things up.

export async function runDVOTest(t, logCheck, testVatSource, testVatParams) {
  const config = {
    includeDevDependencies: true,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-dvo-test.js') },
    },
    bundles: {
      testVat: { sourceSpec: testVatSource },
    },
  };

  const hostStorage = initSwingStore();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  async function run(method, args = []) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  }

  // create initial version
  const [v1status, v1capdata] = await run('buildV1', [testVatParams]);
  t.is(v1status, 'fulfilled');
  logCheck(t, 'before', extractLog(v1capdata));

  // now perform the upgrade
  const [v2status, v2capdata] = await run('upgradeV2', [testVatParams]);
  t.is(v2status, 'fulfilled');
  logCheck(t, 'after', extractLog(v2capdata));
}
