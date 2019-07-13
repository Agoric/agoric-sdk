import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
};

test('makeCommsSlots fulfillToPresence', t => {
  const calls = [];
  const mockSyscall = {
    send(...args) {
      calls.push(['send', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  const vatTP = { type: 'import', id: 4 };
  const state = commsSlots.getState();
  state.machineState.setVatTP(vatTP);

  state.clists.add(
    'abc',
    { type: 'promise', id: 20 },
    { type: 'your-egress', id: 9 },
    { type: 'your-ingress', id: 9 },
  );

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
  t.equal(calls[0][0], 'send');
  t.deepEqual(calls[0][1], [
    vatTP,
    'send',
    JSON.stringify({
      args: [
        'abc',
        JSON.stringify({
          event: 'fulfillToPresence',
          promise: { type: 'your-ingress', id: 9 },
          target: { type: 'your-egress', id: 3 },
        }),
      ],
    }),
    [],
  ]);
  t.end();
});
