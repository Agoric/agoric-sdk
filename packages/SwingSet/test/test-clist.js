import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import { initSimpleSwingStore } from '@agoric/swing-store-simple';
import { makeDummySlogger } from '../src/kernel/slogger';
import makeKernelKeeper from '../src/kernel/state/kernelKeeper';
import { wrapStorage } from '../src/kernel/state/storageWrapper';

test(`clist reachability`, async t => {
  const slog = makeDummySlogger({});
  const hostStorage = initSimpleSwingStore();
  const { enhancedCrankBuffer: s } = wrapStorage(hostStorage.kvStore);

  const kk = makeKernelKeeper(s, hostStorage.streamStore, slog);
  kk.createStartingKernelState('local');
  const vatID = kk.allocateUnusedVatID();
  const vk = kk.allocateVatKeeper(vatID);

  t.is(vk.mapKernelSlotToVatSlot('ko1'), 'o-50');
  t.is(vk.mapKernelSlotToVatSlot('ko2'), 'o-51');
  t.is(vk.mapKernelSlotToVatSlot('ko1'), 'o-50');

  t.is(vk.mapVatSlotToKernelSlot('o+1'), 'ko20');
  t.is(vk.mapVatSlotToKernelSlot('o+2'), 'ko21');
  t.is(vk.mapVatSlotToKernelSlot('o+1'), 'ko20');

  t.is(s.get(`${vatID}.c.o+1`), `ko20`);
  t.is(s.get(`${vatID}.c.ko20`), 'R o+1');

  // newly allocated imports are marked as reachable
  t.is(s.get(`${vatID}.c.ko1`), 'R o-50');
  // now pretend that the vat drops its o-50 import: the syscall.dropImport
  // will cause the kernel to clear the reachability flag
  vk.clearReachableFlag('ko1');
  t.is(s.get(`${vatID}.c.ko1`), '_ o-50');
  // while dropped, the vat may not access the import
  t.throws(() => vk.mapVatSlotToKernelSlot('o-50'), {
    message: /vat tried to access unreachable import/,
  });

  // now the kernel sends a new message that references ko1, causing a
  // re-import
  vk.setReachableFlag('ko1');
  t.is(s.get(`${vatID}.c.ko1`), 'R o-50');
  // re-import without intervening dropImport is idempotent
  vk.setReachableFlag('ko1');
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

  t.is(vk.mapKernelSlotToVatSlot('ko3'), 'o-52');
  vk.clearReachableFlag('ko3');
  t.is(s.get(`${vatID}.c.ko3`), '_ o-52');
  t.throws(() => vk.mapVatSlotToKernelSlot('o-52'), {
    message: /vat tried to access unreachable import/,
  });
  t.is(vk.mapVatSlotToKernelSlot('o-52', false), 'ko3');
  t.is(vk.mapKernelSlotToVatSlot('ko3', false), 'o-52');
  t.is(s.get(`${vatID}.c.ko3`), '_ o-52');

  t.is(vk.mapVatSlotToKernelSlot('o+3'), 'ko22');
  vk.clearReachableFlag('ko22');
  t.is(s.get(`${vatID}.c.ko22`), '_ o+3');
  t.throws(() => vk.mapKernelSlotToVatSlot('ko22'), {
    message: /kernel sent unreachable export/,
  });
  t.is(vk.mapKernelSlotToVatSlot('ko22', false), 'o+3');
  t.is(vk.mapVatSlotToKernelSlot('o+3', false), 'ko22');
  t.is(s.get(`${vatID}.c.ko22`), '_ o+3');
});
