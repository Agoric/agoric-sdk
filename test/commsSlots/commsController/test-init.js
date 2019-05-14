import { test } from 'tape-promise/tape';
import handleCommsController from '../../../src/kernel/commsSlots/commsController';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleCommsController init', t => {
  let fulfillToDataArgs;
  let callNowArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
    callNow(...args) {
      callNowArgs = args;
    },
  };

  const state = makeState();
  t.equal(state.machineState.getMachineName(), undefined);
  t.equal(state.machineState.getProofMaterial(), undefined);

  const newMachineName = 'machine1';
  const newProofMaterial = 'proofMaterial1';
  const devNode = { type: 'device', id: 3 };
  const slot0 = { '@qclass': 'slot', index: 0 };
  const inboundHandlerFacetID = 4;
  const resolverID = 2;

  const result = handleCommsController(
    state,
    mockSyscall,
    'init',
    JSON.stringify({
      args: [newMachineName, newProofMaterial, slot0],
    }),
    [ devNode ],
    resolverID,
    helpers,
    inboundHandlerFacetID,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(callNowArgs, [
    devNode, 'registerHandler',
    JSON.stringify({ args: [ newMachineName, slot0 ] }),
    [ { '@qclass': 'export', index: inboundHandlerFacetID } ],
  ]);
  t.deepEqual(fulfillToDataArgs, [
    resolverID,
    JSON.stringify(newMachineName),
    [],
  ]);

  // ensure state updated correctly
  const currentMachineName = state.machineState.getMachineName();
  const currentProofMaterial = state.machineState.getProofMaterial();
  t.equal(currentMachineName, newMachineName);
  t.equal(currentProofMaterial, newProofMaterial);
  t.deepEqual(state.channels.getChannelDevice(), devNode);

  t.throws(() => {
    return handleCommsController(
      state,
      mockSyscall,
      'init',
      JSON.stringify({
        args: [newMachineName, newProofMaterial, slot0],
      }),
      [ devNode ],
      resolverID,
      helpers,
      inboundHandlerFacetID,
    );
  });

  t.end();
});
