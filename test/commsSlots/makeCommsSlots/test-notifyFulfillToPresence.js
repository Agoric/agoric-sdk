import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
};

test('makeCommsSlots notifyFulfillToPresence', t => {
  const calls = [];
  const mockSyscall = {
    callNow(...args) {
      calls.push(['callNow', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  const devNode = { type: 'device', id: 42 };
  const state = commsSlots.getState();
  state.channels.setChannelDevice(devNode);

  state.clists.add(
    'abc',
    { type: 'promise', id: 20 },
    { type: 'your-egress', id: 9 },
    { type: 'your-ingress', id: 9 },
  );
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

  commsSlots.notifyFulfillToPresence(20, kernelToMeSlot);
  t.equal(calls.length, 1);
  t.equal(calls[0][0], 'callNow');
  t.deepEqual(calls[0][1], [
    devNode,
    'sendOutbound',
    JSON.stringify({
      args: [
        'bot',
        'abc',
        JSON.stringify({
          event: 'notifyFulfillToPresence',
          promise: { type: 'your-ingress', id: 9 },
          target: { type: 'your-egress', id: 3 },
        }),
      ],
    }),
    [],
  ]);
  t.end();
});
