import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

test('makeCommsSlots notifyFulfillToData', t => {
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

  const promiseID = 22;

  // setup
  const state = commsSlots.getState();
  const kernelToMeSlot = {
    type: 'promise',
    id: promiseID,
  };
  const youToMeSlot = {
    type: 'your-egress',
    id: 1,
  };
  const meToYouSlot = state.clists.changePerspective(youToMeSlot);

  state.clists.add(
    'machine1',
    'egress',
    kernelToMeSlot,
    youToMeSlot,
    meToYouSlot,
  );

  state.machineState.setMachineName('bot');
  state.subscribers.add(promiseID, 'machine1');
  state.channels.add('machine1', 'channel');

  commsSlots.notifyFulfillToData(22, 'hello', []);
  t.equal(fMachineName, 'bot');
  t.equal(tMachineName, 'machine1');
  t.equal(
    sentData,
    '{"event":"notifyFulfillToData","resolverID":1,"args":"hello","slots":[]}',
  );
  t.end();
});
