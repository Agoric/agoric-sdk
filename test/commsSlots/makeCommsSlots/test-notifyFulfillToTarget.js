import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
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

  state.subscribers.add(20, 'abc');
  state.channels.add('abc', 'channel');
  state.machineState.setMachineName('bot');

  commsSlots.notifyFulfillToTarget(20, {
    type: 'import',
    id: 11,
  });

  t.equal(fMachineName, 'bot');
  t.equal(tMachineName, 'abc');
  t.equal(
    sentData,
    '{"event":"notifyFulfillToTarget","promiseID":20,"target":{"type":"import","id":11}}',
  );
  t.end();
});
