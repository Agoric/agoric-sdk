import '@agoric/install-ses';
import test from 'ava';
import { E } from '@agoric/eventual-send';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent';
import { makeLiveSlots } from '../src/kernel/liveSlots';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function buildSyscall() {
  const log = [];

  const syscall = {
    send(targetSlot, method, args, resultSlot) {
      log.push({ type: 'send', targetSlot, method, args, resultSlot });
    },
    subscribe(target) {
      log.push({ type: 'subscribe', target });
    },
    fulfillToPresence(promiseID, slot) {
      log.push({ type: 'fulfillToPresence', promiseID, slot });
    },
    fulfillToData(promiseID, data) {
      log.push({ type: 'fulfillToData', promiseID, data });
    },
    reject(promiseID, data) {
      log.push({ type: 'reject', promiseID, data });
    },
  };

  return { log, syscall };
}

test('calls', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return harden({
      one() {
        log.push('one');
      },
      two(p) {
        log.push(`two ${E.resolve(p) === p}`);
        p.then(
          res => log.push(['res', res]),
          rej => log.push(['rej', rej]),
        );
      },
    });
  }
  const dispatch = makeLiveSlots(syscall, {}, build, 'vatA');
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // root!one() // sendOnly
  dispatch.deliver(rootA, 'one', capargs(['args']), undefined);
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), 'one');

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.resolve('result')
  dispatch.deliver(
    rootA,
    'two',
    capargs([{ '@qclass': 'slot', index: 0 }], ['p-1']),
    undefined,
  );
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-1' });
  t.deepEqual(log.shift(), 'two true');

  dispatch.notifyFulfillToData('p-1', capargs('result'));
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), ['res', 'result']);

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.reject('rejection')

  dispatch.deliver(
    rootA,
    'two',
    capargs([{ '@qclass': 'slot', index: 0 }], ['p-2']),
    undefined,
  );
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-2' });
  t.deepEqual(log.shift(), 'two true');

  dispatch.notifyReject('p-2', capargs('rejection'));
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), ['rej', 'rejection']);

  // TODO: more calls, more slot types
});

test('liveslots pipelines to syscall.send', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return harden({
      one(x) {
        const p1 = E(x).pipe1();
        const p2 = E(p1).pipe2();
        E(p2).pipe3();
        log.push('sent p1p2p3');
      },
    });
  }
  const dispatch = makeLiveSlots(syscall, {}, build, 'vatA');
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const x = 'o-5';
  const p1 = 'p+5';
  const p2 = 'p+6';
  const p3 = 'p+7';

  // root!one(x) // sendOnly
  dispatch.deliver(
    rootA,
    'one',
    capargs([{ '@qclass': 'slot', index: 0 }], [x]),
    undefined,
  );
  await waitUntilQuiescent();

  // calling one() should cause three syscall.send() calls to be made: one
  // for x!pipe1(), a second pipelined to the result promise of it, and a
  // third pipelined to the result of the second.

  t.deepEqual(log.shift(), 'sent p1p2p3');
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: x,
    method: 'pipe1',
    args: capargs([], []),
    resultSlot: p1,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    method: 'pipe2',
    args: capargs([], []),
    resultSlot: p2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: p2 });
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p2,
    method: 'pipe3',
    args: capargs([], []),
    resultSlot: p3,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: p3 });
});

test('liveslots pipeline/non-pipeline calls', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    let p1;
    return harden({
      one(p) {
        p1 = p;
        E(p1).pipe1();
        p1.then(o2 => E(o2).nonpipe2());
      },
      two() {
        E(p1).nonpipe3();
      },
    });
  }
  const dispatch = makeLiveSlots(syscall, {}, build, 'vatA');

  t.deepEqual(log, []);

  const rootA = 'o+0';
  const p1 = 'p-1';
  const o2 = 'o-2';
  const slot0arg = { '@qclass': 'slot', index: 0 };

  // function deliver(target, method, argsdata, result) {
  dispatch.deliver(rootA, 'one', capargs([slot0arg], [p1]));
  await waitUntilQuiescent();
  // the vat should subscribe to the inbound p1 during deserialization
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  // then it pipeline-sends `pipe1` to p1, with a new result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    method: 'pipe1',
    args: capargs([], []),
    resultSlot: 'p+5',
  });
  // then it subscribes to the result promise too
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+5' });
  t.deepEqual(log, []);

  // now we tell it the promise has resolved, to object 'o2'
  // function notifyFulfillToPresence(promiseID, slot) {
  dispatch.notifyFulfillToPresence(p1, o2);
  await waitUntilQuiescent();
  // this allows E(o2).nonpipe2() to go out, which was not pipelined
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: o2,
    method: 'nonpipe2',
    args: capargs([], []),
    resultSlot: 'p+6',
  });
  // and nonpipe2() wants a result
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+6' });
  t.deepEqual(log, []);

  // now call two(), which should send nonpipe3 to o2, not p1, since p1 has
  // been resolved
  dispatch.deliver(rootA, 'two', capargs([], []));
  await waitUntilQuiescent();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: o2,
    method: 'nonpipe3',
    args: capargs([], []),
    resultSlot: 'p+7',
  });
  // and nonpipe3() wants a result
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+7' });
  t.deepEqual(log, []);
});

async function doOutboundPromise(t, mode) {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return harden({
      run(target, resolution) {
        let p; // vat creates the promise
        if (resolution === 'reject') {
          // eslint-disable-next-line prefer-promise-reject-errors
          p = Promise.reject('reject');
        } else {
          p = Promise.resolve(resolution); // resolves in future turn
        }
        E(target).one(p); // sends promise
        // then sends resolution/rejection

        // Queue up a call that includes the promise again. This will run
        // *after* the promise has been resolved. Our current implementation
        // will use the same promise identifier.
        Promise.resolve().then(() => E(target).two(p));
      },
    });
  }
  const dispatch = makeLiveSlots(syscall, {}, build, 'vatA');

  t.deepEqual(log, []);

  const rootA = 'o+0';
  const target = 'o-1';
  const expectedP1 = 'p+5';
  const expectedResultP1 = 'p+6';
  const expectedP2 = 'p+7';
  const expectedResultP2 = 'p+8';
  const slot0arg = { '@qclass': 'slot', index: 0 };

  let resolution;
  let fulfillmentSyscall;
  if (mode === 'to presence') {
    resolution = slot0arg;
    fulfillmentSyscall = {
      type: 'fulfillToPresence',
      promiseID: expectedP1,
      slot: target,
    };
  } else if (mode === 'to data') {
    resolution = 4;
    fulfillmentSyscall = {
      type: 'fulfillToData',
      promiseID: expectedP1,
      data: capargs(4, []),
    };
  } else if (mode === 'reject') {
    resolution = 'reject';
    fulfillmentSyscall = {
      type: 'reject',
      promiseID: expectedP1,
      data: capargs('reject', []),
    };
  } else {
    throw Error(`unknown mode ${mode}`);
  }

  // function deliver(target, method, argsdata, result) {
  dispatch.deliver(rootA, 'run', capargs([slot0arg, resolution], [target]));
  await waitUntilQuiescent();

  // The vat should send 'one' and mention the promise for the first time. It
  // does not subscribe to its own promise.
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    method: 'one',
    args: capargs([slot0arg], [expectedP1]),
    resultSlot: expectedResultP1,
  });
  // then it subscribes to the result promise
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultP1 });

  // on the next turn, the promise is resolved/rejected, and the vat notifies the
  // kernel
  t.deepEqual(log.shift(), fulfillmentSyscall);

  // On the next turn, 'two' is sent, with the previously-resolved promise.
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    method: 'two',
    args: capargs([slot0arg], [expectedP2]),
    resultSlot: expectedResultP2,
  });
  // and again it subscribes to the result promise
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultP2 });

  fulfillmentSyscall.promiseID = expectedP2;
  t.deepEqual(log.shift(), fulfillmentSyscall);

  t.deepEqual(log, []);
}

test('liveslots does not retire outbound promise IDs after fulfillToPresence', async t => {
  await doOutboundPromise(t, 'to presence');
});

test('liveslots does not retire outbound promise IDs after fulfillToData', async t => {
  await doOutboundPromise(t, 'to data');
});

test('liveslots does not retire outbound promise IDs after reject', async t => {
  await doOutboundPromise(t, 'reject');
});

function hush(p) {
  p.then(
    () => undefined,
    () => undefined,
  );
}

async function doResultPromise(t, mode) {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return harden({
      async run(target1) {
        const p1 = E(target1).getTarget2();
        hush(p1);
        const p2 = E(p1).one();
        // p1 resolves first, then p2 resolves on a subsequent crank
        await p2;
        // the second call to p1 should be sent to the object, not the
        // promise, since the resolution of p1 is now known
        const p3 = E(p1).two();
        hush(p3);
      },
    });
  }
  const dispatch = makeLiveSlots(syscall, {}, build, 'vatA');
  t.deepEqual(log, []);

  const slot0arg = { '@qclass': 'slot', index: 0 };
  const rootA = 'o+0';
  const target1 = 'o-1';
  const expectedP1 = 'p+5';
  const expectedP2 = 'p+6';
  const expectedP3 = 'p+7';
  // if getTarget2 returns an object, two() is sent to it
  const target2 = 'o-2';
  // if it returns data or a rejection, two() results in an error

  dispatch.deliver(rootA, 'run', capargs([slot0arg], [target1]));
  await waitUntilQuiescent();

  // The vat should send 'getTarget2' and subscribe to the result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    method: 'getTarget2',
    args: capargs([], []),
    resultSlot: expectedP1,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP1 });

  // then it should pipeline the one(), and subscribe to the result
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: expectedP1,
    method: 'one',
    args: capargs([], []),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  // now it should be waiting for p2 to resolve, before it can send two()
  t.deepEqual(log, []);

  // resolve p1 first. The one() call was already pipelined, so this
  // should not trigger any new syscalls.
  if (mode === 'to presence') {
    dispatch.notifyFulfillToPresence(expectedP1, target2);
  } else if (mode === 'to data') {
    dispatch.notifyFulfillToData(expectedP1, capargs(4, []));
  } else if (mode === 'reject') {
    dispatch.notifyReject(expectedP1, capargs('error', []));
  } else {
    throw Error(`unknown mode ${mode}`);
  }
  await waitUntilQuiescent();
  t.deepEqual(log, []);

  // Now we resolve p2, allowing the second two() to proceed
  dispatch.notifyFulfillToData(expectedP2, capargs(4, []));
  await waitUntilQuiescent();

  if (mode === 'to presence') {
    // If we resolved it to a target, we should see two() sent through to the
    // new target, not the original promise.
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2, // #823 fails here: expect o-2, get p+5
      method: 'two',
      args: capargs([], []),
      resultSlot: expectedP3,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP3 });
  } else if (mode === 'to data' || mode === 'reject') {
    // Resolving to a non-target means a locally-generated error, and no
    // send() call
  } else {
    throw Error(`unknown mode ${mode}`);
  }
  // #823 fails here for the non-presence cases: we expect no syscalls, but
  // instead we get a send to p+5
  t.deepEqual(log, []);
}

test('liveslots does not retire result promise IDs after fulfillToPresence', async t => {
  await doResultPromise(t, 'to presence');
});

test('liveslots does not retire result promise IDs after fulfillToData', async t => {
  await doResultPromise(t, 'to data');
});

test('liveslots does not retire result promise IDs after reject', async t => {
  await doResultPromise(t, 'reject');
});
