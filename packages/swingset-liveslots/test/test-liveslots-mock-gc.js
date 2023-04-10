import test from 'ava';
import '@endo/init/debug.js';

import { Far } from '@endo/marshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { kslot, kser } from './kmarshal.js';
import { buildSyscall } from './liveslots-helpers.js';
import {
  makeMessage,
  makeStartVat,
  makeBringOutYourDead,
  makeResolve,
} from './util.js';
import { makeMockGC } from './mock-gc.js';

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

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, () => ({
    buildRootObject: build,
  }));
  const { dispatch, testHooks } = ls;
  const { possiblyDeadSet } = testHooks;
  await dispatch(makeStartVat(kser()));
  const allFRs = gcTools.getAllFRs();
  t.is(allFRs.length, 2);
  const FR = allFRs[0];

  const rootA = 'o+0';

  // immediate drop should push import to possiblyDeadSet after finalizer runs
  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-1')]));
  // the immediate gcTools.kill() means that the import should now be in the
  // "COLLECTED" state
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-1']));
  possiblyDeadSet.delete('o-1'); // pretend liveslots did syscall.dropImport

  // separate hold and free should do the same
  await dispatch(makeMessage(rootA, 'hold', [kslot('o-2')]));
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
  await dispatch(makeMessage(rootA, 'free', []));

  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);
  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-2']));
  possiblyDeadSet.delete('o-2'); // pretend liveslots did syscall.dropImport

  // re-introduction during COLLECTED should return to REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-3')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-3')]));
  // back to REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // stays at REACHABLE
  t.deepEqual(possiblyDeadSet, new Set());

  await dispatch(makeMessage(rootA, 'free', []));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-3']));
  possiblyDeadSet.delete('o-3'); // pretend liveslots did syscall.dropImport

  // multiple queued finalizers are idempotent, remains REACHABLE

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-4')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-4')]));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 2);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-4')]));
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

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-5')]));
  // now COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-5')]));
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

  await dispatch(makeMessage(rootA, 'ignore', [kslot('o-6')]));
  // moves to REACHABLE and then back to COLLECTED
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 1);

  FR.runOneCallback(); // moves to FINALIZED
  t.deepEqual(possiblyDeadSet, new Set(['o-6']));
  t.is(FR.countCallbacks(), 0);

  await dispatch(makeMessage(rootA, 'hold', [kslot('o-6')]));
  await dispatch(makeBringOutYourDead());
  // back to REACHABLE, removed from possiblyDeadSet
  t.deepEqual(possiblyDeadSet, new Set());
  t.is(FR.countCallbacks(), 0);
});

test('retention counters', async t => {
  const { syscall } = buildSyscall();
  let held;
  const gcTools = makeMockGC();

  function buildRootObject(_vatPowers) {
    const root = Far('root', {
      hold(imp) {
        held = imp;
      },
      exportRemotable() {
        return Far('exported', {});
      },
    });
    return root;
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch, testHooks } = ls;
  const { getRetentionStats } = testHooks;

  const rootA = 'o+0';
  const presenceVref = 'o-1';
  const promiseVref = 'p-1';
  const resultVref = 'p-2';

  await dispatch(makeStartVat(kser()));
  const count1 = await dispatch(makeBringOutYourDead());
  t.deepEqual(count1, getRetentionStats());
  t.is(count1.importedVPIDs, 0);
  t.is(count1.exportedRemotables, 1);
  t.is(count1.kernelRecognizableRemotables, 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot(presenceVref)]));
  t.truthy(held);

  const count2 = await dispatch(makeBringOutYourDead());
  t.is(count2.slotToVal, count1.slotToVal + 1);

  gcTools.kill(held);
  gcTools.flushAllFRs();
  const count3 = await dispatch(makeBringOutYourDead());
  t.is(count3.slotToVal, count2.slotToVal - 1);

  await dispatch(makeMessage(rootA, 'hold', [kslot(promiseVref)]));
  const count4 = await dispatch(makeBringOutYourDead());
  t.is(count4.slotToVal, count3.slotToVal + 1);
  t.is(count4.importedVPIDs, 1);

  await dispatch(makeResolve(promiseVref, kser(undefined)));
  const count5 = await dispatch(makeBringOutYourDead());
  t.is(count5.slotToVal, count4.slotToVal - 1);
  t.is(count5.importedVPIDs, 0);

  await dispatch(makeMessage(rootA, 'exportRemotable', [], resultVref));
  const count6 = await dispatch(makeBringOutYourDead());
  t.is(count6.exportedRemotables, 2);
  t.is(count6.kernelRecognizableRemotables, 2);
  t.is(count6.slotToVal, count5.slotToVal + 1);
});
