import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

test('makeCommsSlots deliver facetid is 0', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {});
  commsSlots.deliver(0, 'init', '{"args":["bot","botSigningKey"]}', [], 30); // init
  // confirm that init is called, we are already testing init in handleBootstrap
  t.deepEqual(fulfillToDataArgs, [30, JSON.stringify('bot'), []]);
  t.end();
});

test('makeCommsSlots deliver facetid is unexpected', t => {
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {});

  t.throws(() => {
    commsSlots.deliver(1, 'init', '{"args":["bot","botSigningKey"]}', [], 30);
  }, "{[Error: unknown facetid] message: 'unknown facetid' }");
  t.equal(fulfillToDataArgs, undefined);
  t.end();
});

test('makeCommsSlots deliver facetid is nonzero and expected', t => {
  let fulfillToTargetArgs;
  let fulfillToDataArgs;

  const mockSyscall = {
    fulfillToTarget(...args) {
      fulfillToTargetArgs = args;
    },
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
  };

  let sentData;
  function sendOverChannel(fromMachineName, toMachineName, data) {
    sentData = data;
  }
  function registerInboundCallback(_cb) {}

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {
    channel: {
      sendOverChannel,
      registerInboundCallback,
    },
  });

  commsSlots.deliver(
    0,
    'connect',
    '{"args":["bot","botVerifyingKey","channel"]}',
    [],
    31,
  );

  const state = commsSlots.getState();

  state.machineState.setMachineName('bot');
  state.channels.add('machine1', 'channel');

  // setup with an addImport
  commsSlots.deliver(0, 'addImport', '{"args":["bot",0]}', [], 32);
  t.deepEqual(fulfillToTargetArgs, [32, { type: 'export', id: 1 }]);

  commsSlots.deliver(1, 'encourageMe', '{"args":["user"]}', [], 33);
  t.deepEqual(fulfillToDataArgs, [31, '"undefined"', []]);

  t.equal(
    sentData,
    '{"index":0,"methodName":"encourageMe","args":["user"],"slots":[],"resultIndex":33}',
  );
  t.end();
});
