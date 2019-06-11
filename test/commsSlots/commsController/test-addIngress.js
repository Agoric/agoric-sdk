import { test } from 'tape-promise/tape';
import handleCommsController from '../../../src/kernel/commsSlots/commsController';
import makeState from '../../../src/kernel/commsSlots/state';

const helpers = {
  log: console.log,
};

test('handleCommsController addIngress', t => {
  let fulfillToPresenceArgs;

  const mockSyscall = {
    fulfillToPresence(...args) {
      fulfillToPresenceArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const index = 8;

  const result = handleCommsController(
    state,
    mockSyscall,
    'addIngress',
    JSON.stringify({
      args: [sender, index],
    }),
    [{ type: 'your-ingress', id: index }],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToPresenceArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const expectedYouToMeSlot = {
    type: 'your-ingress',
    id: index,
  };
  const expectedMeToYouSlot = state.clists.changePerspective(
    expectedYouToMeSlot,
  );
  const kernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
    sender,
    expectedYouToMeSlot,
  );
  const {
    meToYouSlot: actualMeToYouSlot,
  } = state.clists.mapKernelSlotToOutgoingWireMessage(
    {
      type: 'export',
      id: 1,
    },
    sender,
  );
  t.deepEqual(kernelToMeSlot, { type: 'export', id: 1 }); // actual, expected
  t.deepEqual(actualMeToYouSlot, expectedMeToYouSlot);
  t.end();
});

test('handleCommsController addIngress twice', t => {
  let fulfillToPresenceArgs;

  const mockSyscall = {
    fulfillToPresence(...args) {
      fulfillToPresenceArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const sender2 = 'user';
  const index = 8;
  const index2 = 9;

  const result = handleCommsController(
    state,
    mockSyscall,
    'addIngress',
    JSON.stringify({
      args: [sender, index],
    }),
    [{ type: 'your-ingress', id: index }],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToPresenceArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const actualKernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
    sender,
    { type: 'your-ingress', id: index },
  );
  const {
    meToYouSlot: actualMeToYouSlot,
  } = state.clists.mapKernelSlotToOutgoingWireMessage(
    {
      type: 'export',
      id: 1,
    },
    sender,
  );
  t.deepEqual(actualKernelToMeSlot, { type: 'export', id: 1 }); // actual, expected
  t.deepEqual(actualMeToYouSlot, { type: 'your-egress', id: index });

  const result2 = handleCommsController(
    state,
    mockSyscall,
    'addIngress',
    JSON.stringify({
      args: [sender2, index2],
    }),
    [{ type: 'your-ingress', id: index2 }],
    resolverID,
    helpers,
  );

  t.equal(result2, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToPresenceArgs, [
    resolverID,
    {
      type: 'export',
      id: 2,
    },
  ]);

  // ensure state updated correctly
  const actualKernelToMeSlot2 = state.clists.mapIncomingWireMessageToKernelSlot(
    sender2,
    { type: 'your-ingress', id: index2 },
  );
  const {
    meToYouSlot: actualMeToYouSlot2,
  } = state.clists.mapKernelSlotToOutgoingWireMessage(
    {
      type: 'export',
      id: 2,
    },
    sender2,
  );
  t.deepEqual(actualKernelToMeSlot2, { type: 'export', id: 2 }); // actual, expected
  t.deepEqual(actualMeToYouSlot2, { type: 'your-egress', id: index2 });
  t.end();
});

test('handleCommsController addIngress same again', t => {
  let fulfillToPresenceArgs;

  const mockSyscall = {
    fulfillToPresence(...args) {
      fulfillToPresenceArgs = args;
    },
  };

  const state = makeState();

  const resolverID = 2;
  const sender = 'bot';
  const index = 5;

  const result = handleCommsController(
    state,
    mockSyscall,
    'addIngress',
    JSON.stringify({
      args: [sender, index],
    }),
    [{ type: 'your-ingress', id: index }],
    resolverID,
    helpers,
  );

  t.equal(result, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToPresenceArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const actualKernelToMeSlot = state.clists.mapIncomingWireMessageToKernelSlot(
    sender,
    { type: 'your-ingress', id: index },
  );
  const {
    meToYouSlot: actualMeToYouSlot,
  } = state.clists.mapKernelSlotToOutgoingWireMessage(
    {
      type: 'export',
      id: 1,
    },
    sender,
  );
  t.deepEqual(actualKernelToMeSlot, { type: 'export', id: 1 }); // actual, expected
  t.deepEqual(actualMeToYouSlot, { type: 'your-egress', id: index });

  const result2 = handleCommsController(
    state,
    mockSyscall,
    'addIngress',
    JSON.stringify({
      args: [sender, index],
    }),
    [{ type: 'your-ingress', id: index }],
    resolverID,
    helpers,
  );

  t.equal(result2, undefined);

  // ensure calls to syscall are correct
  t.deepEqual(fulfillToPresenceArgs, [
    resolverID,
    {
      type: 'export',
      id: 1, // first import is 1
    },
  ]);

  // ensure state updated correctly
  const actualKernelToMeSlot2 = state.clists.mapIncomingWireMessageToKernelSlot(
    sender,
    { type: 'your-ingress', id: index },
  );
  const {
    meToYouSlot: actualMeToYouSlot2,
  } = state.clists.mapKernelSlotToOutgoingWireMessage(
    {
      type: 'export',
      id: 1,
    },
    sender,
  );
  t.deepEqual(actualKernelToMeSlot2, { type: 'export', id: 1 }); // actual, expected
  t.deepEqual(actualMeToYouSlot2, { type: 'your-egress', id: index });

  t.end();
});
