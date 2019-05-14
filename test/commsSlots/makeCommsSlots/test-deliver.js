import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';
import makePromise from '../../../src/kernel/makePromise';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

const UNDEFINED = JSON.stringify({ '@qclass': 'undefined' });

test('makeCommsSlots deliver to commsController (facetid 0)', t => {
  const calls = [];

  const mockSyscall = {
    fulfillToData(...args) {
      calls.push(['fulfillToData', args]);
    },
    callNow(...args) {
      calls.push(['callNow', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  commsSlots.deliver(
    0,
    'init',
    '{"args":["bot","botSigningKey",{"@qclass":"slot","index":0}]}',
    [{ type: 'device', id: 4 }],
    30,
  );

  t.deepEqual(calls[0], [
    'callNow',
    [
      { type: 'device', id: 4 },
      'registerInboundCallback',
      '{"args":["bot",{"@qclass":"slot","index":0}]}',
      [{ type: 'export', id: 1 }],
    ],
  ]);
  calls.shift();

  t.deepEqual(calls[0], ['fulfillToData', [30, JSON.stringify('bot'), []]]);
  calls.shift();

  t.end();
});

test('makeCommsSlots deliver to egress', t => {
  const calls = [];

  const mockSyscall = {
    send(...args) {
      calls.push(['send', args]);
      if (args[1] === 'bar') {
        return 66; // TODO: issue #34 this ought to be {type: 'promise', id: 66}
      }
      return undefined;
    },
    fulfillToData(...args) {
      calls.push(['fulfillToData', args]);
    },
    callNow(...args) {
      calls.push(['callNow', args]);
    },
    subscribe(...args) {
      calls.push(['subscribe', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);
  const state = commsSlots.getState();

  const devNodeIndex = 42;
  // we need to get device:42 registered, but we don't otherwise test the
  // consequences of init(), because we tested that earlier in this file
  commsSlots.deliver(
    0,
    'init',
    '{"args":["user","userSigningKey",{"@qclass":"slot","index":0}]}',
    [{ type: 'device', id: devNodeIndex }],
    30,
  );
  t.equal(calls[0][0], 'callNow');
  calls.shift();
  t.deepEqual(calls[0], ['fulfillToData', [30, '"user"', []]]);
  calls.shift();

  // inboundHandlerFacetID is probably 1, since it's the first thing
  // allocated, but we aren't invoking deliver(init) (or capturing the
  // callNow(registerInboundCallback) args) to learn it more directly. Still make a
  // half-hearted effort to compare it against the state object, to improve
  // the debugging experience for someone in the future
  const inboundHandlerFacetID = JSON.parse(state.ids.dump()) - 1;
  t.equal(inboundHandlerFacetID, 1);

  commsSlots.deliver(
    0,
    'connect',
    '{"args":["bot","botVerifyingKey","channel"]}',
    [],
    31,
  );
  t.deepEqual(calls[0], ['fulfillToData', [31, UNDEFINED, []]]);
  calls.shift();

  // setup with an addEgress
  commsSlots.deliver(
    0,
    'addEgress',
    '{"args":["bot", 70, {"@qclass":"slot","index":0}]}',
    [{ type: 'import', id: 55 }],
    32,
  );
  t.deepEqual(calls, [['fulfillToData', [32, UNDEFINED, []]]]);
  calls.shift();

  const machineArgs = {
    target: { type: 'your-egress', id: 70 },
    methodName: 'bar',
    // args: JSON.stringify([{foo: 1}]),
    args: [{ foo: 1 }],
    slots: [],
    resultSlot: { type: 'your-resolver', id: 71 },
  };
  const a2 = JSON.stringify(machineArgs);
  const msgArgs = ['bot', a2];
  const inboundArgs = { args: msgArgs };
  commsSlots.deliver(
    inboundHandlerFacetID,
    'inbound',
    JSON.stringify(inboundArgs),
    [],
    undefined,
  );
  // that ought to cause a syscall.send to import:55
  t.deepEqual(calls[0], [
    'send',
    [
      { type: 'import', id: 55 },
      'bar',
      JSON.stringify({ args: [{ foo: 1 }] }),
      [],
    ],
  ]);
  calls.shift();
  t.deepEqual(calls[0], ['subscribe', [66]]);
  calls.shift();

  t.deepEqual(
    state.clists.mapKernelSlotToOutgoingWireMessage({
      type: 'promise',
      id: 66,
    }),
    { otherMachineName: 'bot', meToYouSlot: { type: 'your-promise', id: 71 } },
  );
  t.end();
});

test('makeCommsSlots deliver facetid is unexpected', t => {
  const calls = [];

  const mockSyscall = {
    fulfillToData(...args) {
      calls.push(['fulfillToData', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);

  t.throws(() => {
    commsSlots.deliver(99, 'init', '{"args":["bot","botSigningKey"]}', [], 30);
  }, "{[Error: unknown facetid] message: 'unknown facetid' }");
  t.equal(calls.length, 0);
  // TODO: init() really ought to notifyReject() upon error, not leave the
  // caller hanging
  t.end();
});

test('makeCommsSlots deliver to ingress', t => {
  const calls = [];

  const mockSyscall = {
    fulfillToPresence(...args) {
      calls.push(['fulfillToPresence', args]);
    },
    fulfillToData(...args) {
      calls.push(['fulfillToData', args]);
    },
    createPromise() {
      return makePromise();
    },
    callNow(...args) {
      calls.push(['callNow', args]);
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);

  const devNodeIndex = 42;
  // we need to get device:42 registered, but we don't otherwise test the
  // consequences of init(), because we tested that earlier in this file
  commsSlots.deliver(
    0,
    'init',
    '{"args":["user","userSigningKey",{"@qclass":"slot","index":0}]}',
    [{ type: 'device', id: devNodeIndex }],
    30,
  );
  t.equal(calls[0][0], 'callNow');
  calls.shift();
  t.deepEqual(calls[0], ['fulfillToData', [30, JSON.stringify('user'), []]]);
  calls.shift();

  commsSlots.deliver(
    0,
    'connect',
    '{"args":["bot","botVerifyingKey","channel"]}',
    [],
    31,
  );
  t.deepEqual(calls[0], ['fulfillToData', [31, UNDEFINED, []]]);
  calls.shift();

  // setup with an addIngress
  commsSlots.deliver(
    0,
    'addIngress',
    '{"args":["bot", {"@qclass":"slot","index":0}]}',
    [{ type: 'your-ingress', id: 0 }],
    32,
  );
  t.deepEqual(calls[0], ['fulfillToPresence', [32, { type: 'export', id: 2 }]]);
  calls.shift();

  commsSlots.deliver(2, 'encourageMe', '{"args":["me"]}', [], 33);
  t.equal(calls[0][0], 'callNow');
  const args = calls[0][1];
  calls.shift();
  t.equal(args.length, 4);
  t.deepEqual(args[0], { type: 'device', id: devNodeIndex });
  t.equal(args[1], 'sendOverChannel');
  t.deepEqual(JSON.parse(args[2]), {
    args: [
      'user',
      'bot',
      '{"target":{"type":"your-egress","id":{"@qclass":"slot","index":0}},"methodName":"encourageMe","args":["me"],"slots":[],"resultSlot":{"type":"your-resolver","id":3}}',
    ],
  });
  t.deepEqual(args[3], []);
  t.end();
});
