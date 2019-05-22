import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

test('makeCommsSlots notifyFulfillToData', t => {
  const calls = [];
  const mockSyscall = {
    send(...args) {
      calls.push(['send', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  const vatTP = { type: 'import', id: 4 };
  const promiseID = 22;

  // setup
  const state = commsSlots.getState();
  state.machineState.setVatTP(vatTP);
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

  commsSlots.notifyFulfillToData(22, 'hello', []);
  t.equal(calls.length, 1);
  t.equal(calls[0][0], 'send');
  t.deepEqual(calls[0][1], [
    vatTP,
    'send',
    JSON.stringify({
      args: [
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
