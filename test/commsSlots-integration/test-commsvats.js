import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../../src/index';

// 1. Invoke method on other machine with no arguments - don’t look at return value
// 2. Invoke with argument all the way through
// 3. Pass reference through - where reference is the same as the target
// 4. Pass reference through where the reference is one of the sending vats’ objects. Test by invoking a method
// 5. Should recognize is not yet exported
// 6. Send a message ignoring arguments and get a promise back for the result
// 7. Promise resolving to a slot - two different sides for that slots
// 8. Slot that exists on my machine, slot on their machine
// 9. Something that represents promises over the wire
// 10. Passing promises as arguments, resvoling a promise to an array that contains a promise

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
    'addExport called with sender left, index 0',
    'addImport called with machineName right, index 0',
    '=> left.callMethodOnPresence is called with args: []',
    'sendOverChannel from left, to: right message: {"index":0,"methodName":"method","args":[],"slots":[],"resultIndex":33}',
    '=> right.method was invoked',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","resolverID":33,"data":"{\\"@qclass\\":\\"undefined\\"}"}',
  ]);
  // do we want qclass undefined for no return??
  t.end();
});

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
    'addExport called with sender left, index 0',
    'addImport called with machineName right, index 0',
    '=> left.callMethodOnPresence is called with args: [hello]',
    'sendOverChannel from left, to: right message: {"index":0,"methodName":"takeArgAndReturnData","args":[["hello"]],"slots":[],"resultIndex":33}',
    '=> right.takeArgAndReturnData got the arg: hello',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","resolverID":33,"data":"\\"hello was received\\""}',
    '=> left vat receives the returnedData: hello was received',
  ]);
  t.end();
});

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
    'addExport called with sender left, index 0',
    'addImport called with machineName right, index 0',
    'rootRightPresence [object Object]',
    'sendOverChannel from left, to: right message: {"index":0,"methodName":"takeReferenceEqualToTargetAndReturnData","args":[{"@qclass":"slot","index":0}],"slots":[{"type":"export","index":0}],"resultIndex":33}',
    "=> the promise given by the call to left.callMethodOnPresenceWithRef resolved to 'presence was called'",
    '=> right.takeReferenceEqualToTargetAndReturnData got the arg: [object Object]',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","resolverID":33,"data":"\\"ref was received\\""}',
    '=> left vat receives the returnedData: ref was received',
  ]);
  t.end();
});
