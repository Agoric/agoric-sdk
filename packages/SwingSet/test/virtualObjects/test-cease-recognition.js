/* global FinalizationRegistry */
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { buildSyscall, matchVatstoreGetAfter } from '../liveslots-helpers.js';
import { makeVirtualReferenceManager } from '../../src/liveslots/virtualReferences.js';

function makeVRM() {
  const { log, syscall } = buildSyscall();
  const getSlotForVal = undefined;
  const requiredValForSlot = undefined;
  const addToPossiblyDeadSet = undefined;
  const addToPossiblyRetiredSet = undefined;
  const vrm = makeVirtualReferenceManager(
    syscall,
    getSlotForVal,
    requiredValForSlot,
    FinalizationRegistry,
    addToPossiblyDeadSet,
    addToPossiblyRetiredSet,
    false,
  );
  return { log, vrm };
}

function weakKeyCheck(vref) {
  return matchVatstoreGetAfter('', vref, undefined, [undefined, undefined]);
}

test('only enumerate virtual objects', async t => {
  const { log, vrm } = makeVRM();

  // retiring a plain Remotable does a is-it-a-weak-key chck
  vrm.ceaseRecognition('o+4');
  t.deepEqual(log.shift(), weakKeyCheck('vom.ir.o+4|'));
  t.is(log.length, 0);

  // retiring a virtual object causes the facets to be enumerated and
  // checked, not the baseref
  vrm.registerKind('5');
  vrm.rememberFacetNames('5', ['facet0', 'facet1']);
  vrm.ceaseRecognition('o+5/2');
  t.deepEqual(log.shift(), weakKeyCheck('vom.ir.o+5/2:0|'));
  t.deepEqual(log.shift(), weakKeyCheck('vom.ir.o+5/2:1|'));
  // skips 'vom.ir.o+5/2|'
  t.is(log.length, 0);

  // retiring an import does the weak-key check, even though the ID
  // numerically collides with the virtual kind
  vrm.ceaseRecognition('o-5');
  t.deepEqual(log.shift(), weakKeyCheck('vom.ir.o-5|'));
  t.is(log.length, 0);
});
