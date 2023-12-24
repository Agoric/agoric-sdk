import test from 'ava';

import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';

test('weakMap vref handling', t => {
  const log = [];
  const {
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    registerEntry,
    deleteEntry,
  } = makeFakeVirtualObjectManager({ log });

  function addCListEntry(slot, val) {
    registerEntry(slot, val);
  }

  function removeCListEntry(slot, val) {
    deleteEntry(slot, val);
  }

  const weakMap = new VirtualObjectAwareWeakMap();

  function checkMap(vref, label, useVRef) {
    const obj = {};
    addCListEntry(vref, obj);
    weakMap.set(obj, label);
    t.is(weakMap.get(obj), label);
    removeCListEntry(vref, obj);
    const obj2 = {};
    addCListEntry(vref, obj2);
    if (useVRef) {
      t.falsy(weakMap.has(obj));
      t.truthy(weakMap.has(obj2));
      t.is(weakMap.get(obj), undefined);
      t.is(weakMap.get(obj2), label);
    } else {
      t.truthy(weakMap.has(obj));
      t.falsy(weakMap.has(obj2));
      t.is(weakMap.get(obj), label);
      t.is(weakMap.get(obj2), undefined);
    }
  }

  checkMap('o-1', 'imported presence', true);
  checkMap('o+2', 'exported remotable', false);
  checkMap('o+v3/4', 'exported virtual object', true);
  checkMap('p-5', 'imported promise', false);
  checkMap('p+6', 'exported promise', false);
  checkMap('d-7', 'imported device', false);

  const weakSet = new VirtualObjectAwareWeakSet();

  function checkSet(vref, useVRef) {
    const obj = {};
    addCListEntry(vref, obj);
    weakSet.add(obj);
    t.truthy(weakSet.has(obj));
    removeCListEntry(vref, obj);
    const obj2 = {};
    addCListEntry(vref, obj2);
    if (useVRef) {
      t.falsy(weakSet.has(obj));
      t.truthy(weakSet.has(obj2));
    } else {
      t.truthy(weakSet.has(obj));
      t.falsy(weakSet.has(obj2));
    }
  }

  checkSet('o-8', true);
  checkSet('o+9', false);
  checkSet('o+v10/11', true);
  checkSet('p-12', false);
  checkSet('p+13', false);
  checkSet('d-14', false);
});
