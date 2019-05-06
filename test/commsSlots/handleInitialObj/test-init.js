import { test } from 'tape-promise/tape';
import handleInitialObj from '../../../src/kernel/commsSlots/handleInitialObj';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleInitialObj init update machineState', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const state = makeState();
  t.equal(state.machineState.getMachineName(), undefined);
  t.equal(state.machineState.getProofMaterial(), undefined);

  const newMachineName = 'machine1';
  const newProofMaterial = 'proofMaterial1';
  const resolverID = 2;

  const result = handleInitialObj(
    state,
    mockSyscall,
    'init',
    JSON.stringify({
      args: [newMachineName, newProofMaterial],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
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
  t.end();
});

test('handleInitialObj init: only init once', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const state = makeState();
  t.equal(state.machineState.getMachineName(), undefined);
  t.equal(state.machineState.getProofMaterial(), undefined);

  const newMachineName = 'machine1';
  const newProofMaterial = 'proofMaterial1';
  const resolverID = 2;

  const result = handleInitialObj(
    state,
    mockSyscall,
    'init',
    JSON.stringify({
      args: [newMachineName, newProofMaterial],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
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

  t.throws(() => {
    return handleInitialObj(
      state,
      mockSyscall,
      'init',
      JSON.stringify({
        args: [newMachineName, newProofMaterial],
      }),
      [],
      resolverID,
      helpers,
    );
  });

  t.end();
});
