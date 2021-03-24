/* global require */
import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store-simple';
import { buildVatController } from '../src';

async function vatSyscallFailure(t, beDynamic) {
  const config = {
    bootstrap: 'bootstrap',
    bundles: {
      badvat: {
        sourceSpec: require.resolve('./vat-syscall-failure.js'),
      },
    },
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./bootstrap-syscall-failure.js'),
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
  const { storage } = initSwingStore();
  const controller = await buildVatController(config, [], {
    hostStorage: storage,
  });
  const badVatID = storage.get('vat.name.badvatStatic');
  const badVatRootObject = storage.get(`${badVatID}.c.o+0`);
  if (!beDynamic) {
    // sanity check that the state of the bad static vat is what we think it is
    t.is(
      storage.get('vat.names'),
      '["bootstrap","badvatStatic","vatAdmin","comms","vattp","timer"]',
    );
    t.is(storage.get(`${badVatRootObject}.owner`), badVatID);
    t.is(Array.from(storage.getKeys(`${badVatID}.`, `${badVatID}/`)).length, 8);
    t.is(storage.get('vat.name.badvatStatic'), badVatID);
  }
  await controller.run();
  if (!beDynamic) {
    // verify that the bad static vat's state is gone (bad *dynamic* vat cleanup
    // is verified by other, more complicated tests)
    t.is(
      storage.get('vat.names'),
      '["bootstrap","vatAdmin","comms","vattp","timer"]',
    );
    t.is(storage.get(`${badVatID}.owner`), undefined);
    t.is(Array.from(storage.getKeys(`${badVatID}.`, `${badVatID}/`)).length, 0);
    t.is(storage.get('vat.name.badvatStatic'), undefined);
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
