// @ts-nocheck
/* global FinalizationRegistry WeakRef */
import test from 'ava';

import { buildSyscall } from '../liveslots-helpers.js';
import { makeVirtualReferenceManager } from '../../src/virtualReferences.js';

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
    WeakRef,
    addToPossiblyDeadSet,
    addToPossiblyRetiredSet,
    false,
  );
  return { log, vrm };
}

function weakKeyCheck(t, log, vref) {
  // A weak key check looks for all DB keys that start with
  // `vom.ir.${vref}|`, which first does a
  // vatstoreGetNextKey(`vom.ir.${vref}|`), and would repeat with
  // subsequent keys if it finds any. But we don't add any references
  // here, so it always returns the next key beyond the prefix.
  const prefix = `vom.ir.${vref}|`;
  const e = log.shift();
  t.like(e, { type: 'vatstoreGetNextKey', priorKey: prefix });
  // assert that 'result' is either undefined or it does *not* start with 'prefix'
  const { result } = e;
  t.true(result === undefined || !result.startsWith(prefix), `ew:${result}`);
}

test('only enumerate virtual objects', t => {
  const { log, vrm } = makeVRM();

  // retiring a plain Remotable does a is-it-a-weak-key chck
  vrm.ceaseRecognition('o+4');
  weakKeyCheck(t, log, 'o+4');
  t.is(log.length, 0);

  // retiring a virtual object causes the facets to be enumerated and
  // checked, not the baseref
  vrm.registerKind('5');
  vrm.rememberFacetNames('5', ['facet0', 'facet1']);
  vrm.ceaseRecognition('o+v5/2');
  weakKeyCheck(t, log, 'o+v5/2:0');
  weakKeyCheck(t, log, 'o+v5/2:1');
  // skips 'vom.ir.o+v5/2|'
  t.is(log.length, 0);

  // retiring an import does the weak-key check, even though the ID
  // numerically collides with the virtual kind
  vrm.ceaseRecognition('o-5');
  weakKeyCheck(t, log, 'o-5');
  t.is(log.length, 0);
});
