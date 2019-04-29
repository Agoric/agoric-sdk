import { test } from 'tape-promise/tape';
import handleBootstrap from '../../../src/kernel/commsSlots/handleBootstrap';
import makeState from '../../../src/kernel/commsSlots/state';

test('handleBootstrap addExport', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'user';
  const index = 0;
  const valslot = { '@qclass': 'slot', index: 0 };
  const caps = [{ type: 'import', id: 10 }];
  const helpers = {
    log: console.log,
  };

  const result = handleBootstrap(
    state,
    mockSyscall,
    'addExport',
    JSON.stringify({
      args: [sender, index, valslot],
    }),
    caps,
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToDataArgs, [resolverID, JSON.stringify('undefined'), []]);

  // ensure state updated correctly
  const kernelExport = state.clists.getKernelExport('outbound', sender, index);
  const machineInfo = state.clists.getMachine('outbound', caps[index]);
  t.deepEqual(kernelExport, caps[index]); // actual, expected
  t.equal(machineInfo.machineName, sender);
  t.end();
});
