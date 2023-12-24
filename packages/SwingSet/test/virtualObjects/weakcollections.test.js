// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { kser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

test('weakMap in vat', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-weakcollections-bootstrap.js', import.meta.url)
          .pathname,
      },
      alice: {
        sourceSpec: new URL('vat-weakcollections-alice.js', import.meta.url)
          .pathname,
        creationOptions: { managerType: 'local' },
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  const bootstrapResult = await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage, {});
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(bootstrapResult), kser('bootstrap done'));

  async function doSimple(method) {
    const r = c.queueToVatRoot('bootstrap', method, []);
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    return c.kpResolution(r);
  }

  const preGCResult = await doSimple('runProbes');
  t.deepEqual(preGCResult, kser('probes done'));
  t.deepEqual(nextLog(), [
    'probe of sample-object returns imported item #0',
    'probe of [object Promise] returns imported item #1',
    'probe of [object Alleged: remember-exp] returns mer',
    'probe of [object Alleged: holder-vo] returns mevo',
    'probe of [object Promise] returns mep',
    'probe of [object Alleged: forget-exp] returns fer',
    'probe of [object Alleged: holder-vo] returns fevo',
    'probe of [object Promise] returns fep',
  ]);
  await doSimple('betweenProbes');
  engineGC();
  const postGCResult = await doSimple('runProbes');
  t.deepEqual(postGCResult, kser('probes done'));
  t.deepEqual(nextLog(), [
    'probe of sample-object returns imported item #0',
    'probe of [object Promise] returns undefined',
    'probe of [object Alleged: remember-exp] returns mer',
    'probe of [object Alleged: holder-vo] returns mevo',
    'probe of [object Promise] returns mep',
    'probe of [object Alleged: forget-exp] returns fer',
    'probe of [object Alleged: holder-vo] returns fevo',
    'probe of [object Promise] returns fep',
  ]);
});
