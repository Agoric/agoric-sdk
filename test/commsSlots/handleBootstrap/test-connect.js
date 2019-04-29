import { test } from 'tape-promise/tape';
import handleBootstrap from '../../../src/kernel/commsSlots/handleBootstrap';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleBootstrap connect update channels', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const state = makeState();

  const otherMachineName = 'machine1';
  const verifyingKey = 'key1';
  const deviceName = 'channel';
  const resolverID = 2;

  const result = handleBootstrap(
    state,
    mockSyscall,
    'connect',
    JSON.stringify({
      args: [otherMachineName, verifyingKey, deviceName],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToDataArgs, [resolverID, JSON.stringify('undefined'), []]);

  // ensure state updated correctly
  const channel = state.channels.getChannelDevice(otherMachineName);
  t.equal(channel, deviceName);
  t.end();
});
