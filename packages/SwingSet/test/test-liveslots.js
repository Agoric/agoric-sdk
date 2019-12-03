// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
// eslint-disable-next-line no-unused-vars
import { buildStorageInMemory } from '../src/hostStorage';
import buildKernel from '../src/kernel/index';
import { makeLiveSlots } from '../src/kernel/liveSlots';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function makeEndowments() {
  return { setImmediate, hostStorage: buildStorageInMemory().storage };
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
    function build(_E, _D) {
      return harden({
        one() {
          log.push('one');
        },
        two(p) {
          log.push(`two ${Promise.resolve(p) === p}`);
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
