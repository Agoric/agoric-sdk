// import { test } from 'tape-promise/tape';
// import { makeSendIn } from '../../src/kernel/commsSlots/makeSendIn';
// import makeState from '../../src/kernel/commsSlots/state';

// // send [ { type: 'your-egress', id: 10 }, 'getIssuer', '{"args":[]}', [] ]
// // subscribe 20
// test('SendIn Cosmos-SwingSet 0', t => {
//   let sentArgs;
//   let subscribeArgs;

//   const senderID = 'abc';
//   const promiseID = 72;

//   const mockSyscall = {
//     send(...args) {
//       sentArgs = args;
//       return promiseID;
//     },
//     subscribe(...args) {
//       subscribeArgs = args;
//     },
//   };

//   const state = makeState();

//   state.clists.add(
//     senderID,
//     'egress',
//     { type: 'export', id: 0 },
//     { type: 'your-egress', id: 10 },
//     { type: 'your-ingress', id: 10 },
//   );

//   const { sendIn } = makeSendIn(state, mockSyscall);
//   sendIn(
//     senderID,
//     JSON.stringify({
//       target: { type: 'your-egress', id: 10 },
//       methodName: 'getIssuer',
//       args: [],
//       slots: [],
//       resultIndex: 1,
//     }),
//   );
//   // ensure calls to syscall are correct
//   t.deepEqual(sentArgs, [
//     { type: 'your-egress', id: 10 },
//     'getIssuer',
//     '{"args":[]}',
//     [],
//   ]);
//   t.deepEqual(subscribeArgs, [promiseID]);

//   // ensure state updated correctly
//   const storedPromise = state.clists.mapIncomingWireMessageToKernelSlot(
//     senderID,
//     'egress',
//     { type: 'egress', id: 1 },
//   );
//   t.deepEqual(storedPromise, {
//     type: 'promise',
//     id: promiseID,
//   });
//   const storedSubscribers = state.subscribers.get(promiseID);
//   t.deepEqual(storedSubscribers, [senderID]);
//   t.end();
// });

// // send [ {type: "promise", id: 20}, 'makeEmptyPurse', {"args":["purse2"]}, [] ]
// // subscribe 21
// test('SendIn Cosmos-SwingSet 1', t => {
//   let sentArgs;
//   let subscribeArgs;

//   const senderID = 'abc';
//   const promiseID = 72;

//   const mockSyscall = {
//     send(...args) {
//       sentArgs = args;
//       return promiseID;
//     },
//     subscribe(...args) {
//       subscribeArgs = args;
//     },
//   };

//   const state = makeState();

//   state.clists.add(senderID, 'egress', 0, { type: 'your-egress', id: 10 });
//   state.clists.add(senderID, 'egress', 1, { type: 'promise', id: 20 });
//   const { sendIn } = makeSendIn(state, mockSyscall);
//   sendIn(
//     senderID,
//     JSON.stringify({
//       index: 1,
//       methodName: 'makeEmptyPurse',
//       args: ['purse2'],
//       slots: [],
//       resultIndex: 2,
//     }),
//   );

//   // ensure calls to syscall are correct
//   t.deepEqual(sentArgs, [
//     { type: 'promise', id: 20 },
//     'makeEmptyPurse',
//     '{"args":["purse2"]}',
//     [],
//   ]);
//   t.deepEqual(subscribeArgs, [promiseID]);

//   // ensure state updated correctly
//   const storedPromise = state.clists.mapIncomingWireMessageToKernelSlot(
//     senderID,
//     'egress',
//     { type: 'ingress', id: 2 },
//   );
//   t.deepEqual(storedPromise, {
//     type: 'promise',
//     id: promiseID,
//   });
//   const storedSubscribers = state.subscribers.get(promiseID);
//   t.deepEqual(storedSubscribers, [senderID]);
//   t.end();
// });

// // send [ {type: "promise", id: 21}, 'deposit', {"args":[20,{"@qclass":"slot","id":0}]}, [{type: "your-egress", id: 10}] ]
// // subscribe 22
// test('SendIn Cosmos-SwingSet 2', t => {
//   let sentArgs;
//   let subscribeArgs;

//   const senderID = 'abc';
//   const promiseID = 72;

//   const mockSyscall = {
//     send(...args) {
//       sentArgs = args;
//       return promiseID;
//     },
//     subscribe(...args) {
//       subscribeArgs = args;
//     },
//   };

//   const state = makeState();

//   state.clists.add(senderID, 'egress', 0, { type: 'your-egress', id: 10 });
//   state.clists.add(senderID, 'egress', 1, { type: 'promise', id: 20 });
//   state.clists.add(senderID, 'egress', 2, { type: 'promise', id: 21 });
//   const { sendIn } = makeSendIn(state, mockSyscall);
//   sendIn(
//     senderID,
//     JSON.stringify({
//       index: 2,
//       methodName: 'deposit',
//       args: [20, { '@qclass': 'slot', index: 0 }],
//       slots: [{ type: 'your-egress', id: 0 }],
//       resultIndex: 3,
//     }),
//   );

//   // ensure calls to syscall correct
//   t.deepEqual(sentArgs, [
//     { type: 'promise', id: 21 },
//     'deposit',
//     '{"args":[20,{"@qclass":"slot","index":0}]}',
//     [{ type: 'your-egress', id: 10 }],
//   ]);
//   t.deepEqual(subscribeArgs, [promiseID]);

//   // ensure state changes correct
//   const storedPromise = state.clists.mapIncomingWireMessageToKernelSlot(
//     senderID,
//     'egress',
//     { type: 'egress', id: 3 },
//   );
//   t.deepEqual(storedPromise, {
//     type: 'promise',
//     id: promiseID,
//   });
//   const storedSubscribers = state.subscribers.get(promiseID);
//   t.deepEqual(storedSubscribers, [senderID]);
//   t.end();
// });

// // send [ {type: "promise", id: 21}, getBalance {"args":[]}, [] ]
// // subscribe 23
// test('SendIn Cosmos-SwingSet 3', t => {
//   let sentArgs;
//   let subscribeArgs;

//   const senderID = 'abc';
//   const promiseID = 72;

//   const mockSyscall = {
//     send(...args) {
//       sentArgs = args;
//       return promiseID;
//     },
//     subscribe(...args) {
//       subscribeArgs = args;
//     },
//   };

//   const state = makeState();

//   state.clists.add(senderID, 'egress', 0, { type: 'your-egress', id: 10 });
//   state.clists.add(senderID, 'egress', 1, { type: 'promise', id: 20 });
//   state.clists.add(senderID, 'egress', 2, { type: 'promise', id: 21 });
//   const { sendIn } = makeSendIn(state, mockSyscall);
//   sendIn(
//     senderID,
//     JSON.stringify({
//       index: 2,
//       methodName: 'getBalance',
//       args: [],
//       slots: [],
//       resultIndex: 4,
//     }),
//   );
//   // ensure syscall calls correct
//   t.deepEqual(sentArgs, [
//     { type: 'promise', id: 21 },
//     'getBalance',
//     '{"args":[]}',
//     [],
//   ]);
//   t.deepEqual(subscribeArgs, [promiseID]);

//   // ensure state changes correct
//   const storedPromise = state.clists.mapIncomingWireMessageToKernelSlot(
//     senderID,
//     'egress',
//     { type: 'egress', id: 4 },
//   );
//   t.deepEqual(storedPromise, {
//     type: 'promise',
//     id: promiseID,
//   });
//   const storedSubscribers = state.subscribers.get(promiseID);
//   t.deepEqual(storedSubscribers, [senderID]);
//   t.end();
// });

// // send [ {type: "your-egress", id: 10}, getBalance {"args":[]}', [] ]
// // subscribe 24
// test('SendIn Cosmos-SwingSet 4', t => {
//   let sentArgs;
//   let subscribeArgs;

//   const senderID = 'abc';
//   const promiseID = 72;

//   const mockSyscall = {
//     send(...args) {
//       sentArgs = args;
//       return promiseID;
//     },
//     subscribe(...args) {
//       subscribeArgs = args;
//     },
//   };

//   const state = makeState();

//   state.clists.add(senderID, 'egress', 0, { type: 'your-egress', id: 10 });
//   state.clists.add(senderID, 'egress', 1, { type: 'promise', id: 20 });
//   state.clists.add(senderID, 'egress', 2, { type: 'promise', id: 21 });
//   const { sendIn } = makeSendIn(state, mockSyscall);
//   sendIn(
//     senderID,
//     JSON.stringify({
//       index: 0,
//       methodName: 'getBalance',
//       args: [],
//       slots: [],
//       resultIndex: 5,
//     }),
//   );
//   // ensure syscall calls correct
//   t.deepEqual(sentArgs, [
//     { type: 'your-egress', id: 10 },
//     'getBalance',
//     '{"args":[]}',
//     [],
//   ]);
//   t.deepEqual(subscribeArgs, [promiseID]);

//   // ensure state changes correct
//   const storedPromise = state.clists.mapIncomingWireMessageToKernelSlot(
//     senderID,
//     'egress',
//     { type: 'egress', id: 5 },
//   );
//   t.deepEqual(storedPromise, {
//     type: 'promise',
//     id: promiseID,
//   });
//   const storedSubscribers = state.subscribers.get(promiseID);
//   t.deepEqual(storedSubscribers, [senderID]);
//   t.end();
// });
