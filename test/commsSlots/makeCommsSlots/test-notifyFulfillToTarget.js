import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
};

test('makeCommsSlots notifyFulfillToTarget', t => {
  const mockSyscall = {};

  let sentData;
  let fMachineName;
  let tMachineName;

  function sendOverChannel(fromMachineName, toMachineName, data) {
    fMachineName = fromMachineName;
    tMachineName = toMachineName;
    sentData = data;
  }

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {
    channel: {
      sendOverChannel,
    },
  });

  const state = commsSlots.getState();

  state.clists.add(
    'abc',
    { type: 'promise', id: 20 },
    { type: 'your-egress', id: 9 },
    { type: 'your-ingress', id: 9 },
  );
  state.channels.add('abc', 'channel');
  state.machineState.setMachineName('bot');
  const kernelToMeSlot = {
    type: 'import',
    id: 11,
  };
  const youToMeSlot = {
    type: 'your-ingress',
    id: 3,
  };
  const meToYouSlot = state.clists.changePerspective(youToMeSlot);

  // is this what we need to add?
  state.clists.add('abc', kernelToMeSlot, youToMeSlot, meToYouSlot);

  commsSlots.notifyFulfillToTarget(20, kernelToMeSlot);

  t.equal(fMachineName, 'bot');
  t.equal(tMachineName, 'abc');
  t.equal(
    sentData,
    '{"event":"notifyFulfillToTarget","promise":{"type":"your-ingress","id":9},"target":{"type":"your-egress","id":3}}',
  );
  t.end();
});
