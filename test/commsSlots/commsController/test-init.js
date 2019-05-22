import { test } from 'tape-promise/tape';
import handleCommsController from '../../../src/kernel/commsSlots/commsController';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

const UNDEFINED = JSON.stringify({ '@qclass': 'undefined' });

test('handleCommsController init', t => {
  const calls = [];

  const mockSyscall = {
    fulfillToData(...args) {
      calls.push(['fulfillToData', args]);
    },
    send(...args) {
      calls.push(['send', args]);
    },
  };

  const state = makeState();
  t.equal(state.machineState.getVatTP(), undefined);

  const vatTP = { type: 'import', id: 3 };
  const slot0 = { '@qclass': 'slot', index: 0 };
  const inboundHandlerFacetID = 4;
  const resolverID = 2;

  const result = handleCommsController(
    state,
    mockSyscall,
    'init',
    JSON.stringify({
      args: [slot0],
    }),
    [vatTP],
    resolverID,
    helpers,
    inboundHandlerFacetID,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(calls.shift(), [
    'send',
    [
      vatTP,
      'registerCommsHandler',
      JSON.stringify({ args: [slot0] }),
      [{ type: 'export', id: inboundHandlerFacetID }],
    ],
  ]);

  t.deepEqual(calls.shift(), ['fulfillToData', [resolverID, UNDEFINED, []]]);

  // ensure state updated correctly
  t.equal(state.machineState.getVatTP(), vatTP);

  t.throws(() => {
    return handleCommsController(
      state,
      mockSyscall,
      'init',
      JSON.stringify({
        args: [slot0],
      }),
      [vatTP],
      resolverID,
      helpers,
      inboundHandlerFacetID,
    );
  });

  t.end();
});
