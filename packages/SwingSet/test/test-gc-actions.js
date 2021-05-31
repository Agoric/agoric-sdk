// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import { processNextGCAction } from '../src/kernel/gc-actions';

test('gc actions', t => {
  let rc = {};
  let actions = [];
  let newActions;
  let msg;
  function setActions(a) {
    actions = a;
    newActions = Array.from(a);
  }
  const kernelKeeper = {
    getGCActions() {
      return new Set(actions);
    },
    setGCActions(a) {
      newActions = Array.from(a);
      newActions.sort();
    },
    ownerOfKernelObject(kref) {
      return rc[kref] ? 'vatX' : undefined;
    },
    getObjectRefCount(kref) {
      const [reachable, recognizable] = rc[kref];
      return { reachable, recognizable };
    },
  };
  function process() {
    return processNextGCAction(kernelKeeper);
  }

  function make(type, vatID, ...krefs) {
    return { type, vatID, krefs };
  }

  // idle
  setActions([]);
  rc = {};
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // fully dropped. the dropExport takes priority
  setActions(['v1 dropExport ko1', 'v1 retireExport ko1']);
  rc = { ko1: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireExport ko1']);
  // then the retireExport
  setActions(['v1 retireExport ko1']);
  rc = { ko1: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('retireExports', 'v1', 'ko1'));
  t.deepEqual(newActions, []);

  // fully dropped, then fully re-reachable before dropExports: both negated
  setActions(['v1 dropExport ko1', 'v1 retireExport ko1']);
  rc = { ko1: [1, 1] }; // re-exported, still reachable+recognizable
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // fully dropped, dropExport happens, then fully re-reachable: retire negated
  setActions(['v1 dropExport ko1', 'v1 retireExport ko1']);
  rc = { ko1: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireExport ko1']);
  setActions(['v1 retireExport ko1']);
  rc = { ko1: [1, 1] };
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // fully dropped, re-reachable, partial drop, then dropExport
  rc = { ko1: [0, 0] };
  setActions(['v1 dropExport ko1', 'v1 retireExport ko1']);
  rc = { ko1: [1, 1] };
  rc = { ko1: [0, 1] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireExport ko1']);
  // the retire is left pending because we ignore lower-prority types
  setActions(['v1 retireExport ko1']);
  rc = { ko1: [0, 1] };
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // fully dropped, dropExports happens, re-reachable, partial drop: retire
  // negated
  setActions(['v1 dropExport ko1', 'v1 retireExport ko1']);
  rc = { ko1: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireExport ko1']);
  setActions(['v1 retireExport ko1']);
  rc = { ko1: [0, 1] };
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // partially dropped: recognizable but not reachable
  setActions(['v1 dropExport ko1']);
  rc = { ko1: [0, 1] }; // recognizable, not reachable
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, []);

  // partially dropped, re-reachable: negate dropExports
  setActions(['v1 dropExport ko1']);
  rc = { ko1: [1, 1] };
  msg = process();
  t.deepEqual(msg, undefined);
  t.deepEqual(newActions, []);

  // priority order: retireImports is last
  setActions(['v1 dropExport ko1', 'v1 retireImport ko2']);
  rc = { ko1: [0, 0], ko2: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireImport ko2']);

  setActions(['v1 retireExport ko1', 'v1 retireImport ko2']);
  rc = { ko1: [0, 0], ko2: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('retireExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v1 retireImport ko2']);

  setActions(['v1 retireImport ko2']);
  rc = { ko1: [0, 0], ko2: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('retireImports', 'v1', 'ko2'));
  t.deepEqual(newActions, []);

  // multiple vats: process in sorted order
  setActions(['v1 dropExport ko1', 'v2 dropExport ko2']);
  rc = { ko1: [0, 0], ko2: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('dropExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v2 dropExport ko2']);

  // multiple vats: vatID is major sort order, type is minor
  setActions(['v1 retireExport ko1', 'v2 dropExport ko2']);
  rc = { ko1: [0, 0], ko2: [0, 0] };
  msg = process();
  t.deepEqual(msg, make('retireExports', 'v1', 'ko1'));
  t.deepEqual(newActions, ['v2 dropExport ko2']);
});
