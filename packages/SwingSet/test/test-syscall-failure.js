import '@agoric/install-ses';
import test from 'ava';
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
  if (!beDynamic) {
    // sanity check that the state of the bad static vat is what we think it is
    t.is(
      storage.get('vat.names'),
      '["vatAdmin","comms","vattp","timer","bootstrap","badvatStatic"]',
    );
    t.is(storage.get('ko20.owner'), 'v6');
    t.is(Array.from(storage.getKeys('v6.', 'v6/')).length, 6);
    t.is(storage.get('vat.name.badvatStatic'), 'v6');
  }
  await controller.run();
  if (!beDynamic) {
    // verify that the bad static vat's state is gone (bad *dynamic* vat cleanup
    // is verified by other, more complicated tests)
    t.is(
      storage.get('vat.names'),
      '["vatAdmin","comms","vattp","timer","bootstrap"]',
    );
    t.is(storage.get('ko20.owner'), undefined);
    t.is(Array.from(storage.getKeys('v6.', 'v6/')).length, 0);
    t.is(storage.get('vat.name.badvatStatic'), undefined);
  }
  const log = controller.dump().log;
  t.deepEqual(log, [
    'bootstrap',
    'bootstrap done',
    'begood',
    'bebad',
    'pretendToBeAThing invoked from begood',
    'p1 reject clist violation: prepare to die',
    'p2 reject vat terminated',
    'p3 reject vat terminated',
  ]);
}

test('static vat syscall failure', async t => {
  await vatSyscallFailure(t, false);
});

test('dynamic vat syscall failure', async t => {
  await vatSyscallFailure(t, true);
});
