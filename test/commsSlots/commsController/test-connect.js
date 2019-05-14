import { test } from 'tape-promise/tape';
import handleCommsController from '../../../src/kernel/commsSlots/commsController';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleCommsController connect update channels', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const state = makeState();

  const otherMachineName = 'machine1';
  const verifyingKey = 'key1';
  const channelName = 'channel';
  const resolverID = 2;

  const result = handleCommsController(
    state,
    mockSyscall,
    'connect',
    JSON.stringify({
      args: [otherMachineName, verifyingKey, channelName],
    }),
    [],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  const UNDEFINED = JSON.stringify({ '@qclass': 'undefined' });

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToDataArgs, [resolverID, UNDEFINED, []]);

  t.end();
});
