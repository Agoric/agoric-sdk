import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

test('makeCommsSlots notifyFulfillToData', t => {
  const calls = [];
  const mockSyscall = {
    callNow(...args) {
      calls.push(['callNow', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  const devNode = { type: 'device', id: 42 };
  const promiseID = 22;

  // setup
  const state = commsSlots.getState();
  state.channels.setChannelDevice(devNode);
  const kernelToMeSlot = {
    type: 'promise',
    id: promiseID,
  };
  const youToMeSlot = {
    type: 'your-egress',
    id: 1,
  };
  const meToYouSlot = state.clists.changePerspective(youToMeSlot);

  state.clists.add('machine1', kernelToMeSlot, youToMeSlot, meToYouSlot);

  state.machineState.setMachineName('bot');

  commsSlots.notifyFulfillToData(22, 'hello', []);
  t.equal(calls.length, 1);
  t.equal(calls[0][0], 'callNow');
  t.deepEqual(calls[0][1], [
    devNode,
    'sendOutbound',
    JSON.stringify({
      args: [
        'bot',
        'machine1',
        JSON.stringify({
          event: 'notifyFulfillToData',
          promise: meToYouSlot,
          args: 'hello',
          slots: [],
        }),
      ],
    }),
    [],
  ]);
  t.end();
});
