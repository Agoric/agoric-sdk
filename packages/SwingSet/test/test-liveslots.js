// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import { initSwingStore } from '@agoric/swing-store-simple';

import buildKernel from '../src/kernel/index';
import { makeLiveSlots } from '../src/kernel/liveSlots';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function makeEndowments() {
  return {
    setImmediate,
    hostStorage: initSwingStore().storage,
    runEndOfCrank: () => {},
  };
}

test('calls', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];
  let syscall;

  function setupBootstrap(syscallBootstrap, _state, _helpers) {
    syscall = syscallBootstrap;
    function deliver(facetID, method, args, result) {
      log.push(['deliver', facetID, method, args, result]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('bootstrap', setupBootstrap);

  function setup(syscallVat, state, helpers) {
    function build(E, _D) {
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
    return makeLiveSlots(syscallVat, state, build, helpers.vatID);
  }
  kernel.addGenesisVat('vat', setup);

  await kernel.start('bootstrap', `[]`);
  const bootstrapVatID = kernel.vatNameToID('bootstrap');
  const vatID = kernel.vatNameToID('vat');

  // cycle past the bootstrap() call
  await kernel.step();
  log.shift();
  t.deepEqual(kernel.dump().runQueue, []);

  const root = kernel.addImport(bootstrapVatID, kernel.addExport(vatID, 'o+0'));

  // root!one() // sendOnly
  syscall.send(root, 'one', capargs(['args']), undefined);

  await kernel.step();
  t.deepEqual(log.shift(), 'one');
  t.deepEqual(kernel.dump().runQueue, []);
  // console.log(kernel.dump().runQueue);

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.resolve('result')
  syscall.send(
    root,
    'two',
    capargs([{ '@qclass': 'slot', index: 0 }], ['p+1']),
    undefined,
  );
  await kernel.step();
  t.deepEqual(log.shift(), 'two true');

  syscall.fulfillToData('p+1', capargs('result'));
  await kernel.step();
  t.deepEqual(log.shift(), ['res', 'result']);

  // pr = makePromise()a
  // root!two(pr.promise)
  // pr.reject('rejection')

  syscall.send(
    root,
    'two',
    capargs([{ '@qclass': 'slot', index: 0 }], ['p+2']),
    undefined,
  );
  await kernel.step();
  t.deepEqual(log.shift(), 'two true');

  syscall.reject('p+2', capargs('rejection'));
  await kernel.step();
  t.deepEqual(log.shift(), ['rej', 'rejection']);

  // TODO: more calls, more slot types

  t.end();
});

test('liveslots pipelines to syscall.send', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  function setupA(syscallA, state, helpers) {
    function build(E, _D) {
      return harden({
        one(x) {
          const p1 = E(x).pipe1();
          const p2 = E(p1).pipe2();
          E(p2).pipe3();
          log.push('sent p1p2p3');
        },
      });
    }
    return makeLiveSlots(syscallA, state, build, helpers.vatID);
  }
  kernel.addGenesisVat('a', setupA);

  let syscall;
  function setupB(syscallB, _state, _helpers) {
    syscall = syscallB;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('b', setupB);

  await kernel.start(); // no bootstrap
  const a = kernel.vatNameToID('a');
  const b = kernel.vatNameToID('b');

  t.deepEqual(kernel.dump().runQueue, []);

  const root = kernel.addImport(b, kernel.addExport(a, 'o+0'));

  // root!one(x) // sendOnly
  syscall.send(
    root,
    'one',
    capargs([{ '@qclass': 'slot', index: 0 }], ['o+5']),
    undefined,
  );

  await kernel.step();
  // console.log(kernel.dump().runQueue);

  // calling one() should cause three syscall.send() calls to be made: one
  // for x!pipe1(), a second pipelined to the result promise of it, and a
  // third pipelined to the result of the second.

  // in the new design, three sends() mean three items on the runqueue, and
  // they'll be appended to kernel promise queues after they get to the front
  t.deepEqual(kernel.dump().runQueue.length, 3);

  t.end();
});

function endOfCrank() {
  return new Promise(resolve => setImmediate(() => resolve()));
}

test('liveslots pipeline/non-pipeline calls', async t => {
  const log = [];

  const syscall = {
    send(targetSlot, method, args, resultSlot) {
      log.push({ type: 'send', targetSlot, method, args, resultSlot });
    },
    subscribe(target) {
      log.push({ type: 'subscribe', target });
    },
  };
  function build(E, _D) {
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

  t.equal(log.length, 0);

  const rootA = 'o+0';
  const p1 = 'p-1';
  const o2 = 'o-2';
  const slot0arg = { '@qclass': 'slot', index: 0 };

  // function deliver(target, method, argsdata, result) {
  dispatch.deliver(rootA, 'one', capargs([slot0arg], [p1]));
  await endOfCrank();
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
  t.equal(log.length, 0);

  // now we tell it the promise has resolved, to object 'o2'
  // function notifyFulfillToPresence(promiseID, slot) {
  dispatch.notifyFulfillToPresence(p1, o2);
  await endOfCrank();
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
  t.equal(log.length, 0);

  // now call two(), which should send nonpipe3 to o2, not p1, since p1 has
  // been resolved
  dispatch.deliver(rootA, 'two', capargs([], []));
  await endOfCrank();
  t.deepEqual(log.shift(), {
    type: 'send',
    targetSlot: o2,
    method: 'nonpipe3',
    args: capargs([], []),
    resultSlot: 'p+7',
  });
  // and nonpipe3() wants a result
  t.deepEqual(log.shift(), { type: 'subscribe', target: 'p+7' });
  t.equal(log.length, 0);

  t.end();
});
