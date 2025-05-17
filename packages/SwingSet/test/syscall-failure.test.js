// @ts-nocheck
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController } from '../src/index.js';
import { enumeratePrefixedKeys } from '../src/kernel/state/storageHelper.js';

async function vatSyscallFailure(t, beDynamic) {
  const config = {
    bootstrap: 'bootstrap',
    bundles: {
      badvat: {
        sourceSpec: new URL('vat-syscall-failure.js', import.meta.url).pathname,
      },
    },
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: new URL('bootstrap-syscall-failure.js', import.meta.url)
          .pathname,
        parameters: {
          beDynamic,
        },
      },
      badvatStatic: {
        bundleName: 'badvat',
        creationOptions: { enableSetup: true },
      },
    },
  };
  const kernelStorage = initSwingStore().kernelStorage;
  const controller = await buildVatController(config, [], {
    kernelStorage,
  });
  t.teardown(controller.shutdown);
  const kvStore = kernelStorage.kvStore;
  const badVatID = kvStore.get('vat.name.badvatStatic');
  const badVatRootObject = kvStore.get(`${badVatID}.c.o+0`);
  if (!beDynamic) {
    // sanity check that the state of the bad static vat is what we think it is
    t.is(
      kvStore.get('vat.names'),
      '["bootstrap","vatAdmin","comms","vattp","timer","badvatStatic"]',
    );
    t.is(kvStore.get(`${badVatRootObject}.owner`), badVatID);
    t.true(
      Array.from(enumeratePrefixedKeys(kvStore, `${badVatID}.`)).length > 0,
    );
    t.is(kvStore.get('vat.name.badvatStatic'), badVatID);
  }
  await controller.run();
  if (!beDynamic) {
    // verify that the bad static vat's state is gone (bad *dynamic* vat cleanup
    // is verified by other, more complicated tests)
    t.is(
      kvStore.get('vat.names'),
      '["bootstrap","vatAdmin","comms","vattp","timer"]',
    );
    t.is(kvStore.get(`${badVatID}.owner`), undefined);
    t.is(Array.from(enumeratePrefixedKeys(kvStore, `${badVatID}.`)).length, 0);
    t.is(kvStore.get('vat.name.badvatStatic'), undefined);
  }
  const log = controller.dump().log;
  t.deepEqual(log, [
    'bootstrap',
    'bootstrap done',
    'begood',
    'bebad',
    'pretendToBeAThing invoked from begood',
    'p1 reject Error: vat terminated',
    'p2 reject Error: vat terminated',
    'p3 reject Error: vat terminated',
  ]);
}

test('static vat syscall failure', async t => {
  await vatSyscallFailure(t, false);
});

test('dynamic vat syscall failure', async t => {
  await vatSyscallFailure(t, true);
});
