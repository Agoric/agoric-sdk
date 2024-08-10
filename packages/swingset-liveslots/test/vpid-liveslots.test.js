// @ts-nocheck
import test from 'ava';

import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { buildSyscall, makeDispatch } from './liveslots-helpers.js';
import { makeMessage, makeResolve, makeReject } from './util.js';

function hush(p) {
  p.then(
    () => undefined,
    () => undefined,
  );
}

// The next batch of tests exercises how liveslots handles promise
// identifiers ("vpid" strings) across various forms of resolution. Our
// current code retires vpids after resolution.

// legend:
//  C: vat creates promise
//  S: vat sends promise as argument
//  T: vat includes promise as result= of outbound message
//  R: vat receives promise as result= of inbound message
//  G: vat gets promise as argument
//  M: vat sends message to the promise
//  RES: vat resolves promise
//  NOT: vat receives notification of external resolution

// We start by examining cases where the vat resolves the promise (RES) and
// then uses the promise a second time, as a way to probe the liveslots
// tables and see whether they retire the vpid or not. To resolve the
// promise, the vat must be the decider, which means it must have either
// created the promise originally (and sent it as an argument), or received
// it as the result= of an inbound message. To use it a second time, it must
// either create the promise or receive it as an argument. We use the
// following sequences to try and cover lots of cases:
//
// 0: C        RES S S // TODO
// 1: C    S   RES S
// 2: R G  S M RES S M: p1=bob~.one(); bob~.two(p1)
// 3: G R  S M RES S M (liveslots can respond to this, but could not produce it)

// Then we look at cases where the kernel resolves the promise (NOT), after
// which the vat sends the promise a second time. For the kernel to be the
// decider, the promise must have arrived from the kernel, or the vat must
// have sent it as the result= of an outbound message. To use it a second
// time, the vat must have either received the promise as an argument, or
// created the promise and sent it as an argument. We use the following
// sequences:
//
// 4: G     S M NOT S M: bar~.foo(p1); p1~.foo()
// 5: CT    S M NOT S M: p1=remote~.get(); bar~.foo(p1); p1~.foo()
// 6: CT G  S M NOT S M: (liveslots can respond to this but not produce it)
// HOWEVER: we cannot actually do 5 or 6 because of the way HandledPromises
// protect against reentrant handlers. For details see
// https://github.com/Agoric/agoric-sdk/issues/886

// 7: G S M R S M RES S M (first M is pipelined to P, second is queued to
//                         internal result promise, third is sent to
//                         resolution. Third S must allocate new VPID)

// In addition, we want to exercise the promises being resolved in various
// ways:
const modes = [
  'presence', // resolveToPresence, messages can be sent to resolution
  'local-object', // resolve to a local object, messages can be sent but do
  //              // not create syscalls
  'data', // resolveToData, messages are rejected as DataIsNotCallable
  'promise-data', // resolveToData that contains a promise ID
  'reject', // reject, messages are rejected
  'promise-reject', // reject to data that contains a promise ID
];

function resolvePR(pr, mode, targets) {
  switch (mode) {
    case 'presence':
      pr.resolve(targets.target2);
      break;
    case 'local-object':
      pr.resolve(
        Far('local-object', {
          two() {
            /* console.log(`local two() called`); */
          },
          four() {
            /* console.log(`local four() called`); */
          },
        }),
      );
      break;
    case 'data':
      pr.resolve(4);
      break;
    case 'promise-data':
      pr.resolve([targets.p1]);
      break;
    case 'reject':
      pr.reject('error');
      break;
    case 'promise-reject':
      pr.reject(targets.p1);
      break;
    default:
      Fail`unknown mode ${mode}`;
  }
}

function presence(ref) {
  return kslot(ref, `presence ${ref}`);
}

function resolutionOf(vpid, mode, targets) {
  const resolution = {
    type: 'resolve',
    resolutions: [[vpid, false]],
  };
  switch (mode) {
    case 'presence': {
      resolution.resolutions[0][2] = kser(presence(targets.target2));
      break;
    }
    case 'local-object':
      resolution.resolutions[0][2] = kser(
        kslot(targets.localTarget, 'local-object'),
      );
      break;
    case 'data':
      resolution.resolutions[0][2] = kser(4);
      break;
    case 'promise-data':
      resolution.resolutions[0][2] = kser([kslot(targets.p1)]);
      break;
    case 'reject':
      resolution.resolutions[0][1] = true;
      resolution.resolutions[0][2] = kser('error');
      break;
    case 'promise-reject':
      resolution.resolutions[0][1] = true;
      resolution.resolutions[0][2] = kser(kslot(targets.p1));
      break;
    default:
      Fail`unknown mode ${mode}`;
  }
  return resolution;
}

function matchIDCounterSet(t, log) {
  t.like(log.shift(), { type: 'vatstoreSet', key: 'idCounters' });
}

async function doVatResolveCase1(t, mode) {
  // case 1
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    const pr = makePromiseKit();
    return Far('root', {
      async run(target1, target2) {
        const p1 = pr.promise;
        E(target1).one(p1);
        resolvePR(pr, mode, { target2, p1 });
        // TODO: this stall shouldn't be necessary, but if I omit it, the
        // resolution happens *after* two() is sent
        await Promise.resolve();
        E(target1).two(p1);
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const target1 = 'o-1';
  const target2 = 'o-2';
  const localTarget = 'o+10';
  const expectedP1 = 'p+5';
  const expectedP2 = 'p+6';
  const expectedP3 = 'p+7';
  const expectedP4 = 'p+8';

  await dispatch(
    makeMessage(rootA, 'run', [presence(target1), presence(target2)]),
  );

  // The vat should send 'one' and subscribe to the result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['one', [kslot(expectedP1)]]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  // next the vat should resolve the promise it created
  const targets = { target2, localTarget, p1: expectedP1 };
  t.deepEqual(log.shift(), resolutionOf(expectedP1, mode, targets));

  // then it should send 'two'.
  const expectedTwoArg = expectedP3;
  const expectedResultOfTwo = expectedP4;
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['two', [kslot(expectedTwoArg)]]),
    resultSlot: expectedResultOfTwo,
  });
  const targets2 = { target2, localTarget, p1: expectedP3 };
  t.deepEqual(log.shift(), resolutionOf(expectedTwoArg, mode, targets2));
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultOfTwo });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);
}

for (const mode of modes) {
  test(`liveslots vpid handling case1 ${mode}`, async t => {
    await doVatResolveCase1(t, mode);
  });
}

// This exercises cases 2 and 3, which are unusual in that this vat is
// given a reference to a promise that it controls. The
// decision-making authority is exercised when the vat resolves the
// Promise that was returned from an inbound `result()`
// message. Liveslots always notifies the kernel about this act of
// resolution, but it does not subscribe to the promise, since the vat
// knows that itself will decide the resolution, not the kernel.

// Ordering guarantees: we don't intend to make any promises (haha) about the
// relative ordering of the syscall that resolves the promise, and the
// syscall.sends which convey messages that were queued up before or after
// the resolve. The syscall.sends need to appear in the same order they were
// sent, but the resolve is allowed to appear anywhere in the middle of (or
// even after) the sends. This test happens to assert a specific total
// ordering, but retaining this order is not the purpose of the test. (For
// determinism's sake, we might want to assert that it always uses the same
// otherwise-arbitrary order). If the total order changes, we should
// understand *why* it changed, and make sure the new order meets the
// guarantees that we *do* provide, and then update this test to match.

async function doVatResolveCase23(t, which, mode, stalls) {
  // case 2 and 3
  const { log, syscall } = buildSyscall();
  let resolutionOfP1;

  let stashP1;

  function build(_vatPowers) {
    let p1;
    const pr = makePromiseKit();
    const p0 = pr.promise;
    return Far('root', {
      promise(p) {
        p1 = p;
        stashP1 = p1;
        p1.then(
          x => {
            // console.log(`p1 resolved to`, x);
            resolutionOfP1 = x;
          },
          _ => {
            // console.log(`p1 rejected`);
            resolutionOfP1 = 'rejected';
          },
        );
      },
      result() {
        return p0;
      },
      async run(target1, target2) {
        // console.log(`calling one()`);
        const p2 = E(target1).one(p1);
        hush(p2);
        // console.log(`calling two()`);
        const p3 = E(p1).two();
        hush(p3);
        // The call to our result() method gave our vat access to p1 (along
        // with resolution authority), but it didn't give this user-level
        // code access to p1. When we resolve the p0 we returned from
        // `result`, liveslots will resolve p1 for us. But remember that p0
        // !== p1 . This resolution will eventually cause a
        // `syscall.resolve` call into the kernel, and
        // will eventually cause `p1` to be resolved to something, which may
        // affect both where previously-queued messages (two) wind up, and
        // where subsequently sent messages (four) wind up.

        resolvePR(pr, mode, { target2, p1 });

        // We've started the resolution process, but it cannot complete for
        // another few turns. We wait some number of turns before using p1
        // again, to exercise as many race conditions as possible.
        for (let i = 0; i < stalls; i += 1) {
          await Promise.resolve();
        }

        // If we don't stall here, then all four messages get
        // processed before we tell the kernel about the resolution
        // (syscall.resolve).

        // If we stall two or more turns, then the resolve goes to the
        // kernel before three() and four() are processed. We've
        // retired the VPID for p1 when three() goes to serialize it,
        // so a new VPID is created.

        // In all cases, two() and four() are queued on a local
        // Promise object, so they do not get pipelined into the
        // kernel. They are sent to directly to the resolved target
        // (or not sent at all, if p1 was rejected or resolved to
        // something else).

        // console.log(`calling three()`);
        const p4 = E(target1).three(p1);
        hush(p4);
        // console.log(`calling four()`);
        const p5 = E(p1).four();
        hush(p5);
        // console.log(`did all calls`);
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const target1 = 'o-1';
  const localTarget = 'o+10';
  const p1 = 'p-8';
  const expectedP2 = 'p+5';
  const expectedP3 = 'p+6';
  const expectedP4 = 'p+7';
  const expectedP5 = 'p+8';
  const expectedP6 = 'p+9';
  const target2 = 'o-2';

  // liveslots allocates a bunch of IDs during startVat, and flushes
  // them at the end of the first delivery. The second delivery
  // doesn't allocate any IDs, so no flush.

  if (which === 2) {
    await dispatch(makeMessage(rootA, 'result', [], p1));
    // the vat knows it is the decider, does not subscribe
    await dispatch(makeMessage(rootA, 'promise', [kslot(p1)]));
  } else if (which === 3) {
    await dispatch(makeMessage(rootA, 'promise', [kslot(p1)]));
    // the vat subscribes to p1, it cannot know the future
    t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
    await dispatch(makeMessage(rootA, 'result', [], p1));
    // vat cannot unsubscribe, but is now the decider
  } else {
    Fail`bad which=${which}`;
  }
  // console.log(`-- did mode=${which} result+promise log= ->`, JSON.stringify(log), '<-');

  t.deepEqual(log, []);

  await dispatch(
    makeMessage(rootA, 'run', [presence(target1), presence(target2)]),
  );

  // console.log(`-- did run(), log: ->`, log.map(JSON.stringify), '<-');

  // At the end of the turn in which run() is executed, the promise
  // queue will contain deliveries one() and two() (specifically
  // invocations of the handler on target1 and p1), plus the callbacks
  // triggered by the resolution of the promise p0 that was returned
  // by result().

  // If stalls=0, it will also have deliveries three() and four(). The crank
  // keeps running until the promise queue is empty, so it executes handlers
  // one(), two(), the thenResolve() for p0, then three() and four(). If any
  // of these handlers were to push something onto the promise queue, that
  // something would run after the four() handler runs.

  // If stalls=1, it executes the handlers for one(), two(), and the
  // thenResolve() for p0. Then it pushes a stall onto the queue, so if any
  // of those three were to push something onto the promise queue, it would
  // run *before* three() or four() were pushed.

  // It's conceivable that a handler might push something onto the end, which
  // when run pushes something *else* onto the end, etc. We use stalls=2 or
  // more to exercise these cases.

  // Here, we examine the full set of syscalls emitted by these handlers.

  // When the one() handler is run, the vat sends one() with promise p1 as an
  // argument.
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['one', [kslot(p1)]]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  // The two() handler queues 'two' to the original p1, which is the
  // promise deserialized in the args to promise(). In case=2 (vpid
  // first appears as a result, then is imported), p1 is the internal
  // HandledPromise that came back from applyMethod() for 'result'
  // (registered at the end of deliver()). That HP is forwarded to the
  // 'p0' returned by resuit(), so when the vat resolves p0, p1
  // becomes resolved on the next turn. Because p1 was created by
  // applyMethod(), it does not have any special handler, so two()
  // will be queued on the engine's Promise queue, and we won't see a
  // syscall until p0 resolves. Therefore we'll see a syscall.send()
  // for 'two()' aimed at the resolution object (or other target), not
  // pipelined to the promise.

  // In case=3 (vpid imported first, then appears as a result), the
  // vat has subscribed to the imported promise, then becomes the
  // decider. Here p1 was created by `convertSlotToVal`, and has a
  // handler which would pipeline a message to the kernel. But before
  // we give it any messages, result() causes the vat to become the
  // decider. In that case, deliver() forwards the original p1 to the
  // internal HandledPromise.applyMethod one, and does not register a
  // new promise. The subsequent two() is queued on the engine's
  // Promise queue, just like case=2, and we'll also see a
  // syscall.send() aimed at the resolution target, not pipelined.

  // the next series of vpids the vat will allocate
  const nextVPIDs = [expectedP3, expectedP4, expectedP5, expectedP6];

  if (mode === 'presence') {
    const twoResult = nextVPIDs.shift();
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2,
      methargs: kser(['two', []]),
      resultSlot: twoResult,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: twoResult });
  }

  // Now the callbacks attached to p0 are invoked. p0 was returned by
  // result() and is only seen by the HandledPromise.applyMethod
  // internals. The applyMethod return promise ('res') is forwarded to
  // p0, which seems to induce a turn delay before the callbacks on
  // 'res' are run.

  // In case=2, followForKernel() attached a callback to 'res', so
  // that callback will fire after the delay, which will perform the
  // syscall.resolve.

  // For case=3, the imported p1 was forwarded to res, and the
  // followForKernel() callback was attached to p1, so we'll see that
  // callback fire, and its syscall.resolve.

  // In one of these cases, an extra delay seems to happen.

  // So in case=2, if stalls<1, three()/four() are processed before
  // liveslots observes the resolution, but if stalls>=1, liveslots
  // sees the resolution first. In case=3, the threshold is stalls=2.

  let vpidRetired = false;
  if ((which === 2 && stalls >= 1) || (which === 3 && stalls >= 2)) {
    const targets = { target2, localTarget, p1 };
    t.deepEqual(log.shift(), resolutionOf(p1, mode, targets));
    vpidRetired = true; // expect newly-allocated VPID for p1
  }

  // three() references p1, but if the VPID was retired (it was not
  // held in virtual data, so did not need a stable vpid), we'll see a
  // new VPID and a syscall.resolve() immediately after the
  // syscall.send().
  const expectedVPIDInThree = vpidRetired ? nextVPIDs.shift() : p1;
  const expectedResultOfThree = nextVPIDs.shift();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['three', [kslot(expectedVPIDInThree)]]),
    resultSlot: expectedResultOfThree,
  });
  if (vpidRetired) {
    const targets2 = { target2, localTarget, p1: expectedVPIDInThree };
    t.deepEqual(log.shift(), resolutionOf(expectedVPIDInThree, mode, targets2));
  }
  t.deepEqual(log.shift(), {
    type: 'subscribe',
    target: expectedResultOfThree,
  });

  // four() is sent *to* the old promise, which means it's sent to the
  // resolution target. If that target is a Presence, we'll see a syscall,
  // otherwise the vat handles it internally.

  if (mode === 'presence') {
    const expectedResultOfFour = nextVPIDs.shift();
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2,
      methargs: kser(['four', []]),
      resultSlot: expectedResultOfFour,
    });
    t.deepEqual(log.shift(), {
      type: 'subscribe',
      target: expectedResultOfFour,
    });
  }

  // if it wasn't resolved earlier, it should get resolved now
  if (!vpidRetired) {
    const targets = { target2, localTarget, p1 };
    t.deepEqual(log.shift(), resolutionOf(p1, mode, targets));
  }

  // that's all the syscalls we should see
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // assert that the vat saw the local promise being resolved too
  if (mode === 'presence') {
    t.is(resolutionOfP1.toString(), `[object Alleged: presence ${target2}]`);
  } else if (mode === 'data') {
    t.is(resolutionOfP1, 4);
  } else if (mode === 'promise-data') {
    t.is(Array.isArray(resolutionOfP1), true);
    t.is(resolutionOfP1.length, 1);
    t.is(resolutionOfP1[0], Promise.resolve(resolutionOfP1[0]));
    t.is(resolutionOfP1[0], stashP1);
  } else if (mode === 'reject') {
    t.is(resolutionOfP1, 'rejected');
  }
}

// uncomment this when debugging specific problems
// test.only(`XX`, doVatResolveCase23, 2, 'presence', 0);

for (const caseNum of [2, 3]) {
  for (const mode of modes) {
    for (let stalls = 0; stalls < 4; stalls += 1) {
      test(
        `liveslots vpid handling case${caseNum} ${mode} stalls=${stalls}`,
        doVatResolveCase23,
        caseNum,
        mode,
        stalls,
      );
    }
  }
}

async function doVatResolveCase4(t, mode) {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    let p1;
    return Far('local-object', {
      async get(p) {
        p1 = p;
        // if we don't add this, node will complain when the kernel notifies
        // us of the rejection
        hush(p1);
      },
      async first(target1) {
        const p2 = E(target1).one(p1);
        hush(p2);
        const p3 = E(p1).two();
        hush(p3);
      },
      async second(target1) {
        const p4 = E(target1).three(p1);
        hush(p4);
        const p5 = E(p1).four();
        hush(p5);
      },
      // we re-use this root object as a resolution of p1 the 'local-object'
      // case, so make sure it can accept the messages
      two() {},
      four() {},
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const target1 = 'o-1';
  const p1 = 'p-8';
  let nextPnum = 5;
  function nextP() {
    const p = `p+${nextPnum}`;
    nextPnum += 1;
    return p;
  }
  const target2 = 'o-2';

  await dispatch(makeMessage(rootA, 'get', [kslot(p1)]));
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'first', [kslot(target1)]));

  const expectedP2 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['one', [kslot(p1)]]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  const expectedP3 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    methargs: kser(['two', []]),
    resultSlot: expectedP3,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP3 });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  let r;
  if (mode === 'presence') {
    r = makeResolve(p1, kser(presence(target2)));
  } else if (mode === 'local-object') {
    r = makeResolve(p1, kser(kslot(rootA)));
  } else if (mode === 'data') {
    r = makeResolve(p1, kser(4));
  } else if (mode === 'promise-data') {
    r = makeResolve(p1, kser([kslot(p1)]));
  } else if (mode === 'reject') {
    r = makeReject(p1, kser('error'));
  } else if (mode === 'promise-reject') {
    r = makeReject(p1, kser(kslot(p1)));
  } else {
    Fail`unknown mode ${mode}`;
  }
  await dispatch(r);
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'second', [kslot(target1)]));

  const expectedP4 = nextP();
  const expectedP5 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['three', [kslot(expectedP4)]]),
    resultSlot: expectedP5,
  });
  t.deepEqual(log.shift(), {
    type: 'subscribe',
    target: expectedP5,
  });

  if (mode === 'presence') {
    const expectedP6 = nextP();
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2, // this depends on #823 being fixed
      methargs: kser(['four', []]),
      resultSlot: expectedP6,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP6 });
  }

  const targets = { target2, localTarget: rootA, p1: expectedP4 };
  t.deepEqual(log.shift(), resolutionOf(expectedP4, mode, targets));

  // if p1 rejects or resolves to data, the kernel never hears about four()
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);
}

for (const mode of modes) {
  test(`liveslots vpid handling case4 ${mode}`, async t => {
    await doVatResolveCase4(t, mode);
  });
}

// TODO unimplemented
// cases 5 and 6 are not implemented due to #886

async function doVatResolveCase7(t, mode) {
  // 7: G S M R S M RES S M (first M is pipelined to P, second is queued to
  //                         internal result promise, third is sent to
  //                         resolution. Third S must allocate new VPID)

  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    let p1;
    const pr = makePromiseKit();
    return Far('root', {
      acceptPromise(p) {
        p1 = p;
      },
      send1(target1) {
        hush(E(target1).one(p1));
        hush(E(p1).two());
      },
      becomeDecider() {
        return pr.promise;
      },
      send2(target1) {
        hush(E(target1).three(p1));
        hush(E(p1).four());
      },
      resolve(target2) {
        resolvePR(pr, mode, { target2, p1 });
      },
      send3(target1) {
        hush(E(target1).five(p1));
        hush(E(p1).six());
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  let nextVPID = 5;
  function getNextVPID() {
    const vpid = `p+${nextVPID}`;
    nextVPID += 1;
    return vpid;
  }

  const rootA = 'o+0';
  const p1 = 'p-8';
  await dispatch(makeMessage(rootA, 'acceptPromise', [kslot(p1)]));
  // the vat subscribes to p1, it cannot know the future
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });

  const target1 = 'o-1';
  const target2 = 'o-2';
  await dispatch(
    makeMessage(rootA, 'send1', [presence(target1), presence(target2)]),
  );
  // we expect to see one(), referencing the unresolved promise

  const oneResultVPID = getNextVPID();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['one', [kslot(p1)]]),
    resultSlot: oneResultVPID,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: oneResultVPID });

  // two() is pipelined to kernel
  const twoResultVPID = getNextVPID();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    methargs: kser(['two', []]),
    resultSlot: twoResultVPID,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: twoResultVPID });

  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // now use p1 as the result= of a message, transferring decider
  // authority to the vat
  await dispatch(makeMessage(rootA, 'becomeDecider', [], p1));
  t.deepEqual(log, []);

  // have the vat send some more messages
  await dispatch(
    makeMessage(rootA, 'send2', [presence(target1), presence(target2)]),
  );
  // we expect to see three(), referencing the unresolved promise

  const threeResultVPID = getNextVPID();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['three', [kslot(p1)]]),
    resultSlot: threeResultVPID,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: threeResultVPID });
  // four() is queued internally, so no more syscalls
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // now tell the vat to resolve the promise
  await dispatch(makeMessage(rootA, 'resolve', [presence(target2)]));

  // that might release four()
  if (mode === 'presence') {
    const fourResultVPID = getNextVPID();
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2,
      methargs: kser(['four', []]),
      resultSlot: fourResultVPID,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: fourResultVPID });
  }

  // followed by the actual resolution

  const localTarget = 'o+10';
  const targets = { target2, localTarget, p1 };
  t.deepEqual(log.shift(), resolutionOf(p1, mode, targets));

  if (mode === 'presence' || mode === 'local-object') {
    // sending two()/four() will allocate new result promise VPIDs,
    // and exporting 'localTarget' will allocate a new objectID, so
    // expect a counter write
    matchIDCounterSet(t, log);
  }
  t.deepEqual(log, []);

  // now send another batch of messages, after the VPID is retired
  await dispatch(
    makeMessage(rootA, 'send3', [presence(target1), presence(target2)]),
  );

  // five() will get a new VPID
  const newP1VPID = getNextVPID();
  const fiveResultVPID = getNextVPID();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['five', [kslot(newP1VPID)]]),
    resultSlot: fiveResultVPID,
  });
  const targets2 = { target2, localTarget, p1: newP1VPID };
  t.deepEqual(log.shift(), resolutionOf(newP1VPID, mode, targets2));
  t.deepEqual(log.shift(), { type: 'subscribe', target: fiveResultVPID });

  if (mode === 'presence') {
    const sixResultVPID = getNextVPID();
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2,
      methargs: kser(['six', []]),
      resultSlot: sixResultVPID,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: sixResultVPID });
  }

  matchIDCounterSet(t, log);
  t.deepEqual(log, []);
}

for (const mode of modes) {
  test(`liveslots vpid handling case7 ${mode}`, doVatResolveCase7, mode);
}

function makePR() {
  let r;
  const p = new Promise((resolve, _reject) => {
    r = resolve;
  });
  return [p, r];
}

test('inter-vat circular promise references', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    let p;
    let r;
    return Far('root', {
      genPromise() {
        void ([p, r] = makePR());
        return p;
      },
      usePromise(pa) {
        r(pa);
      },
    });
  }
  const { dispatch: dispatchA } = await makeDispatch(syscall, build, 'vatA');
  // const { dispatch: dispatchB } = await makeDispatch(syscall, build, 'vatB');
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  // const rootB = 'o+0';
  const paA = 'p-8';
  const pbA = 'p-9';
  // const pbB = 'p-18';
  // const paB = 'p-19';

  await dispatchA(makeMessage(rootA, 'genPromise', [], paA));
  t.deepEqual(log, []);

  // await dispatchB(makeMessage(rootB, 'genPromise', [], pbB));
  // t.deepEqual(log, []);

  await dispatchA(makeMessage(rootA, 'usePromise', [[kslot(pbA)]]));
  t.deepEqual(log.shift(), { type: 'subscribe', target: pbA });
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[paA, false, kser([kslot(pbA)])]],
  });
  t.deepEqual(log, []);

  // await dispatchB(makeMessage(rootB, 'usePromise', [kslot(paB)]));
  // t.deepEqual(log.shift(), { type: 'subscribe', target: paB });
  // t.deepEqual(log.shift(), {
  //   type: 'resolve',
  //   resolutions: [[pbB, false, kser(kslot(paB))]],
  // });
  // t.deepEqual(log, []);
});

test('accept previously allocated promise', async t => {
  function build(vatPowers, vatParameters) {
    const { target } = vatParameters;
    return Far('root', {
      call() {
        const promise = E(target).foo();
        // wrap to avoid adoption
        return { promise };
      },
      async waitFor(promise2) {
        // if we're in the same incarnation as the `E(target).foo()`, this
        // `promise2` will be the same JS Promise as the `promise` above
        const v = await promise2;
        return v;
      },
    });
  }

  let log;
  let syscall;
  let dispatch;

  const kvStore = new Map();
  ({ log, syscall } = buildSyscall({ kvStore }));

  const target = 'o-1';
  ({ dispatch } = await makeDispatch(
    syscall,
    build,
    'reimport-promise',
    {},
    { target: kslot(target) },
  ));
  log.length = 0; // assume pre-build vatstore operations are correct

  const root = 'o+0';
  const callResultP = 'p-1';
  const waitForResultP = 'p-2';
  const expectedP1 = 'p+5';

  await dispatch(makeMessage(root, 'call', [], callResultP));

  // The vat should send 'foo', subscribe to the result promise, and resolve with that promise
  t.deepEqual(log.splice(0, 3), [
    {
      type: 'send',
      targetSlot: target,
      methargs: kser(['foo', []]),
      resultSlot: expectedP1,
    },
    { type: 'subscribe', target: expectedP1 },
    {
      type: 'resolve',
      resolutions: [[callResultP, false, kser({ promise: kslot(expectedP1) })]],
    },
  ]);
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // snapshot the store at this point
  const clonedStore = new Map(kvStore);

  const verifyPromiseReImport = async shouldSubscribe => {
    await dispatch(
      makeMessage(root, 'waitFor', [kslot(expectedP1)], waitForResultP),
    );

    // The vat will only subscribe if it was upgraded; if the vat still
    // remembers it, receiving the vref will merely look it up in slotToVal and
    // not create a new Promise (and trigger a subscribe)
    if (shouldSubscribe) {
      t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP1 });
    }

    // waitFor will suspend until promise is resolved
    t.deepEqual(log, []);

    // Resolution propagates the value to the waitFor result
    await dispatch(makeResolve(expectedP1, kser('success')));
    t.deepEqual(log.shift(), {
      type: 'resolve',
      resolutions: [[waitForResultP, false, kser('success')]],
    });
    t.deepEqual(log, []);
  };

  await verifyPromiseReImport(false);
  ({ log, syscall } = buildSyscall({ kvStore: clonedStore }));
  ({ dispatch } = await makeDispatch(
    syscall,
    build,
    'reimport-promise-v2',
    {},
    {},
  ));
  log.length = 0;

  // verify this works the same in the restarted vat
  await verifyPromiseReImport(true);
});
