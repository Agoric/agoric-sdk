import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../../src/index';

// 1. Invoke method on other machine with no arguments - don’t look at return value
// 2. Invoke with argument all the way through
// 3. Pass reference through - where reference is the same as the target
// 4. Pass reference through where the reference is one of the sending vats’ objects. Test by invoking a method
//  Should recognize is not yet exported
//    4b. make a second call with that arg and make sure it shows up
//    as equal - no new allocation in tables
// 5. Send a message ignoring arguments and get a promise back for the
//    result - resolves to static data
//    5b - data could contain a slot:
//    - make sure the serialization is correct.
//      piece of data that contains a reference to left side slots,
//      and another for right side slots
// 6. Promise resolving to a slot, not just data
//    6a - left side
//    6b - right side
//    6c - test promise reject
//      eventually we would pipeline to this
// 7. Something that represents promises over the wire
//      Passing promises as arguments, resolving a promise to an array
//      that contains a promise
//      left includes promise that it knows about in calling right,
//      the right ends up with its own promise and should be able to a
//      then on that promise, when left is creator/decider, the right
//      should be notified when it is resolved.
//        test different interleavings - wait for resolution, etc.

const { buildChannel } = require('../../src/devices');

async function runTest(t, withSES, argv) {
  const config = await loadBasedir(
    path.resolve(__dirname, '../basedir-commsvat'),
  );

  const channelDevice = buildChannel();
  const vatDevices = new Map();
  const commsConfig = {
    devices: {
      channel: {
        attenuatorSource: channelDevice.attenuatorSource,
        bridge: channelDevice.bridge,
      },
    },
  };

  for (const vatID of config.vatSources.keys()) {
    if (vatID.endsWith('comms')) {
      vatDevices.set(vatID, commsConfig);
    }
  }

  if (vatDevices.size > 0) {
    config.vatDevices = vatDevices;
  }
  const c = await buildVatController(config, withSES, argv);
  return c;
}

// 1. Invoke method on other machine with no arguments
test('Invoke method on other machine with no arguments', async t => {
  const c = await runTest(t, false, ['method']);
  await c.run();
  const { log } = c.dump();
  t.deepEqual(log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    '=> left.callMethodOnPresence is called with args: []',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"method","args":[],"slots":[],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to presence was called',
    '=> right.method was invoked',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"called method\\"","slots":[]}',
    '=> left vat receives the returnedData: called method',
  ]);
  t.end();
});

// 2. Invoke with argument all the way through
test('Invoke method with argument on other machine', async t => {
  const c = await runTest(t, false, ['methodWithArgs', 'hello']);
  await c.run();
  const { log } = c.dump();
  t.deepEqual(log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    '=> left.callMethodOnPresence is called with args: [hello]',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeArgAndReturnData","args":[["hello"]],"slots":[],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to presence was called',
    '=> right.takeArgAndReturnData got the arg: hello',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"hello was received\\"","slots":[]}',
    '=> left vat receives the returnedData: hello was received',
  ]);
  t.end();
});

// 3. Pass reference through - where reference is the same as the target
test('Pass reference through - where reference is the same as the target', async t => {
  const c = await runTest(t, false, ['methodWithRef']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceEqualToTargetAndReturnData","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-egress","id":0}],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to presence was called',
    '=> right.takeReferenceEqualToTargetAndReturnData got the arg: [object Object]',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"ref was received\\"","slots":[]}',
    '=> left vat receives the returnedData: ref was received',
  ]);
  t.end();
});

// 4. Pass reference through where the reference is one of the sending
//    vats’ objects. Test by invoking a method
test('Pass reference through where the reference is one of the sending vat’s objects', async t => {
  const c = await runTest(t, false, ['methodWithOtherRef']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceDifferentThanTargetAndReturnData","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to presence was called',
    '=> right.takeReferenceDifferentThanTargetAndReturnData got the arg: [object Object]',
    'sendOverChannel from right, to: left message: {"target":{"type":"your-egress","id":2},"methodName":"hi","args":[],"slots":[],"resultSlot":{"type":"your-answer","id":34}}',
    'sendOverChannel from left, to: right: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"hello\\"","slots":[]}',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"hello\\"","slots":[]}',
    '=> left vat receives the returnedData: hello',
  ]);
  t.end();
});

// 4b. make a second call with that arg and make sure it shows up
//    as equal - no new allocation in tables
test('make a second call with that arg and make sure it shows up as equal - no new allocation in tables', async t => {
  const c = await runTest(t, false, ['methodWithOtherRefTwice']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceDifferentThanTargetAndReturnDataTwice","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultSlot":{"type":"your-answer","id":34}}',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceDifferentThanTargetAndReturnDataTwice","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultSlot":{"type":"your-answer","id":36}}',
    'bootstrap call resolved to presence was called',
    '=> right.takeReferenceDifferentThanTargetAndReturnData got the arg: [object Object]',
    'ref equal each time: true',
    '=> right.takeReferenceDifferentThanTargetAndReturnData got the arg: [object Object]',
    'sendOverChannel from right, to: left message: {"target":{"type":"your-egress","id":2},"methodName":"hi","args":[],"slots":[],"resultSlot":{"type":"your-answer","id":34}}',
    'sendOverChannel from right, to: left message: {"target":{"type":"your-egress","id":2},"methodName":"hi","args":[],"slots":[],"resultSlot":{"type":"your-answer","id":36}}',
    'sendOverChannel from left, to: right: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"hello\\"","slots":[]}',
    'sendOverChannel from left, to: right: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":36},"args":"\\"hello\\"","slots":[]}',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"hello\\"","slots":[]}',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":36},"args":"\\"hello\\"","slots":[]}',
    '=> left vat receives the returnedData: hello',
    '=> left vat receives the returnedData: hello',
  ]);
  t.end();
});

// 5. Send a message without arguments and get a promise back for the
//    result that resolves to static data
test('Send message and get promise back', async t => {
  const c = await runTest(t, false, ['getPromiseBack']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'left received [object Promise]',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"getPromiseBack","args":[],"slots":[],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to called left.getPromiseBack',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"\\"foo\\"","slots":[]}',
    'left p resolved to foo',
  ]);
  t.end();
});

// 5b. Send a message ignoring arguments and get a promise back for the
//    result - resolves to static data that contains a slot on left side
test('Resolve to static data that contains slot on left side', async t => {
  const c = await runTest(t, false, ['takeRefAndReturnItAsData']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeRefAndReturnItAsData","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to callMethodOnRefAndReturnItAsData was called',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"{\\"ref\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0}}","slots":[{"type":"your-egress","id":2}]}',
    '=> left vat receives the returnedData: hello',
  ]);
  t.end();
});

// 5c. Send a message ignoring arguments and get a promise back for the
//    result - resolves to static data that contains a slot on *right* side
test('Resolve to static data that contains slot on right side', async t => {
  const c = await runTest(t, false, ['takeRefAndReturnItAsDataRight']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeRefAndReturnItAsData","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultSlot":{"type":"your-answer","id":34}}',
    'bootstrap call resolved to callMethodOnRefAndReturnItAsData was called',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-question","id":34},"args":"{\\"ref\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0}}","slots":[{"type":"your-egress","id":2}]}',
    '=> left vat receives the returnedData: yummm',
  ]);
  t.end();
});

// 6. Promise resolving to a slot, not just data
test.only('call method on promise for presence', async t => {
  const c = await runTest(t, false, ['sendPromiseForPresence']);
  await c.run();
  const dump = c.dump();
  t.deepEqual(dump.log, [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceEqualToTargetAndCallMethod","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultIndex":3}',
    'bootstrap call resolved to left vat called right',
    '=> right.takeReferenceEqualToTargetAndCallMethod got the arg: [object Object]',
    'sendOverChannel from right, to: left message: {"target":{"type":"your-egress","id":2},"methodName":"method","args":[],"slots":[],"resultIndex":2}',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"method","args":[],"slots":[],"resultIndex":4}',
    '=> right.method was invoked',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promiseID":4,"args":"\\"called method\\"","slots":[]}',
    'sendOverChannel from left, to: right: {"event":"notifyFulfillToData","promiseID":2,"args":"\\"called method\\"","slots":[]}',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promiseID":3,"args":"\\"called method\\"","slots":[]}',
    '=> left vat receives the returnedData: called method',
  ]);
  t.end();
});

// // 6. Promise resolving to a slot, not just data
// test('call method on promise for presence', async t => {
//   const c = await runTest(t, false, ['sendPromiseForPresence']);
//   await c.run();
//   const dump = c.dump();
//   t.deepEqual(dump.log, [
//     '=> setup called',
//     '=> bootstrap() called',
//     'init called with name right',
//     'init called with name left',
//     'connect called with otherMachineName left, channelName channel',
//     'connect called with otherMachineName right, channelName channel',
//     'addEgress called with sender left, index 0, valslot [object Object]',
//     'addIngress called with machineName right, index 0',
//     'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"takeReferenceEqualToTargetAndCallMethod","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"your-ingress","id":2}],"resultIndex":33}',
//     'bootstrap call resolved to left vat called right',
//     '=> right.takeReferenceEqualToTargetAndCallMethod got the arg: [object Object]',
//     'sendOverChannel from right, to: left message: {"target":{"type":"your-egress","id":2},"methodName":"method","args":[],"slots":[],"resultIndex":33}',
//     'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"method","args":[],"slots":[],"resultIndex":34}',
//     '=> right.method was invoked',
//     'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","resolverID":34,"args":"\\"called method\\"","slots":[]}',
//     'sendOverChannel from left, to: right: {"event":"notifyFulfillToData","resolverID":33,"args":"\\"called method\\"","slots":[]}',
//     'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","resolverID":33,"args":"\\"called method\\"","slots":[]}',
//     '=> left vat receives the returnedData: called method',
//   ]);
//   t.end();
// });
