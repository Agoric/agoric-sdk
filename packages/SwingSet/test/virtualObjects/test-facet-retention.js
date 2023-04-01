import '@endo/init/debug.js';
import test from 'ava';
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController } from '../../src/index.js';

import { kser } from '../../src/lib/kmarshal.js';

// Check that facets which don't reference their state still keep their cohort alive

async function orphanTest(t, mode) {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    vats: {
      bob: {
        sourceSpec: new URL('vat-orphan-bob.js', import.meta.url).pathname,
        creationOptions: {
          virtualObjectCacheSize: 0,
        },
      },
      bootstrap: {
        sourceSpec: new URL('vat-orphan-bootstrap.js', import.meta.url)
          .pathname,
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;

  const c = await buildVatController(config, [mode], { kernelStorage });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), kser(undefined));
  t.deepEqual(c.dump().log, ['compare old === new : true']);
}

test('strongly held facet retains representative', async t => {
  await orphanTest(t, 'facet');
});

test('weakly held facet retains representative', async t => {
  await orphanTest(t, 'wfacet');
});

test('strongly held empty facet retains representative', async t => {
  await orphanTest(t, 'empty');
});

test('weakly held empty facet retains representative', async t => {
  await orphanTest(t, 'wempty');
});

test('strongly held method retains representative', async t => {
  await orphanTest(t, 'method');
});

test('weakly held method retains representative', async t => {
  await orphanTest(t, 'wmethod');
});

test('strongly held proto retains representative', async t => {
  await orphanTest(t, 'proto');
});

test('weakly held proto retains representative', async t => {
  await orphanTest(t, 'wproto');
});

test('strongly held cohort retains representative', async t => {
  await orphanTest(t, 'cohort');
});

test('weakly held cohort retains representative', async t => {
  await orphanTest(t, 'wcohort');
});

test('strongly held state retains representative', async t => {
  await orphanTest(t, 'state');
});

test('weakly held state retains representative', async t => {
  await orphanTest(t, 'wstate');
});
