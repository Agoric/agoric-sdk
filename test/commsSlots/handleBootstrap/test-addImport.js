import { test } from 'tape-promise/tape';
import handleBootstrap from '../../../src/kernel/commsSlots/handleBootstrap';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleBootstrap addImport', t => {
  let fulfillToTargetArgs;

  const mockSyscall = {
    fulfillToTarget(...args) {
      fulfillToTargetArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const index = 0;

  const result = handleBootstrap(
    state,
    mockSyscall,
    'addImport',
    JSON.stringify({
      args: [sender, 0],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToTargetArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const kernelExport = state.clists.getKernelExport('inbound', sender, index);
  const machineInfo = state.clists.getMachine('inbound', 1);
  t.equal(kernelExport, 1); // actual, expected
  t.equal(machineInfo.machineName, sender);
  t.end();
});

test('handleBootstrap addImport twice', t => {
  let fulfillToTargetArgs;

  const mockSyscall = {
    fulfillToTarget(...args) {
      fulfillToTargetArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const sender2 = 'user';
  const index = 0;

  const result = handleBootstrap(
    state,
    mockSyscall,
    'addImport',
    JSON.stringify({
      args: [sender, 0],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToTargetArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const kernelExport = state.clists.getKernelExport('inbound', sender, index);
  const machineInfo = state.clists.getMachine('inbound', 1);
  t.equal(kernelExport, 1); // actual, expected
  t.equal(machineInfo.machineName, sender);

  const result2 = handleBootstrap(
    state,
    mockSyscall,
    'addImport',
    JSON.stringify({
      args: [sender2, 0],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result2, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToTargetArgs, [
    resolverID,
    {
      type: 'export',
      id: 2,
    },
  ]);

  // ensure state updated correctly
  const kernelExport2 = state.clists.getKernelExport('inbound', sender2, index);
  const machineInfo2 = state.clists.getMachine('inbound', 2);
  t.equal(kernelExport2, 2); // actual, expected
  t.equal(machineInfo2.machineName, sender2);
  t.end();
});

test('handleBootstrap addImport same again', t => {
  let fulfillToTargetArgs;

  const mockSyscall = {
    fulfillToTarget(...args) {
      fulfillToTargetArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const index = 0;

  const result = handleBootstrap(
    state,
    mockSyscall,
    'addImport',
    JSON.stringify({
      args: [sender, 0],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToTargetArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const kernelExport = state.clists.getKernelExport('inbound', sender, index);
  const machineInfo = state.clists.getMachine('inbound', 1);
  t.equal(kernelExport, 1); // actual, expected
  t.equal(machineInfo.machineName, sender);

  const result2 = handleBootstrap(
    state,
    mockSyscall,
    'addImport',
    JSON.stringify({
      args: [sender, 0],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result2, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToTargetArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const kernelExport2 = state.clists.getKernelExport('inbound', sender, index);
  const machineInfo2 = state.clists.getMachine('inbound', 1);
  t.equal(kernelExport2, 1); // actual, expected
  t.equal(machineInfo2.machineName, sender);

  t.end();
});
