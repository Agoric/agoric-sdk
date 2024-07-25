// @ts-nocheck
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { makeDummySlogger } from '../src/kernel/slogger.js';
import makeKernelKeeper, {
  CURRENT_SCHEMA_VERSION,
} from '../src/kernel/state/kernelKeeper.js';

test(`clist reachability`, async t => {
  const slog = makeDummySlogger({});
  const kernelStorage = initSwingStore(null).kernelStorage;
  const k0 = makeKernelKeeper(kernelStorage, 'uninitialized');
  k0.createStartingKernelState({ defaultManagerType: 'local' });
  k0.setInitialized();
  k0.saveStats();

  const kk = makeKernelKeeper(kernelStorage, CURRENT_SCHEMA_VERSION, slog);
  kk.loadStats();

  const s = kk.kvStore;
  const vatID = kk.allocateUnusedVatID();
  const source = { bundleID: 'foo' };
  const options = { workerOptions: {}, reapDirtThreshold: {} };
  kk.createVatState(vatID, source, options);
  const vk = kk.provideVatKeeper(vatID);

  const ko1 = kk.addKernelObject('v1', 1);
  t.is(vk.mapKernelSlotToVatSlot(ko1), 'o-50');
  const ko2 = kk.addKernelObject('v1', 2);
  t.is(vk.mapKernelSlotToVatSlot(ko2), 'o-51');
  t.is(vk.mapKernelSlotToVatSlot(ko1), 'o-50');

  t.is(vk.mapVatSlotToKernelSlot('o+1'), 'ko20');
  t.is(vk.mapVatSlotToKernelSlot('o+2'), 'ko21');
  t.is(vk.mapVatSlotToKernelSlot('o+1'), 'ko20');

  t.is(s.get(`${vatID}.c.o+1`), `ko20`);
  t.is(s.get(`${vatID}.c.ko20`), 'R o+1');

  // newly allocated imports are marked as reachable
  t.is(s.get(`${vatID}.c.ko1`), 'R o-50');
  // now pretend that the vat drops its o-50 import: the syscall.dropImport
  // will cause the kernel to clear the reachability flag
  vk.clearReachableFlag(ko1);
  t.is(s.get(`${vatID}.c.ko1`), '_ o-50');
  // while dropped, the vat may not access the import
  t.throws(() => vk.mapVatSlotToKernelSlot('o-50'), {
    message: /vat tried to access unreachable import/,
  });

  // now the kernel sends a new message that references ko1, causing a
  // re-import
  vk.setReachableFlag(ko1);
  t.is(s.get(`${vatID}.c.ko1`), 'R o-50');
  // re-import without intervening dropImport is idempotent
  vk.setReachableFlag(ko1);
  t.is(s.get(`${vatID}.c.ko1`), 'R o-50');

  // test the same thing for exports
  t.is(s.get(`${vatID}.c.ko20`), 'R o+1');
  // kernel tells vat that kernel is dropping the export, clearing the
  // reachability flag
  vk.clearReachableFlag('ko20');
  t.is(s.get(`${vatID}.c.ko20`), '_ o+1');
  // while dropped, access by the kernel indicates a bug
  t.throws(() => vk.mapKernelSlotToVatSlot('ko20'), {
    message: /kernel sent unreachable export/,
  });

  // vat re-exports o+1
  vk.setReachableFlag('ko20');
  t.is(s.get(`${vatID}.c.ko20`), 'R o+1');
  // re-export without intervening dropExport is idempotent
  vk.setReachableFlag('ko20');
  t.is(s.get(`${vatID}.c.ko20`), 'R o+1');

  // test setReachable=false, used by handlers for GC operations like
  // syscall.dropImport to talk about an import without claiming it's
  // reachable or causing it to become reachable

  const ko3 = kk.addKernelObject('v1', 3);
  t.is(vk.mapKernelSlotToVatSlot(ko3), 'o-52');
  vk.clearReachableFlag(ko3);
  t.is(s.get(`${vatID}.c.ko3`), '_ o-52');
  t.throws(() => vk.mapVatSlotToKernelSlot('o-52'), {
    message: /vat tried to access unreachable import/,
  });
  t.is(vk.mapVatSlotToKernelSlot('o-52', { setReachable: false }), ko3);
  t.is(vk.mapKernelSlotToVatSlot(ko3, { setReachable: false }), 'o-52');
  t.is(s.get(`${vatID}.c.ko3`), '_ o-52');

  t.is(vk.mapVatSlotToKernelSlot('o+3'), 'ko22');
  vk.clearReachableFlag('ko22');
  t.is(s.get(`${vatID}.c.ko22`), '_ o+3');
  t.throws(() => vk.mapKernelSlotToVatSlot('ko22'), {
    message: /kernel sent unreachable export/,
  });
  t.is(vk.mapKernelSlotToVatSlot('ko22', { setReachable: false }), 'o+3');
  t.is(vk.mapVatSlotToKernelSlot('o+3', { setReachable: false }), 'ko22');
  t.is(s.get(`${vatID}.c.ko22`), '_ o+3');
});

test('getImporters', async t => {
  const slog = makeDummySlogger({});
  const kernelStorage = initSwingStore(null).kernelStorage;
  const k0 = makeKernelKeeper(kernelStorage, 'uninitialized');
  k0.createStartingKernelState({ defaultManagerType: 'local' });
  k0.setInitialized();
  k0.saveStats();

  const kk = makeKernelKeeper(kernelStorage, CURRENT_SCHEMA_VERSION, slog);
  kk.loadStats();

  kk.createStartingKernelState({ defaultManagerType: 'local' });
  const vatID1 = kk.allocateUnusedVatID();
  const source = { bundleID: 'foo' };
  const options = { workerOptions: {}, reapDirtThreshold: {} };
  kk.createVatState(vatID1, source, options);
  kk.addDynamicVatID(vatID1);
  const vk1 = kk.provideVatKeeper(vatID1);
  const vatID2 = kk.allocateUnusedVatID();
  kk.createVatState(vatID2, source, options);
  kk.addDynamicVatID(vatID2);
  const vk2 = kk.provideVatKeeper(vatID2);
  const vatID3 = kk.allocateUnusedVatID();
  kk.createVatState(vatID3, source, options);
  kk.addDynamicVatID(vatID3);
  const vk3 = kk.provideVatKeeper(vatID3);

  const kref = kk.addKernelObject('v1', 1);
  t.deepEqual(kk.getImporters(kref), []);

  const vref1 = vk1.mapKernelSlotToVatSlot(kref);
  t.deepEqual(kk.getImporters(kref), [vatID1]);

  // add 3 before 2 to check that the result is really sorted
  const vref3 = vk3.mapKernelSlotToVatSlot(kref);
  t.deepEqual(kk.getImporters(kref), [vatID1, vatID3]);

  const vref2 = vk2.mapKernelSlotToVatSlot(kref);
  t.deepEqual(kk.getImporters(kref), [vatID1, vatID2, vatID3]);

  vk3.deleteCListEntry(kref, vref3);
  t.deepEqual(kk.getImporters(kref), [vatID1, vatID2]);

  vk1.deleteCListEntry(kref, vref1);
  t.deepEqual(kk.getImporters(kref), [vatID2]);

  vk2.deleteCListEntry(kref, vref2);
  t.deepEqual(kk.getImporters(kref), []);
});
