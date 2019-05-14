import { test } from 'tape-promise/tape';
import { makeCommsSlots } from '../../../src/kernel/commsSlots';
import makePromise from '../../../src/kernel/makePromise';

const helpers = {
  log: console.log,
  vatID: 'botcomms',
};

test('makeCommsSlots deliver to commsController (facetid 0)', t => {
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

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {});
  commsSlots.deliver(0, 'init', '{"args":["bot","botSigningKey",{"@qclass":"slot","index":0}]}', [{type: 'device', id: 4}], 30); // init
  // confirm that init is called, we are already testing init in handleCommsController
  t.deepEqual(fulfillToDataArgs, [30, JSON.stringify('bot'), []]);
  t.deepEqual(callNowArgs,
              [ { type: 'device', id: 4 }, 'registerHandler', '{"args":["bot",{"@qclass":"slot","index":0}]}', [ { '@qclass': 'export', index: 1 } ] ] );

  t.end();
});

test('makeCommsSlots deliver to egress', t => {
  let sendArgs;
  let fulfillToDataArgs;
  let callNowArgs;

  const mockSyscall = {
    send(...args) {
      sendArgs = args;
    },
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
    callNow(...args) {
      callNowArgs = args;
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers, {});
  const state = commsSlots.getState();

  const devNodeIndex = 42;
  // we need to get device:42 registered, but we don't otherwise test the
  // consequences of init(), because we tested that earlier in this file
  commsSlots.deliver(0, 'init', '{"args":["user","userSigningKey",{"@qclass":"slot","index":0}]}', [{type: 'device', id: devNodeIndex}], 30);

  // inboundHandlerFacetID is probably 1, since it's the first thing
  // allocated, but we aren't invoking deliver(init) (or capturing the
  // callNow(registerHandler) args) to learn it more directly. Still make a
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

  // setup with an addEgress
  commsSlots.deliver(
    0,
    'addEgress',
    '{"args":["bot", 70, {"@qclass":"slot","index":0}]}',
    [{ type: 'import', id: 55 }],
    32,
  );
  t.deepEqual(fulfillToDataArgs, [32, '"undefined"', []]);

  const machineArgs = { target: 55,
                        methodName: 'bar',
                        args: JSON.stringify([{foo: 1}]),
                        slots: [],
                        resultSlot: undefined,
                      };
  const a2 = JSON.stringify(machineArgs);
  const msgArgs = ['bot', a2];
  const inboundArgs = { args: msgArgs };
  commsSlots.deliver(inboundHandlerFacetID, 'inbound', JSON.stringify(inboundArgs), [], undefined);
  // that ought to cause a syscall.send to import:55

  t.deepEqual(sendArgs, [ { type: 'import', id: 55 }, 'bar',
                          JSON.stringify({ args: [{foo: 1}] }),
                          [], 43 ]);

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
    commsSlots.deliver(99, 'init', '{"args":["bot","botSigningKey"]}', [], 30);
  }, "{[Error: unknown facetid] message: 'unknown facetid' }");
  t.equal(fulfillToDataArgs, undefined);
  t.end();
});

test('makeCommsSlots deliver to ingress', t => {
  let fulfillToTargetArgs;
  let fulfillToDataArgs;
  let callNowArgs;

  const mockSyscall = {
    fulfillToTarget(...args) {
      fulfillToTargetArgs = args;
    },
    fulfillToData(...args) {
      fulfillToDataArgs = args;
    },
    createPromise() {
      return makePromise();
    },
    callNow(...args) {
      callNowArgs = args;
    },
  };

  const commsSlots = makeCommsSlots(mockSyscall, {}, helpers);

  const devNodeIndex = 42;
  // we need to get device:42 registered, but we don't otherwise test the
  // consequences of init(), because we tested that earlier in this file
  commsSlots.deliver(0, 'init', '{"args":["user","userSigningKey",{"@qclass":"slot","index":0}]}', [{type: 'device', id: devNodeIndex}], 30);

  commsSlots.deliver(
    0,
    'connect',
    '{"args":["bot","botVerifyingKey","channel"]}',
    [],
    31,
  );

  // setup with an addIngress
  commsSlots.deliver(
    0,
    'addIngress',
    '{"args":["bot", {"@qclass":"slot","index":0}]}',
    [{ type: 'your-ingress', id: 0 }],
    32,
  );
  t.deepEqual(fulfillToTargetArgs, [32, { type: 'export', id: 2 }]);

  commsSlots.deliver(2, 'encourageMe', '{"args":["me"]}', [], 33);
  t.deepEqual(fulfillToDataArgs, [31, '"undefined"', []]);

  console.log(callNowArgs);
  t.equal(callNowArgs.length, 4);
  t.deepEqual(callNowArgs[0], {'type': 'device', id: devNodeIndex });
  t.equal(callNowArgs[1], 'sendOverChannel');
  t.deepEqual(JSON.parse(callNowArgs[2]),
              { args: [ 'user', 'bot', '{"target":{"type":"your-egress","id":{"@qclass":"slot","index":0}},"methodName":"encourageMe","args":["me"],"slots":[],"resultSlot":{"type":"your-resolver","id":3}}' ] }
             );
  t.deepEqual(callNowArgs[3], []);
  t.end();
});
