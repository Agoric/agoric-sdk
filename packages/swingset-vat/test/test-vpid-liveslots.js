// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { buildSyscall, makeDispatch } from './liveslots-helpers.js';
import { makeMessage, makeResolve, makeReject, capargs } from './util.js';

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
      pr.reject([targets.p1]);
      break;
    default:
      assert.fail(X`unknown mode ${mode}`);
  }
}

function slotArg(iface, index) {
  return { '@qclass': 'slot', iface, index };
}
const slot0arg = { '@qclass': 'slot', index: 0 };
const slot1arg = { '@qclass': 'slot', index: 1 };

function resolutionOf(vpid, mode, targets) {
  const resolution = {
    type: 'resolve',
    resolutions: [[vpid, false]],
  };
  switch (mode) {
    case 'presence': {
      const presenceBody = {
        '@qclass': 'slot',
        iface: `Alleged: presence ${targets.target2}`,
        index: 0,
      };
      resolution.resolutions[0][2] = capargs(presenceBody, [targets.target2]);
      break;
    }
    case 'local-object':
      resolution.resolutions[0][2] = capargs(
        slotArg('Alleged: local-object', 0),
        [targets.localTarget],
      );
      break;
    case 'data':
      resolution.resolutions[0][2] = capargs(4, []);
      break;
    case 'promise-data':
      resolution.resolutions[0][2] = capargs([slot0arg], [targets.p1]);
      break;
    case 'reject':
      resolution.resolutions[0][1] = true;
      resolution.resolutions[0][2] = capargs('error', []);
      break;
    case 'promise-reject':
      resolution.resolutions[0][1] = true;
      resolution.resolutions[0][2] = capargs([slot0arg], [targets.p1]);
      break;
    default:
      assert.fail(X`unknown mode ${mode}`);
  }
  return resolution;
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
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);

  const rootA = 'o+0';
  const target1 = 'o-1';
  const target2 = 'o-2';
  const localTarget = 'o+1';
  const expectedP1 = 'p+5';
  const expectedP2 = 'p+6';
  const expectedP3 = 'p+7';
  const expectedP4 = 'p+8';

  await dispatch(
    makeMessage(
      rootA,
      'run',
      capargs([slot0arg, slot1arg], [target1, target2]),
    ),
  );

  // The vat should send 'one' and subscribe to the result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'one',
    args: capargs([slot0arg], [expectedP1]),
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
    method: 'two',
    args: capargs([slot0arg], [expectedTwoArg]),
    resultSlot: expectedResultOfTwo,
  });
  const targets2 = { target2, localTarget, p1: expectedP3 };
  t.deepEqual(log.shift(), resolutionOf(expectedTwoArg, mode, targets2));
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultOfTwo });
  t.deepEqual(log, []);
}

for (const mode of modes) {
  test(`liveslots vpid handling case1 ${mode}`, async t => {
    await doVatResolveCase1(t, mode);
  });
}

// This exercises cases 2 and 3, which are unusual in that this vat is both a
// subscriber and the decider for the same promise. The decision-making
// authority is exercised when the vat resolves the Promise that was returned
// from an inbound `result()` message. Liveslots always notifies the kernel
// about this act of resolution.

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
          // eslint-disable-next-line no-await-in-loop
          await Promise.resolve();
        }

        // If we don't stall here, then all four messages get pipelined out
        // before we tell the kernel about the resolution
        // (syscall.resolve).

        // If we stall two turns, then the resolve goes to the
        // kernel before three() and four(), but our 'p1' is not yet marked
        // as resolved, so four() is sent to a Promise, rather than to
        // target2. This Promise ought to get a new vpid, because we retired
        // the old one when we resolved it, however it looks like it still
        // goes to the old 'p1' vpid, which is a bug.

        // If we stall a full three turns, then four() is sent directly to
        // target2.

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
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);

  const rootA = 'o+0';
  const target1 = 'o-1';
  const localTarget = 'o+1';
  const p1 = 'p-8';
  const expectedP2 = 'p+5';
  const expectedP3 = 'p+6';
  const expectedP4 = 'p+7';
  const expectedP5 = 'p+8';
  const expectedP6 = 'p+9';
  const target2 = 'o-2';

  if (which === 2) {
    await dispatch(makeMessage(rootA, 'result', capargs([], []), p1));
    await dispatch(makeMessage(rootA, 'promise', capargs([slot0arg], [p1])));
  } else if (which === 3) {
    await dispatch(makeMessage(rootA, 'promise', capargs([slot0arg], [p1])));
    await dispatch(makeMessage(rootA, 'result', capargs([], []), p1));
  } else {
    assert.fail(X`bad which=${which}`);
  }
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  t.deepEqual(log, []);

  await dispatch(
    makeMessage(
      rootA,
      'run',
      capargs([slot0arg, slot1arg], [target1, target2]),
    ),
  );

  // At the end of the turn in which run() is executed, the promise queue
  // will contain deliveries one() and two() (specifically invocations of the
  // handler on target1 and p1), plus the resolution of the promise p0 that
  // was returned by result().

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
  // argument
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'one',
    args: capargs([slot0arg], [p1]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  // The two() handler pipelines 'two' to p1, the promise we gave the vat
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    method: 'two',
    args: capargs([], []),
    resultSlot: expectedP3,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP3 });

  // console.log(`p1 is ${p1}`);
  // for(let l of log) {
  //   console.log(l);
  // }
  // return t.end();

  // Now liveslots processes the callback ("notifySuccess", mapped to a function
  // returned by "thenResolve") that got pushed when p0 was resolved, where p0
  // is the promise that was returned from rootA~.result() . This callback sends
  // `syscall.resolve(vpid1, stuff)` into the kernel, notifying any remote
  // subscribers that p1 has been resolved. Since the vat is also a subscriber,
  // thenResolve's callback must also invoke p1's resolver (which was stashed in
  // importedPromisesByPromiseID), as if the kernel had called the vat's
  // dispatch(notify). This causes the p1.then callback to be pushed to the back
  // of the promise queue, which will set resolutionOfP1 after all the syscalls
  // have been made.

  // Resolving p1 changes the handler of p1, so subsequent messages sent to
  // p1 will instead be sent to its resolution (which will be target2, or a
  // local object, or something that causes rejections). These messages are
  // already in the promise queue at this point, but their handlers haven't
  // been invoked yet. We exercise the way HandledPromise changes the handler
  // immediately, by looking at the syscalls issued (or not) by the callbacks
  // for three() and four().

  // At this point, we expect to see the vat tell the kernel that p1 is
  // resolved.
  const targets = { target2, localTarget, p1 };
  t.deepEqual(log.shift(), resolutionOf(p1, mode, targets));

  const expectedVPIDInThree = expectedP4;
  const expectedResultOfThree = expectedP5;
  const expectedResultOfFour = expectedP6;

  // three() references the old promise, which will use a new VPID if we
  // retired the old one as it was resolved
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'three',
    args: capargs([slot0arg], [expectedVPIDInThree]),
    resultSlot: expectedResultOfThree,
  });
  t.deepEqual(log.shift(), {
    type: 'subscribe',
    target: expectedResultOfThree,
  });

  // four() is sent *to* the old promise, which means it's sent to the
  // resolution target. If that target is a Presence, we'll see a syscall,
  // otherwise the vat handles it internally.

  if (mode === 'presence') {
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2,
      method: 'four',
      args: capargs([], []),
      resultSlot: expectedResultOfFour,
    });
    t.deepEqual(log.shift(), {
      type: 'subscribe',
      target: expectedResultOfFour,
    });
  }
  const targets2 = { target2, localTarget, p1: expectedP4 };
  t.deepEqual(log.shift(), resolutionOf(expectedP4, mode, targets2));

  // that's all the syscalls we should see
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
// test.only(`XX`, async t => {
//   await doVatResolveCase23(t, 2, 'presence', 0);
// });

for (const caseNum of [2, 3]) {
  for (const mode of modes) {
    for (let stalls = 0; stalls < 4; stalls += 1) {
      if (stalls === 0) {
        // FIGME: Need to resolve with solution to #1719
        test.failing(
          `liveslots vpid handling case${caseNum} ${mode} stalls=${stalls}`,
          async t => {
            await doVatResolveCase23(t, caseNum, mode, stalls);
          },
        );
      } else {
        test(`liveslots vpid handling case${caseNum} ${mode} stalls=${stalls}`, async t => {
          await doVatResolveCase23(t, caseNum, mode, stalls);
        });
      }
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
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);

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

  await dispatch(makeMessage(rootA, 'get', capargs([slot0arg], [p1])));
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'first', capargs([slot0arg], [target1])));

  const expectedP2 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'one',
    args: capargs([slot0arg], [p1]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  const expectedP3 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    method: 'two',
    args: capargs([], []),
    resultSlot: expectedP3,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP3 });
  t.deepEqual(log, []);

  let r;
  if (mode === 'presence') {
    r = makeResolve(p1, capargs(slot0arg, [target2]));
  } else if (mode === 'local-object') {
    r = makeResolve(p1, capargs(slot0arg, [rootA]));
  } else if (mode === 'data') {
    r = makeResolve(p1, capargs(4, []));
  } else if (mode === 'promise-data') {
    r = makeResolve(p1, capargs([slot0arg], [p1]));
  } else if (mode === 'reject') {
    r = makeReject(p1, capargs('error', []));
  } else if (mode === 'promise-reject') {
    r = makeReject(p1, capargs([slot0arg], [p1]));
  } else {
    assert.fail(X`unknown mode ${mode}`);
  }
  await dispatch(r);
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'second', capargs([slot0arg], [target1])));

  const expectedP4 = nextP();
  const expectedP5 = nextP();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'three',
    args: capargs([slot0arg], [expectedP4]),
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
      method: 'four',
      args: capargs([], []),
      resultSlot: expectedP6,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP6 });
  }

  const targets = { target2, localTarget: rootA, p1: expectedP4 };
  t.deepEqual(log.shift(), resolutionOf(expectedP4, mode, targets));

  // if p1 rejects or resolves to data, the kernel never hears about four()
  t.deepEqual(log, []);
}

for (const mode of modes) {
  test(`liveslots vpid handling case4 ${mode}`, async t => {
    await doVatResolveCase4(t, mode);
  });
}

// TODO unimplemented
// cases 5 and 6 are not implemented due to #886

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
        [p, r] = makePR();
        return p;
      },
      usePromise(pa) {
        r(pa);
      },
    });
  }
  const dispatchA = makeDispatch(syscall, build, 'vatA');
  // const dispatchB = makeDispatch(syscall, build, 'vatB');
  t.deepEqual(log, []);

  const rootA = 'o+0';
  // const rootB = 'o+0';
  const paA = 'p-8';
  const pbA = 'p-9';
  // const pbB = 'p-18';
  // const paB = 'p-19';

  await dispatchA(makeMessage(rootA, 'genPromise', capargs([], []), paA));
  t.deepEqual(log, []);

  // await dispatchB(makeMessage(rootB, 'genPromise', capargs([], []), pbB));
  // t.deepEqual(log, []);

  await dispatchA(
    makeMessage(rootA, 'usePromise', capargs([[slot0arg]], [pbA])),
  );
  t.deepEqual(log.shift(), { type: 'subscribe', target: pbA });
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[paA, false, capargs([slot0arg], [pbA])]],
  });
  t.deepEqual(log, []);

  // await dispatchB(makeMessage(rootB, 'usePromise', capargs([[slot0arg]], [paB])));
  // t.deepEqual(log.shift(), { type: 'subscribe', target: paB });
  // t.deepEqual(log.shift(), {
  //   type: 'resolve',
  //   resoutions: [[pbB, false, capargs([slot0arg], [paB])]],
  // });
  // t.deepEqual(log, []);
});
