// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
// eslint-disable-next-line no-unused-vars
import evaluateExpr from '@agoric/evaluate'; // to get Promise.makeHandled
import buildKernel from '../src/kernel/index';
import { makeLiveSlots } from '../src/kernel/liveSlots';

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
  const resolverID = kernel.dump().runQueue[0].msg.kernelResolverID;
  const state = JSON.parse(kernel.getState());
  const kp = state.kernelPromises[resolverID];
  t.equal(kp.queue.length, 1);
  t.equal(kp.queue[0].method, 'pipe2');
  const resolverID2 = kp.queue[0].kernelResolverID;
  const kp2 = state.kernelPromises[resolverID2];
  t.equal(kp2.queue.length, 1);
  t.equal(kp2.queue[0].method, 'pipe3');

  // in the new design, three sends() mean three items on the runqueue, and
  // they'll be appended to kernel promise queues after they get to the front
  // t.deepEqual(kernel.dump().runQueue.length, 3);

  t.end();
});
