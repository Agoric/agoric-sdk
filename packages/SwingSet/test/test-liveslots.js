/* global WeakRef */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { assert, details as X } from '@agoric/assert';
import engineGC from '../src/engine-gc.js';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent.js';
import { makeGcAndFinalize } from '../src/gc-and-finalize.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeLiveSlots, makeMarshaller } from '../src/kernel/liveSlots.js';
import { buildSyscall, makeDispatch } from './liveslots-helpers.js';
import {
  capargs,
  capargsOneSlot,
  capdataOneSlot,
  makeMessage,
  makeBringOutYourDead,
  makeResolve,
  makeReject,
  makeDropExports,
  makeRetireExports,
  makeRetireImports,
} from './util.js';

test('calls', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return Far('root', {
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
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // root!one() // sendOnly
  await dispatch(makeMessage(rootA, 'one', capargs(['args'])));
  t.deepEqual(log.shift(), 'one');

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.resolve('result')
  await dispatch(
    makeMessage(
      rootA,
      'two',
      capargs([{ '@qclass': 'slot', index: 0 }], ['p-1']),
    ),
  );
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-1' });
  t.deepEqual(log.shift(), 'two true');

  await dispatch(makeResolve('p-1', capargs('result')));
  t.deepEqual(log.shift(), ['res', 'result']);

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.reject('rejection')

  await dispatch(
    makeMessage(
      rootA,
      'two',
      capargs([{ '@qclass': 'slot', index: 0 }], ['p-2']),
    ),
  );
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-2' });
  t.deepEqual(log.shift(), 'two true');

  await dispatch(makeReject('p-2', capargs('rejection')));
  t.deepEqual(log.shift(), ['rej', 'rejection']);

  // TODO: more calls, more slot types
});

test('liveslots pipelines to syscall.send', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return Far('root', {
      one(x) {
        const p1 = E(x).pipe1();
        const p2 = E(p1).pipe2();
        E(p2).pipe3();
        log.push('sent p1p2p3');
      },
    });
  }
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const x = 'o-5';
  const p1 = 'p+5';
  const p2 = 'p+6';
  const p3 = 'p+7';

  // root!one(x) // sendOnly
  await dispatch(
    makeMessage(rootA, 'one', capargs([{ '@qclass': 'slot', index: 0 }], [x])),
  );

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
    return Far('onetwo', {
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
  const dispatch = makeDispatch(syscall, build);

  t.deepEqual(log, []);

  const rootA = 'o+0';
  const p1 = 'p-1';
  const o2 = 'o-2';
  const slot0arg = { '@qclass': 'slot', index: 0 };

  // function deliver(target, method, argsdata, result) {
  await dispatch(makeMessage(rootA, 'one', capargs([slot0arg], [p1])));
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
  await dispatch(makeResolve(p1, capargs(slot0arg, [o2])));
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
  await dispatch(makeMessage(rootA, 'two', capargs([], [])));
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
    return Far('root', {
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
  const dispatch = makeDispatch(syscall, build);

  t.deepEqual(log, []);

  const rootA = 'o+0';
  const target = 'o-1';
  const expectedP1 = 'p+5';
  const expectedResultP1 = 'p+6';
  const expectedP2 = 'p+7';
  const expectedResultP2 = 'p+8';
  const slot0arg = { '@qclass': 'slot', index: 0 };

  let resolution;
  const resolveSyscall = {
    type: 'resolve',
    resolutions: [[expectedP1, false]],
  };
  if (mode === 'to presence') {
    // n.b.: because the `body` object gets stringified and THEN compared to the
    // `body` string generated by liveslots, the order of the properties here is
    // significant.
    const body = {
      '@qclass': 'slot',
      iface: `Alleged: presence ${target}`,
      index: 0,
    };
    resolution = slot0arg;
    resolveSyscall.resolutions[0][2] = capargs(body, [target]);
  } else if (mode === 'to data') {
    resolution = 4;
    resolveSyscall.resolutions[0][2] = capargs(4, []);
  } else if (mode === 'reject') {
    resolution = 'reject';
    resolveSyscall.resolutions[0][1] = true;
    resolveSyscall.resolutions[0][2] = capargs('reject', []);
  } else {
    assert.fail(X`unknown mode ${mode}`);
  }

  // function deliver(target, method, argsdata, result) {
  await dispatch(
    makeMessage(rootA, 'run', capargs([slot0arg, resolution], [target])),
  );

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
  t.deepEqual(log.shift(), resolveSyscall);

  // On the next turn, 'two' is sent, with the previously-resolved promise.
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    method: 'two',
    args: capargs([slot0arg], [expectedP2]),
    resultSlot: expectedResultP2,
  });
  resolveSyscall.resolutions[0][0] = expectedP2;
  t.deepEqual(log.shift(), resolveSyscall);

  // and again it subscribes to the result promise
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultP2 });

  t.deepEqual(log, []);
}

test('liveslots retires outbound promise IDs after resolve to presence', async t => {
  await doOutboundPromise(t, 'to presence');
});

test('liveslots retires outbound promise IDs after resolve to data', async t => {
  await doOutboundPromise(t, 'to data');
});

test('liveslots retires outbound promise IDs after reject', async t => {
  await doOutboundPromise(t, 'reject');
});

test('liveslots retains pending exported promise', async t => {
  const gcAndFinalize = makeGcAndFinalize(engineGC);
  const { log, syscall } = buildSyscall();
  let watch;
  const success = [];
  function build(_vatPowers) {
    const root = Far('root', {
      make() {
        const pk = makePromiseKit();
        watch = new WeakRef(pk.promise);
        // we export the Promise, but do not retain resolve/reject
        return [pk.promise];
      },
      // if liveslots fails to keep a strongref to the Promise, it will have
      // been collected by now, and calling check() will fail, because
      // liveslots can't create a new Promise import when the allocatedByVat
      // says it was an export
      check(_p) {
        success.push('yes');
      },
    });
    return root;
  }

  const dispatch = makeDispatch(syscall, build);
  const rootA = 'o+0';
  const resultP = 'p-1';
  await dispatch(makeMessage(rootA, 'make', capargs([]), resultP));
  await gcAndFinalize();
  t.truthy(watch.deref(), 'Promise not retained');
  t.is(log[0].type, 'resolve');
  const res0 = log[0].resolutions[0];
  t.is(res0[0], resultP);
  const exportedVPID = res0[2].slots[0]; // currently p+5
  await dispatch(makeMessage(rootA, 'check', capargsOneSlot(exportedVPID)));
  t.deepEqual(success, ['yes']);
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
    let pin;
    return Far('root', {
      async run(target1) {
        // inhibit GC of the Presence, so the tests see stable syscalls
        // eslint-disable-next-line no-unused-vars
        pin = target1;
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
  const dispatch = makeDispatch(syscall, build);
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

  await dispatch(makeMessage(rootA, 'run', capargs([slot0arg], [target1])));

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
    await dispatch(makeResolve(expectedP1, capargs(slot0arg, [target2])));
  } else if (mode === 'to data') {
    await dispatch(makeResolve(expectedP1, capargs(4, [])));
  } else if (mode === 'reject') {
    await dispatch(makeReject(expectedP1, capargs('error', [])));
  } else {
    assert.fail(X`unknown mode ${mode}`);
  }
  t.deepEqual(log, []);

  // Now we resolve p2, allowing the second two() to proceed
  await dispatch(makeResolve(expectedP2, capargs(4, [])));

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
    assert.fail(X`unknown mode ${mode}`);
  }
  // #823 fails here for the non-presence cases: we expect no syscalls, but
  // instead we get a send to p+5
  t.deepEqual(log, []);
}

test('liveslots retires result promise IDs after resolve to presence', async t => {
  await doResultPromise(t, 'to presence');
});

test('liveslots retires result promise IDs after resolve to data', async t => {
  await doResultPromise(t, 'to data');
});

test('liveslots retires result promise IDs after reject', async t => {
  await doResultPromise(t, 'reject');
});

test('liveslots vs symbols', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    return Far('root', {
      [Symbol.asyncIterator](arg) {
        return ['ok', 'asyncIterator', arg];
      },
      good(target) {
        E(target)[Symbol.asyncIterator]('arg');
      },
      bad(target) {
        return E(target)
          [Symbol.for('nope')]('arg')
          .then(
            _ok => 'oops no error',
            err => ['caught', err],
          );
      },
    });
  }
  const dispatch = makeDispatch(syscall, build);
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const target = 'o-1';

  // E(root)[Symbol.asyncIterator]('one')
  const rp1 = 'p-1';
  await dispatch(
    makeMessage(rootA, 'Symbol.asyncIterator', capargs(['one']), 'p-1'),
  );
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp1, false, capargs(['ok', 'asyncIterator', 'one'])]],
  });
  t.deepEqual(log, []);

  // root~.good(target) -> send(methodname=Symbol.asyncIterator)
  await dispatch(
    makeMessage(
      rootA,
      'good',
      capargs([{ '@qclass': 'slot', index: 0 }], [target]),
    ),
  );
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    method: 'Symbol.asyncIterator',
    args: capargs(['arg']),
    resultSlot: 'p+5',
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+5' });
  t.deepEqual(log, []);

  // root~.bad(target) -> error because other Symbols are rejected
  const rp2 = 'p-2';
  const expErr = {
    '@qclass': 'error',
    errorId: 'error:liveSlots:vatA#70001',
    message: 'arbitrary Symbols cannot be used as method names',
    name: 'Error',
  };
  await dispatch(
    makeMessage(
      rootA,
      'bad',
      capargs([{ '@qclass': 'slot', index: 0 }], [target]),
      rp2,
    ),
  );
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp2, false, capargs(['caught', expErr])]],
  });
  t.deepEqual(log, []);
});

test('disable disavow', async t => {
  const { log, syscall } = buildSyscall();

  function build(vatPowers) {
    return Far('root', {
      one() {
        log.push(!!vatPowers.disavow);
      },
    });
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', false);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // root~.one() // sendOnly
  await dispatch(makeMessage(rootA, 'one', capargs([])));
  t.deepEqual(log.shift(), false);
  t.deepEqual(log, []);
});

test('disavow', async t => {
  const { log, syscall } = buildSyscall();

  function build(vatPowers) {
    const root = Far('root', {
      async one(pres1) {
        vatPowers.disavow(pres1);
        log.push('disavowed pres1');

        try {
          vatPowers.disavow(pres1);
          log.push('oops duplicate disavow worked');
        } catch (err) {
          log.push(err); // forbidden to disavow twice
        }
        log.push('tried duplicate disavow');

        try {
          const pr = Promise.resolve();
          vatPowers.disavow(pr);
          log.push('oops disavow Promise worked');
        } catch (err) {
          log.push(err); // forbidden to disavow promises
        }
        log.push('tried to disavow Promise');

        try {
          vatPowers.disavow(root);
          log.push('oops disavow export worked');
        } catch (err) {
          log.push(err); // forbidden to disavow exports
        }
        log.push('tried to disavow export');

        const p1 = E(pres1).foo();
        // this does a syscall.exit on a subsequent turn
        try {
          await p1;
          log.push('oops send to disavowed worked');
        } catch (err) {
          log.push(err); // fatal to send to disavowed
        }
        log.push('tried to send to disavowed');
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const import1 = 'o-1';

  // root~.one(import1) // sendOnly
  await dispatch(makeMessage(rootA, 'one', capargsOneSlot(import1)));
  t.deepEqual(log.shift(), { type: 'dropImports', slots: [import1] });
  t.deepEqual(log.shift(), 'disavowed pres1');

  function loggedError(re) {
    const l = log.shift();
    t.truthy(l instanceof Error);
    t.truthy(re.test(l.message));
  }
  loggedError(/attempt to disavow unknown/);
  t.deepEqual(log.shift(), 'tried duplicate disavow');
  loggedError(/attempt to disavow unknown/);
  t.deepEqual(log.shift(), 'tried to disavow Promise');
  loggedError(/attempt to disavow an export/);
  t.deepEqual(log.shift(), 'tried to disavow export');
  t.deepEqual(log.shift(), {
    type: 'exit',
    isFailure: true,
    info: {
      body: JSON.stringify({
        '@qclass': 'error',
        errorId: 'error:liveSlots:vatA#70001',
        message: 'this Presence has been disavowed',
        name: 'Error',
      }),
      slots: [],
    },
  });
  t.deepEqual(log.shift(), Error('this Presence has been disavowed'));
  t.deepEqual(log.shift(), 'tried to send to disavowed');
  t.deepEqual(log, []);
});

test('liveslots retains device nodes', async t => {
  const gcAndFinalize = makeGcAndFinalize(engineGC);
  const { syscall } = buildSyscall();
  let watch;
  const recognize = new WeakSet(); // real WeakSet
  const success = [];
  function build(_vatPowers) {
    const root = Far('root', {
      first(dn) {
        watch = new WeakRef(dn);
        recognize.add(dn);
      },
      second(dn) {
        success.push(recognize.has(dn));
      },
    });
    return root;
  }

  const dispatch = makeDispatch(syscall, build);
  const rootA = 'o+0';
  const device = 'd-1';
  await dispatch(makeMessage(rootA, 'first', capargsOneSlot(device)));
  await gcAndFinalize();
  t.truthy(watch.deref(), 'Device node not retained');
  await dispatch(makeMessage(rootA, 'second', capargsOneSlot(device)));
  t.deepEqual(success, [true]);
});

test('GC syscall.dropImports', async t => {
  const { log, syscall } = buildSyscall();
  let wr;
  function build(_vatPowers) {
    let presence1;
    const root = Far('root', {
      one(arg) {
        presence1 = arg;
        wr = new WeakRef(arg);
      },
      two() {},
      three() {
        // eslint-disable-next-line no-unused-vars
        presence1 = undefined; // drops the import
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const arg = 'o-1';

  // tell the vat make a Presence and hold it for a moment
  // rp1 = root~.one(arg)
  await dispatch(makeMessage(rootA, 'one', capargsOneSlot(arg)));
  await dispatch(makeBringOutYourDead());
  t.truthy(wr.deref());

  // an intermediate message will trigger GC, but the presence is still held
  await dispatch(makeMessage(rootA, 'two', capargs([])));
  await dispatch(makeBringOutYourDead());
  t.truthy(wr.deref());

  // now tell the vat to drop the 'arg' presence we gave them earlier
  await dispatch(makeMessage(rootA, 'three', capargs([]), null));
  await dispatch(makeBringOutYourDead());

  // the presence itself should be gone
  t.falsy(wr.deref());

  // first it will check that there are no VO's holding onto it
  const l2 = log.shift();
  t.deepEqual(l2, {
    type: 'vatstoreGet',
    key: 'vom.rc.o-1',
  });

  // since nothing else is holding onto it, the vat should emit a dropImports
  const l3 = log.shift();
  t.deepEqual(l3, {
    type: 'dropImports',
    slots: [arg],
  });

  // and since the vat never used the Presence in a WeakMap/WeakSet, they
  // cannot recognize it either, and will emit retireImports
  const l4 = log.shift();
  t.deepEqual(l4, {
    type: 'retireImports',
    slots: [arg],
  });

  t.deepEqual(log, []);
});

test('GC dispatch.retireImports', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    let presence1;
    const root = Far('root', {
      one(arg) {
        // eslint-disable-next-line no-unused-vars
        presence1 = arg;
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';
  const arg = 'o-1';

  // tell the vat make a Presence and hold it
  // rp1 = root~.one(arg)
  await dispatch(makeMessage(rootA, 'one', capargsOneSlot(arg)));

  // when the upstream export goes away, the kernel will send a
  // dispatch.retireImport into the vat
  await dispatch(makeRetireImports(arg));
  // for now, we only care that it doesn't crash
  t.deepEqual(log, []);

  // when we implement VOM.vrefIsRecognizable, this test might do more
});

test('GC dispatch.retireExports', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const ex1 = Far('export', {});
    const root = Far('root', {
      one() {
        return ex1;
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // rp1 = root~.one()
  // ex1 = await rp1
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'one', capargs([]), rp1));
  const l1 = log.shift();
  const ex1 = l1.resolutions[0][2].slots[0];
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capdataOneSlot(ex1)]],
  });
  t.deepEqual(log, []);

  // All other vats drop the export, but since the vat holds it strongly, the
  // vat says nothing
  await dispatch(makeDropExports(ex1));
  t.deepEqual(log, []);

  // Also, all other vats cease to be able to recognize it, which will delete
  // the clist entry and allows the vat to delete some slotToVal tables. The
  // vat does not need to react, but we want to make sure the dispatch
  // doesn't crash anything.
  await dispatch(makeRetireExports(ex1));
  t.deepEqual(log, []);
});

// Create a WeakRef/FinalizationRegistry pair that can be manipulated for
// tests. Limitations:
// * only one WeakRef per object
// * no deregister
// * extra debugging properties like FR.countCallbacks and FR.runOneCallback
// * nothing is hardened

function makeMockGC() {
  const weakRefToVal = new Map();
  const valToWeakRef = new Map();
  const allFRs = [];
  // eslint-disable-next-line no-unused-vars
  function log(...args) {
    // console.log(...args);
  }

  const mockWeakRefProto = {
    deref() {
      return weakRefToVal.get(this);
    },
  };
  function mockWeakRef(val) {
    assert(!valToWeakRef.has(val));
    weakRefToVal.set(this, val);
    valToWeakRef.set(val, this);
  }
  mockWeakRef.prototype = mockWeakRefProto;

  function kill(val) {
    log(`kill`, val);
    if (valToWeakRef.has(val)) {
      log(` killing weakref`);
      const wr = valToWeakRef.get(val);
      valToWeakRef.delete(val);
      weakRefToVal.delete(wr);
    }
    for (const fr of allFRs) {
      if (fr.registry.has(val)) {
        log(` pushed on FR queue, context=`, fr.registry.get(val));
        fr.ready.push(val);
      }
    }
    log(` kill done`);
  }

  const mockFinalizationRegistryProto = {
    register(val, context) {
      log(`FR.register(context=${context})`);
      this.registry.set(val, context);
    },
    countCallbacks() {
      log(`countCallbacks:`);
      log(` ready:`, this.ready);
      log(` registry:`, this.registry);
      return this.ready.length;
    },
    runOneCallback() {
      log(`runOneCallback`);
      const val = this.ready.shift();
      log(` val:`, val);
      assert(this.registry.has(val));
      const context = this.registry.get(val);
      log(` context:`, context);
      this.registry.delete(val);
      this.callback(context);
    },
  };

  function mockFinalizationRegistry(callback) {
    this.registry = new Map();
    this.callback = callback;
    this.ready = [];
    allFRs.push(this);
  }
  mockFinalizationRegistry.prototype = mockFinalizationRegistryProto;

  function getAllFRs() {
    return allFRs;
  }

  function mockGCAndFinalize() {}

  return harden({
    WeakRef: mockWeakRef,
    FinalizationRegistry: mockFinalizationRegistry,
    kill,
    getAllFRs,
    waitUntilQuiescent,
    gcAndFinalize: mockGCAndFinalize,
    meterControl: makeDummyMeterControl(),
  });
}

test('dropImports', async t => {
  const { syscall } = buildSyscall();
  const imports = [];
  const gcTools = makeMockGC();

  function build(_vatPowers) {
    const root = Far('root', {
      hold(imp) {
        imports.push(imp);
      },
      free() {
        gcTools.kill(imports.pop());
      },
      ignore(imp) {
        gcTools.kill(imp);
      },
    });
    return root;
  }

  const ls = makeLiveSlots(
    syscall,
    'vatA',
    {},
    {},
    undefined,
    false,
    false,
    gcTools,
  );
  const { setBuildRootObject, dispatch, possiblyDeadSet } = ls;
  setBuildRootObject(build);
  const allFRs = gcTools.getAllFRs();
  t.is(allFRs.length, 2);
  const FR = allFRs[0];

  const rootA = 'o+0';

  // immediate drop should push import to possiblyDeadSet after finalizer runs
  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-1')));
  // the immediate gcTools.kill() means that the import should now be in the
  // "COLLECTED" state
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);
  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-1']));
  possiblyDeadSet.delete('o-1'); // pretend liveslots did syscall.dropImport

  // separate hold and free should do the same
  await dispatch(makeMessage(rootA, 'hold', capargsOneSlot('o-2')));
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
  await dispatch(makeMessage(rootA, 'free', capargs([])));
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);
  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-2']));
  possiblyDeadSet.delete('o-2'); // pretend liveslots did syscall.dropImport

  // re-introduction during COLLECTED should return to REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-3')));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'hold', capargsOneSlot('o-3')));
  // back to REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());

  await dispatch(makeMessage(rootA, 'free', capargs([])));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-3']));
  possiblyDeadSet.delete('o-3'); // pretend liveslots did syscall.dropImport

  // multiple queued finalizers are idempotent, remains REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-4')));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-4')));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  await dispatch(makeMessage(rootA, 'hold', capargsOneSlot('o-4')));
  // back to REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);

  // multiple queued finalizers are idempotent, remains FINALIZED

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-5')));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-5')));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-5']));
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-5']));
  t.is(FR.countCallbacks(), 0);
  possiblyDeadSet.delete('o-5'); // pretend liveslots did syscall.dropImport

  // re-introduction during FINALIZED moves back to REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', capargsOneSlot('o-6')));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-6']));
  t.is(FR.countCallbacks(), 0);

  await dispatch(makeMessage(rootA, 'hold', capargsOneSlot('o-6')));
  await dispatch(makeBringOutYourDead());
  // back to REACHABLE, removed from possiblyDeadSet
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
});

test('GC dispatch.dropExports', async t => {
  const { log, syscall } = buildSyscall();
  let wr;
  function build(_vatPowers) {
    const root = Far('root', {
      one() {
        const ex1 = Far('export', {});
        wr = new WeakRef(ex1);
        return ex1;
        // ex1 goes out of scope, dropping last userspace strongref
      },
      two() {},
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // rp1 = root~.one()
  // ex1 = await rp1
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'one', capargs([]), rp1));
  await dispatch(makeBringOutYourDead());
  const l1 = log.shift();
  const ex1 = l1.resolutions[0][2].slots[0];
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capdataOneSlot(ex1)]],
  });
  t.deepEqual(log, []);

  // the exported Remotable should be held in place by exportedRemotables
  // until we tell the vat we don't need it any more
  t.truthy(wr.deref());

  // an intermediate message will trigger GC, but the presence is still held
  await dispatch(makeMessage(rootA, 'two', capargs([])));
  await dispatch(makeBringOutYourDead());
  t.truthy(wr.deref());

  // now tell the vat we don't need a strong reference to that export.
  await dispatch(makeDropExports(ex1));
  await dispatch(makeBringOutYourDead());

  // that should allow ex1 to be collected
  t.falsy(wr.deref());

  // and once it's collected, the vat should emit `syscall.retireExport`
  // because nobody else will be able to recognize it again
  const l2 = log.shift();
  t.deepEqual(l2, {
    type: 'retireExports',
    slots: [ex1],
  });
  t.deepEqual(log, []);
});

test('GC dispatch.retireExports inhibits syscall.retireExports', async t => {
  const { log, syscall } = buildSyscall();
  let wr;
  function build(_vatPowers) {
    let ex1;
    const root = Far('root', {
      hold() {
        ex1 = Far('export', {});
        wr = new WeakRef(ex1);
        return ex1;
      },
      two() {},
      drop() {
        // eslint-disable-next-line no-unused-vars
        ex1 = undefined; // drop the last userspace strongref
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  // rp1 = root~.hold()
  // ex1 = await rp1
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'hold', capargs([]), rp1));
  await dispatch(makeBringOutYourDead());
  const l1 = log.shift();
  const ex1 = l1.resolutions[0][2].slots[0];
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capdataOneSlot(ex1)]],
  });
  t.deepEqual(log, []);

  // the exported Remotable should be held in place by exportedRemotables
  // until we tell the vat we don't need it any more
  t.truthy(wr.deref());

  // an intermediate message will trigger GC, but the presence is still held
  await dispatch(makeMessage(rootA, 'two', capargs([])));
  await dispatch(makeBringOutYourDead());
  t.truthy(wr.deref());

  // now tell the vat we don't need a strong reference to that export.
  await dispatch(makeDropExports(ex1));
  await dispatch(makeBringOutYourDead());

  // that removes the liveslots strongref, but the vat's remains in place
  t.truthy(wr.deref());

  // now the kernel tells the vat we can't even recognize the export
  await dispatch(makeRetireExports(ex1));
  await dispatch(makeBringOutYourDead());

  // that ought to delete the table entry, but doesn't affect the vat
  // strongref
  t.truthy(wr.deref());

  // now tell the vat to drop its strongref
  await dispatch(makeMessage(rootA, 'drop', capargs([])));
  await dispatch(makeBringOutYourDead());

  // which should let the export be collected
  t.falsy(wr.deref());

  // the vat should *not* emit `syscall.retireExport`, because it already
  // received a dispatch.retireExport
  t.deepEqual(log, []);
});

const oneSlot = { '@qclass': 'slot', index: 0 };

// todo: test that ancillary promises cause syscall.resolve, also test
// unserializable resolutions
test('simple promise resolution', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const pkA = makePromiseKit();
    const root = Far('root', {
      export() {
        return harden({ p: pkA.promise });
      },
      resolve() {
        pkA.resolve('data');
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', capargs([]), rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: oneSlot };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capargs(expectedResult1, [expectedPA])]],
  });
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'resolve', capargs([])));
  // this should resolve pkA.promise
  const l2 = log.shift();
  t.is(l2.type, 'resolve');
  t.is(l2.resolutions[0][0], expectedPA);
  t.deepEqual(l2.resolutions[0][2], capargs('data'));
});

test('promise cycle', async t => {
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const pkA = makePromiseKit();
    const pkB = makePromiseKit();
    pkA.resolve([pkB.promise]);
    pkB.resolve([pkA.promise]);
    const root = Far('root', {
      export() {
        return harden({ p: pkA.promise });
      },
      resolve() {
        pkA.resolve('data');
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', capargs([]), rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA1 = 'p+5'; // pkA.promise first export
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capargs({ p: oneSlot }, [expectedPA1])]],
  });
  // liveslots will see pkA.promise resolve on the second-ish turn of the
  // first delivery (of root~.export), to an array. When it serializes that
  // array, it notices pkB.promise, and attaches a .then() to watch it. The
  // first resolution syscall will announce the resolution of pkA, and will
  // mention pkB in the resolution data.
  const expectedPB = 'p+6'; // pkB.promise first export
  const l2 = log.shift();
  t.deepEqual(l2, {
    type: 'resolve',
    resolutions: [[expectedPA1, false, capargs([oneSlot], [expectedPB])]],
  });

  // When liveslots sees pkB resolve, the resolution will be to an array that
  // includes pkA. Liveslots knows pkA is already resolved, so the
  // syscall.resolve will include pkA as an "ancillary promise": it will be a
  // batch that resolves both pkB and a new identifier for pkA, so the cycle
  // is entirely contained within a single syscall.
  const expectedPA2 = 'p+7'; // pkA.promise second export
  const l3 = log.shift();

  t.deepEqual(l3, {
    type: 'resolve',
    resolutions: [
      [expectedPB, false, capargs([oneSlot], [expectedPA2])],
      [expectedPA2, false, capargs([oneSlot], [expectedPB])],
    ],
  });
  t.deepEqual(log, []);
});

test('unserializable promise resolution', async t => {
  // method-bearing objects must be marked as Far, else they cannot be
  // serialized
  const unserializable = harden({ deliberate: () => {} });
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const pkA = makePromiseKit();
    const root = Far('root', {
      export() {
        return harden({ p: pkA.promise });
      },
      resolve() {
        pkA.resolve(unserializable); // causes serialization error
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', capargs([]), rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: oneSlot };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capargs(expectedResult1, [expectedPA])]],
  });
  t.deepEqual(log, []);

  console.log('generating deliberate error');
  await dispatch(makeMessage(rootA, 'resolve', capargs([])));
  // This should reject pkA.promise, because the promise's resolution cannot
  // be serialized. If liveSlots doesn't catch serialization errors, the
  // promise won't get resolved, and the vat won't have made any syscalls
  t.truthy(log.length, 'vat failed to resolve promise');

  const l2 = log.shift();
  t.is(l2.type, 'resolve');
  t.is(l2.resolutions[0][0], expectedPA);

  // one-off marshaller to find out what an Error should look like
  const { m } = makeMarshaller(null, makeMockGC(), 'vatA');
  let expectedError;
  try {
    m.serialize(unserializable);
  } catch (e) {
    expectedError = m.serialize(e);
  }
  const ebody = JSON.parse(expectedError.body);
  t.is(ebody['@qclass'], 'error');
  t.is(ebody.name, 'Error');
  t.regex(ebody.message, /Remotables must be explicitly declared/);

  t.deepEqual(l2.resolutions[0], [expectedPA, true, expectedError]);
});

test('unserializable promise rejection', async t => {
  // method-bearing objects must be marked as Far, else they cannot be
  // serialized
  const unserializable = harden({ deliberate: () => {} });
  const { log, syscall } = buildSyscall();
  function build(_vatPowers) {
    const pkA = makePromiseKit();
    const root = Far('root', {
      export() {
        return harden({ p: pkA.promise });
      },
      resolve() {
        pkA.reject(unserializable); // causes serialization error
      },
    });
    return root;
  }
  const dispatch = makeDispatch(syscall, build, 'vatA', true);
  t.deepEqual(log, []);
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', capargs([]), rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: oneSlot };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, capargs(expectedResult1, [expectedPA])]],
  });
  t.deepEqual(log, []);

  console.log('generating deliberate error');
  await dispatch(makeMessage(rootA, 'resolve', capargs([])));
  // This should reject pkA.promise, because the promise's resolution cannot
  // be serialized. If liveSlots doesn't catch serialization errors, the
  // promise won't get resolved, and the vat won't have made any syscalls
  t.truthy(log.length, 'vat failed to resolve promise');

  const l2 = log.shift();
  t.is(l2.type, 'resolve');
  t.is(l2.resolutions[0][0], expectedPA);

  // one-off marshaller to find out what an Error should look like
  const { m } = makeMarshaller(null, makeMockGC(), 'vatA');
  let expectedError;
  try {
    m.serialize(unserializable);
  } catch (e) {
    expectedError = m.serialize(e);
  }
  const ebody = JSON.parse(expectedError.body);
  t.is(ebody['@qclass'], 'error');
  t.is(ebody.name, 'Error');
  t.regex(ebody.message, /Remotables must be explicitly declared/);

  t.deepEqual(l2.resolutions[0], [expectedPA, true, expectedError]);
});
