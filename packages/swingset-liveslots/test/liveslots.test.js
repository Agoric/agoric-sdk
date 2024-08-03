// @ts-nocheck
import test from 'ava';

import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { kslot, kser, kunser } from '@agoric/kmarshal';
import { M } from '@agoric/store';
import { makeLiveSlots, makeMarshaller } from '../src/liveslots.js';
import { buildSyscall, makeDispatch } from './liveslots-helpers.js';
import { makeMessage, makeStartVat, makeResolve, makeReject } from './util.js';
import { makeMockGC } from './mock-gc.js';

function matchIDCounterSet(t, log) {
  t.like(log.shift(), { type: 'vatstoreSet', key: 'idCounters' });
}

function expectError(t, expectedError, messagePattern) {
  const err = kunser(expectedError);
  t.is(err.name, 'Error');
  t.regex(err.message, messagePattern);
}

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
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  // root!one() // sendOnly
  await dispatch(makeMessage(rootA, 'one', ['args']));
  t.is(log.shift(), 'one');

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.resolve('result')
  await dispatch(makeMessage(rootA, 'two', [kslot('p-1')]));
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-1' });
  t.is(log.shift(), 'two true');

  await dispatch(makeResolve('p-1', kser('result')));
  t.deepEqual(log.shift(), ['res', 'result']);

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.reject('rejection')

  await dispatch(makeMessage(rootA, 'two', [kslot('p-2')]));
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p-2' });
  t.is(log.shift(), 'two true');

  await dispatch(makeReject('p-2', kser('rejection')));
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
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const x = 'o-5';
  const p1 = 'p+5';
  const p2 = 'p+6';
  const p3 = 'p+7';

  // root!one(x) // sendOnly
  await dispatch(makeMessage(rootA, 'one', [kslot(x)]));

  // calling one() should cause three syscall.send() calls to be made: one
  // for x!pipe1(), a second pipelined to the result promise of it, and a
  // third pipelined to the result of the second.

  t.is(log.shift(), 'sent p1p2p3');
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: x,
    methargs: kser(['pipe1', []]),
    resultSlot: p1,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    methargs: kser(['pipe2', []]),
    resultSlot: p2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: p2 });
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p2,
    methargs: kser(['pipe3', []]),
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
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const p1 = 'p-1';
  const o2 = 'o-2';

  // function deliver(target, method, argsdata, result) {
  await dispatch(makeMessage(rootA, 'one', [kslot(p1)]));
  // the vat should subscribe to the inbound p1 during deserialization
  t.deepEqual(log.shift(), { type: 'subscribe', target: p1 });
  // then it pipeline-sends `pipe1` to p1, with a new result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: p1,
    methargs: kser(['pipe1', []]),
    resultSlot: 'p+5',
  });
  // then it subscribes to the result promise too
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+5' });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // now we tell it the promise has resolved, to object 'o2'
  await dispatch(makeResolve(p1, kser(kslot(o2))));
  // this allows E(o2).nonpipe2() to go out, which was not pipelined
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: o2,
    methargs: kser(['nonpipe2', []]),
    resultSlot: 'p+6',
  });
  // and nonpipe2() wants a result
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+6' });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // now call two(), which should send nonpipe3 to o2, not p1, since p1 has
  // been resolved
  await dispatch(makeMessage(rootA, 'two', []));
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: o2,
    methargs: kser(['nonpipe3', []]),
    resultSlot: 'p+7',
  });
  // and nonpipe3() wants a result
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+7' });
  matchIDCounterSet(t, log);
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
        void Promise.resolve().then(() => E(target).two(p));
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const target = 'o-1';
  const expectedP1 = 'p+5';
  const expectedResultP1 = 'p+6';
  const expectedP2 = 'p+7';
  const expectedResultP2 = 'p+8';

  let resolution;
  const resolveSyscall = {
    type: 'resolve',
    resolutions: [[expectedP1, false]],
  };
  if (mode === 'to presence') {
    resolution = kslot(target, `presence ${target}`);
  } else if (mode === 'to data') {
    resolution = 4;
  } else if (mode === 'reject') {
    resolution = 'reject';
    resolveSyscall.resolutions[0][1] = true;
  } else {
    Fail`unknown mode ${mode}`;
  }
  resolveSyscall.resolutions[0][2] = kser(resolution);

  // function deliver(target, method, argsdata, result) {
  await dispatch(
    makeMessage(rootA, 'run', [
      kslot(target, `presence ${target}`),
      resolution,
    ]),
  );

  // The vat should send 'one' and mention the promise for the first time. It
  // does not subscribe to its own promise.
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    methargs: kser(['one', [kslot(expectedP1)]]),
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
    methargs: kser(['two', [kslot(expectedP2)]]),
    resultSlot: expectedResultP2,
  });
  resolveSyscall.resolutions[0][0] = expectedP2;
  t.deepEqual(log.shift(), resolveSyscall);

  // and again it subscribes to the result promise
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedResultP2 });

  matchIDCounterSet(t, log);
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

function hush(p) {
  p.then(
    () => undefined,
    () => undefined,
  );
}

async function doResultPromise(t, mode) {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    // inhibit GC of the Presence, so the tests see stable syscalls
    // eslint-disable-next-line no-unused-vars
    let pin;
    return Far('root', {
      async run(target1) {
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
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct

  const rootA = 'o+0';
  const target1 = 'o-1';
  const expectedP1 = 'p+5';
  const expectedP2 = 'p+6';
  const expectedP3 = 'p+7';
  // if getTarget2 returns an object, two() is sent to it
  const target2 = 'o-2';
  // if it returns data or a rejection, two() results in an error

  await dispatch(makeMessage(rootA, 'run', [kslot(target1)]));

  // The vat should send 'getTarget2' and subscribe to the result promise
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target1,
    methargs: kser(['getTarget2', []]),
    resultSlot: expectedP1,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP1 });

  // then it should pipeline the one(), and subscribe to the result
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: expectedP1,
    methargs: kser(['one', []]),
    resultSlot: expectedP2,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP2 });

  // now it should be waiting for p2 to resolve, before it can send two()
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // resolve p1 first. The one() call was already pipelined, so this
  // should not trigger any new syscalls.
  if (mode === 'to presence') {
    await dispatch(makeResolve(expectedP1, kser(kslot(target2))));
  } else if (mode === 'to data') {
    await dispatch(makeResolve(expectedP1, kser(4)));
  } else if (mode === 'reject') {
    await dispatch(makeReject(expectedP1, kser('error')));
  } else {
    Fail`unknown mode ${mode}`;
  }
  t.deepEqual(log, []);

  // Now we resolve p2, allowing the second two() to proceed
  await dispatch(makeResolve(expectedP2, kser(4)));

  if (mode === 'to presence') {
    // If we resolved it to a target, we should see two() sent through to the
    // new target, not the original promise.
    t.deepEqual(log.shift(), {
      type: 'send',
      targetSlot: target2, // #823 fails here: expect o-2, get p+5
      methargs: kser(['two', []]),
      resultSlot: expectedP3,
    });
    t.deepEqual(log.shift(), { type: 'subscribe', target: expectedP3 });
    matchIDCounterSet(t, log);
  } else if (mode === 'to data' || mode === 'reject') {
    // Resolving to a non-target means a locally-generated error, and no
    // send() call
  } else {
    Fail`unknown mode ${mode}`;
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
  const arbitrarySymbol = Symbol.for('arbitrary');

  function build(_vatPowers) {
    return Far('root', {
      [Symbol.asyncIterator](arg) {
        return ['ok', 'asyncIterator', arg];
      },
      [arbitrarySymbol](arg) {
        return ['ok', 'arbitrary', arg];
      },
      sendAsyncIterator(target) {
        E(target)[Symbol.asyncIterator]('arg');
      },
      sendArbitrary(target) {
        E(target)[arbitrarySymbol]('arg');
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);

  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const target = 'o-1';

  // E(root)[Symbol.asyncIterator]('one')
  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, Symbol.asyncIterator, ['one'], rp1));
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp1, false, kser(['ok', 'asyncIterator', 'one'])]],
  });
  t.deepEqual(log, []);

  // E(root)[arbitrarySymbol]('two')
  const rp2 = 'p-2';
  await dispatch(makeMessage(rootA, Symbol.for('arbitrary'), ['two'], rp2));
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp2, false, kser(['ok', 'arbitrary', 'two'])]],
  });
  t.deepEqual(log, []);

  // root~.sendAsyncIterator(target) -> send(methodname=Symbol.asyncIterator)
  await dispatch(makeMessage(rootA, 'sendAsyncIterator', [kslot(target)]));
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    methargs: kser([Symbol.asyncIterator, ['arg']]),
    resultSlot: 'p+5',
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+5' });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  // root~.sendArbitrary(target) -> send(methodname=Symbol.for('arbitrary')
  await dispatch(makeMessage(rootA, 'sendArbitrary', [kslot(target)]));
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    methargs: kser([Symbol.for('arbitrary'), ['arg']]),
    resultSlot: 'p+6',
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+6' });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);
});

test('remote function call', async t => {
  const { log, syscall } = buildSyscall();

  function build(_vatPowers) {
    const fun = Far('fun', arg => ['ok', 'funcall', arg]);

    return Far('root', {
      getFun() {
        return fun;
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'getFun', [], rp1));
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp1, false, kser(kslot('o+10', 'fun'))]],
  });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  const rp2 = 'p-2';
  await dispatch(makeMessage('o+10', undefined, ['arg!'], rp2));
  t.deepEqual(log.shift(), {
    type: 'resolve',
    resolutions: [[rp2, false, kser(['ok', 'funcall', 'arg!'])]],
  });
  t.deepEqual(log, []);
});

const longString =
  'This is a really really long string, longer even than you would normally use, long enough, in fact, to overflow our minimal max length';

test('capdata size limit on syscalls', async t => {
  const { log, syscall } = buildSyscall();

  function build(vatPowers) {
    const { D, VatData, exitVat, exitVatWithFailure } = vatPowers;
    const { makeScalarBigMapStore, defineKind } = VatData;
    const obj1 = Far('obj1', {});
    const obj2 = Far('obj2', {});
    const store = makeScalarBigMapStore('test');

    async function doFail(f) {
      try {
        await f();
        log.push('did not fail as expected');
      } catch (e) {
        log.push(`fail: ${e.message}`);
      }
    }

    return Far('root', {
      async sendTooManySlots(target) {
        await doFail(() => E(target).willFail(obj1, obj2));
      },
      async sendBodyTooBig(target) {
        await doFail(() => E(target).willFail(longString));
      },
      async resolveTooManySlots(target) {
        const pk = makePromiseKit();
        await E(target).takeThis(pk.promise);
        pk.resolve([obj1, obj2]);
      },
      async resolveBodyTooBig(target) {
        const pk = makePromiseKit();
        await E(target).takeThis(pk.promise);
        pk.resolve(longString);
      },
      returnTooManySlots() {
        return [obj1, obj2];
      },
      returnBodyTooBig() {
        return longString;
      },
      async callTooManySlots(dev) {
        await doFail(() => D(dev).willFail(obj1, obj2));
      },
      async callBodyTooBig(dev) {
        await doFail(() => D(dev).willFail(longString));
      },
      async voInitTooManySlots() {
        await doFail(() => {
          const maker = defineKind(
            'test',
            () => ({ x: harden([obj1, obj2]) }),
            {},
          );
          maker();
        });
      },
      async voInitBodyTooBig() {
        await doFail(() => {
          const maker = defineKind('test', () => ({ x: longString }), {});
          maker();
        });
      },
      async voSetTooManySlots() {
        await doFail(() => {
          const maker = defineKind('test', () => ({ x: 0 }), {
            setx: ({ state }, x) => {
              state.x = x;
            },
          });
          const vo = maker();
          vo.setx(harden([obj1, obj2]));
        });
      },
      async voSetBodyTooBig() {
        await doFail(() => {
          const maker = defineKind('test', () => ({ x: 0 }), {
            setx: ({ state }, x) => {
              state.x = x;
            },
          });
          const vo = maker();
          vo.setx(longString);
        });
      },
      async storeInitTooManySlots() {
        await doFail(() => store.init('key', harden([obj1, obj2])));
      },
      async storeInitBodyTooBig() {
        await doFail(() => store.init('key', longString));
      },
      async storeSetTooManySlots() {
        await doFail(() => store.set('key', harden([obj1, obj2])));
      },
      async storeSetBodyTooBig() {
        await doFail(() => store.set('key', longString));
      },
      exitVatTooManySlots() {
        exitVat([obj1, obj2]);
      },
      exitVatBodyTooBig() {
        exitVat(longString);
      },
      exitVatFailTooManySlots() {
        exitVatWithFailure([obj1, obj2]);
      },
      exitVatFailBodyTooBig() {
        exitVatWithFailure(longString);
      },
    });
  }
  const { dispatch, testHooks } = await makeDispatch(
    syscall,
    build,
    'vatA',
    {},
  );
  const { setSyscallCapdataLimits } = testHooks;
  setSyscallCapdataLimits(130, 1);

  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const target = 'o-1';
  const device = 'd-1';

  let rp;
  let rpCounter = 0;
  const nextRP = () => {
    rpCounter += 1;
    return `p-${rpCounter}`;
  };

  let parg;
  let resultp;
  let epCounter = 4;
  const nextEP = () => {
    epCounter += 1;
    return `p+${epCounter}`;
  };

  const send = op => dispatch(makeMessage(rootA, op, [kslot(target)], rp));
  const expectFail = () => t.is(log.shift(), 'fail: syscall capdata too large');
  const expectVoidReturn = () =>
    t.deepEqual(log.shift(), {
      type: 'resolve',
      resolutions: [[rp, false, kser(undefined)]],
    });
  const expectKindDef = kid =>
    t.deepEqual(log.shift(), {
      type: 'vatstoreSet',
      key: `vom.vkind.${kid}.descriptor`,
      value: `{"kindID":"${kid}","tag":"test"}`,
    });
  const expectStore = kid =>
    t.deepEqual(log.shift(), {
      type: 'vatstoreSet',
      key: `vom.o+v${kid}/1`,
      value: `{"x":{"body":"#0","slots":[]}}`,
    });

  rp = nextRP();
  await send('voInitTooManySlots');
  expectKindDef(10);
  expectFail();
  expectVoidReturn();
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  rp = nextRP();
  await send('voInitBodyTooBig');
  expectKindDef(13);
  expectFail();
  expectVoidReturn();
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  rp = nextRP();
  await send('voSetTooManySlots');
  expectKindDef(14);
  expectFail();
  expectVoidReturn();
  matchIDCounterSet(t, log);
  expectStore(14);
  t.deepEqual(log, []);

  rp = nextRP();
  await send('voSetBodyTooBig');
  expectKindDef(15);
  expectFail();
  expectVoidReturn();
  matchIDCounterSet(t, log);
  expectStore(15);
  t.deepEqual(log, []);

  const gotSchema = () => {
    const label = 'test';
    t.deepEqual(log.shift(), {
      type: 'vatstoreGet',
      key: 'vc.5.|schemata',
      result: JSON.stringify(kser({ label, keyShape: M.scalar() })),
    });
  };

  rp = nextRP();
  await send('storeInitTooManySlots');
  gotSchema();
  t.deepEqual(log.shift(), {
    type: 'vatstoreGet',
    key: 'vc.5.skey',
    result: undefined,
  });
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('storeInitBodyTooBig');
  gotSchema();
  t.deepEqual(log.shift(), {
    type: 'vatstoreGet',
    key: 'vc.5.skey',
    result: undefined,
  });
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('storeSetTooManySlots');
  gotSchema();
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('storeSetBodyTooBig');
  gotSchema();
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('sendTooManySlots');
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('sendBodyTooBig');
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await dispatch(makeMessage(rootA, 'callTooManySlots', [kslot(device)], rp));
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await dispatch(makeMessage(rootA, 'callBodyTooBig', [kslot(device)], rp));
  expectFail();
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  parg = nextEP();
  resultp = nextEP();
  await send('resolveTooManySlots');
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    methargs: kser(['takeThis', [kslot(parg)]]),
    resultSlot: resultp,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: resultp });
  matchIDCounterSet(t, log);
  await dispatch(makeResolve(resultp, kser(undefined)));
  let failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  parg = nextEP();
  resultp = nextEP();
  await send('resolveBodyTooBig');
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: target,
    methargs: kser(['takeThis', [kslot(parg)]]),
    resultSlot: resultp,
  });
  t.deepEqual(log.shift(), { type: 'subscribe', target: resultp });
  matchIDCounterSet(t, log);
  await dispatch(makeResolve(resultp, kser(undefined)));
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('returnTooManySlots');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  t.deepEqual(log, []);

  rp = nextRP();
  await send('returnBodyTooBig');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  t.deepEqual(log, []);

  rp = nextRP();
  await send('exitVatTooManySlots');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('exitVatBodyTooBig');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('exitVatFailTooManySlots');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
  t.deepEqual(log, []);

  rp = nextRP();
  await send('exitVatFailBodyTooBig');
  failure = log.shift();
  t.like(failure, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, failure.info, /syscall capdata too large/);
  expectVoidReturn();
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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {});
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  // root~.one() // sendOnly
  await dispatch(makeMessage(rootA, 'one', []));
  t.is(log.shift(), false);
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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';
  const import1 = 'o-1';

  // root~.one(import1) // sendOnly
  await dispatch(makeMessage(rootA, 'one', [kslot(import1)]));
  t.deepEqual(log.shift(), { type: 'dropImports', slots: [import1] });
  t.is(log.shift(), 'disavowed pres1');

  function loggedError(re) {
    const l = log.shift();
    t.truthy(l instanceof Error);
    t.truthy(re.test(l.message));
  }
  loggedError(/attempt to disavow unknown/);
  t.is(log.shift(), 'tried duplicate disavow');
  loggedError(/attempt to disavow unknown/);
  t.is(log.shift(), 'tried to disavow Promise');
  loggedError(/attempt to disavow an export/);
  t.is(log.shift(), 'tried to disavow export');
  const msg = log.shift();
  t.like(msg, {
    type: 'exit',
    isFailure: true,
  });
  expectError(t, msg.info, /this Presence has been disavowed/);
  t.deepEqual(log.shift(), Error('this Presence has been disavowed'));
  t.is(log.shift(), 'tried to send to disavowed');
  t.deepEqual(log, []);
});

test('buildVatNamespace not called until after startVat', async t => {
  const { syscall } = buildSyscall();
  const gcTools = makeMockGC();
  let buildCalled = false;

  function buildRootObject() {
    buildCalled = true;
    return Far('root', {});
  }

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject,
  }));
  t.falsy(buildCalled);
  await ls.dispatch(makeStartVat(kser()));
  t.truthy(buildCalled);
});

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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', [], rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: kslot(expectedPA) };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser(expectedResult1)]],
  });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  await dispatch(makeMessage(rootA, 'resolve', []));
  // this should resolve pkA.promise
  const l2 = log.shift();
  t.is(l2.type, 'resolve');
  t.is(l2.resolutions[0][0], expectedPA);
  t.deepEqual(l2.resolutions[0][2], kser('data'));
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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', [], rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA1 = 'p+5'; // pkA.promise first export
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser({ p: kslot(expectedPA1) })]],
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
    resolutions: [[expectedPA1, false, kser([kslot(expectedPB)])]],
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
      [expectedPB, false, kser([kslot(expectedPA2)])],
      [expectedPA2, false, kser([kslot(expectedPB)])],
    ],
  });
  matchIDCounterSet(t, log);
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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', [], rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: kslot(expectedPA) };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser(expectedResult1)]],
  });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  console.log('generating deliberate error');
  await dispatch(makeMessage(rootA, 'resolve', []));
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
  expectError(t, expectedError, /Remotables must be explicitly declared/);

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
  const { dispatch } = await makeDispatch(syscall, build, 'vatA', {
    enableDisavow: true,
  });
  log.length = 0; // assume pre-build vatstore operations are correct
  const rootA = 'o+0';

  const rp1 = 'p-1';
  await dispatch(makeMessage(rootA, 'export', [], rp1));
  const l1 = log.shift();
  t.is(l1.type, 'resolve');
  const expectedPA = 'p+5';
  const expectedResult1 = { p: kslot(expectedPA) };
  t.deepEqual(l1, {
    type: 'resolve',
    resolutions: [[rp1, false, kser(expectedResult1)]],
  });
  matchIDCounterSet(t, log);
  t.deepEqual(log, []);

  console.log('generating deliberate error');
  await dispatch(makeMessage(rootA, 'resolve', []));
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
  expectError(t, expectedError, /Remotables must be explicitly declared/);

  t.deepEqual(l2.resolutions[0], [expectedPA, true, expectedError]);
});

test('result promise in args', async t => {
  const { log, syscall } = buildSyscall();
  const vatlog = [];

  // A message whose arguments references its own result promise might
  // cause problems with translation ordering. Liveslots cannot
  // directly create these (the arguments are hardened by the
  // E().foo() proxy handler) before userspace is given the result
  // promise. But it must be able to handle an inbound message in this
  // shape.

  // For liveslots, this is basically the same as what we get if
  // msg1.args references a promise which later appears as
  // msg2.result, which could happen because msg2 was queued in a
  // kernel promise and fell behind msg1. And it is similar to
  // msg3.result appearing in a later msg4.args .

  // In both cases, liveslots currently handles this ok, but the
  // sequence is a bit weird. We'll document it here:

  // * when the promise is imported (in msg.args), we create a Promise
  //   object, register it in slotToVal/valToSlot, and hold the
  //   resolve / reject functions in importedVPIDs . Userspace sees
  //   this Promise. A `dispatch.notify` will resolve it. Any messages
  //   sent to it will be queued into the kernel, which will wait for
  //   a `syscall.resolve` and then send the messages to the resulting
  //   object's home vat.

  // * Each dispatch.deliver causes the creation of a `res` Promise
  //   for the result of the local delivery. If a new result= vpid was
  //   provided, we register `res` under `resultVPID` and use
  //   `res.then` to wait for it to resolve. If/when that happens,
  //   `followForKernel` does both a syscall.resolve() and removes it
  //   from `exportedVPIDs`.

  // * If dispatch.deliver was given an *existing* (importedVPIDs)
  //   resultVPID, we leave that old+imported promise registered as
  //   resultVPID, but we forward it to `res`. We then remove it from
  //   importedVPIDs and add it to exportedVPIDs. And we use a `.then`
  //   on the old promise and `followForKernel` to wait for it to
  //   resolve, which won't happen until `res` resolves.

  //  * As a result, any messages our userspace sends to the Promise
  //    will be forwarded(?) to 'res', and will be queued locally, and
  //    won't go to the kernel.

  // * Also, our vat will do both `syscall.subscribe` and
  //   `syscall.resolve` for the same vpid. The `resolve` will
  //   schedule a `dispatch.notify` to us, as a subscriber, however it
  //   will also retire the c-list entry, so the notify will be
  //   cancelled when it finally gets to the front of the queue. Which
  //   is good, because we won't recognize the vpid by that point.

  function build(_vatPowers) {
    return Far('root', {
      one(p, target) {
        // the promise we receive should have the same identity as our
        // result promise
        E(target).two(p);
        // we should be able to pipeline messages to it
        E(p).three();
        // we can subscribe to it, even though we're the decider
        p.then(res => vatlog.push(`res: ${res === target}`));
        // and we should be able to resolve it
        return target;
      },
    });
  }
  const { dispatch } = await makeDispatch(syscall, build);
  log.length = 0; // ignore pre-build vatstore operations
  const rootA = 'o+0';
  const target = 'o-1';
  const resP = 'p-1';

  await dispatch(
    makeMessage(
      rootA,
      'one',
      [kslot(resP), kslot(target, `presence ${target}`)],
      resP,
    ),
  );

  t.deepEqual(log.shift(), { type: 'subscribe', target: resP });
  const s2 = log.shift();
  t.is(s2.type, 'send');
  t.is(s2.targetSlot, target);
  t.deepEqual(s2.methargs, kser(['two', [kslot(resP)]]));
  t.is(log.shift().type, 'subscribe'); // result of two()

  // `three()` makes it out first
  const s3 = log.shift();
  t.is(s3.type, 'send');
  t.is(s3.targetSlot, target);
  t.deepEqual(s3.methargs, kser(['three', []]));
  const s4 = log.shift();
  t.is(s4.type, 'subscribe');
  t.is(s4.target, s3.resultSlot);

  const s5 = log.shift();
  t.is(s5.type, 'resolve');
  t.is(s5.resolutions.length, 1);
  const resdata = kser(kslot(target, `presence ${target}`));
  t.deepEqual(s5.resolutions[0], [resP, false, resdata]);

  // there is one more syscall.vatstoreSet(idCounters) that we ignore
  t.is(log.length, 1);

  t.deepEqual(vatlog, ['res: true']);
});
