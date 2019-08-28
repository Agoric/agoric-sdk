// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
// eslint-disable-next-line no-unused-vars
import evaluateExpr from '@agoric/evaluate'; // to get Promise.makeHandled
import buildKernel from '../src/kernel/index';
import { makeLiveSlots } from '../src/kernel/liveSlots';

test('calls', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  let syscall;

  function setupBootstrap(syscallBootstrap, _state, _helpers) {
    syscall = syscallBootstrap;
    function deliver(facetID, method, argsString, slots, result) {
      log.push(['deliver', facetID, method, argsString, slots, result]);
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
          p.then(res => log.push(['res', res]), rej => log.push(['rej', rej]));
        },
      });
    }
    return makeLiveSlots(syscallVat, state, build, helpers.vatID);
  }
  kernel.addGenesisVat('vat', setup);

  await kernel.start('bootstrap', `[]`);
  // cycle past the bootstrap() call
  await kernel.step();
  log.shift();
  t.deepEqual(kernel.dump().runQueue, []);

  const root = kernel.addImport('bootstrap', kernel.addExport('vat', 'o+0'));

  // root!one() // sendOnly
  syscall.send(root, 'one', JSON.stringify({ args: [] }), [], undefined);

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
    JSON.stringify({ args: [{ '@qclass': 'slot', index: 0 }] }),
    ['p+1'],
    undefined,
  );
  await kernel.step();
  t.deepEqual(log.shift(), 'two true');

  syscall.fulfillToData('p+1', JSON.stringify('result'), []);
  await kernel.step();
  t.deepEqual(log.shift(), ['res', 'result']);

  // pr = makePromise()
  // root!two(pr.promise)
  // pr.reject('rejection')

  syscall.send(
    root,
    'two',
    JSON.stringify({ args: [{ '@qclass': 'slot', index: 0 }] }),
    ['p+2'],
    undefined,
  );
  await kernel.step();
  t.deepEqual(log.shift(), 'two true');

  syscall.reject('p+2', JSON.stringify('rejection'), []);
  await kernel.step();
  t.deepEqual(log.shift(), ['rej', 'rejection']);

  // TODO: more calls, more slot types

  t.end();
});

test('liveslots pipelines to syscall.send', async t => {
  const kernel = buildKernel({ setImmediate });
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
  t.deepEqual(kernel.dump().runQueue, []);

  const root = kernel.addImport('b', kernel.addExport('a', 'o+0'));

  // root!one(x) // sendOnly
  const arg0 = JSON.stringify({ args: [{ '@qclass': 'slot', index: 0 }] });
  syscall.send(root, 'one', arg0, ['o+5']);

  // calling one() should cause three syscall.send() calls to be made: one
  // for x!pipe1(), a second pipelined to the result promise of it, and a
  // third pipelined to the result of the second. With the current design,
  // the kernel ought to put the first onto the runQueue, and second onto the
  // kernel promise queue for the result of the first, and likewise the
  // third.
  await kernel.step();
  const { result } = kernel.dump().runQueue[0].msg;
  const state = JSON.parse(kernel.getState());
  const kp = state.kernelPromises[result];
  t.equal(kp.queue.length, 1);
  t.equal(kp.queue[0].method, 'pipe2');
  const result2 = kp.queue[0].result;
  const kp2 = state.kernelPromises[result2];
  t.equal(kp2.queue.length, 1);
  t.equal(kp2.queue[0].method, 'pipe3');

  // in the new design, three sends() mean three items on the runqueue, and
  // they'll be appended to kernel promise queues after they get to the front
  // t.deepEqual(kernel.dump().runQueue.length, 3);

  t.end();
});
