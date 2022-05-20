// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { provideHostStorage } from '../src/controller/hostStorage.js';
import { buildVatController } from '../src/index.js';

async function testTranscriptlessness(t, useTranscript) {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-transcript-maybe.js', import.meta.url)
          .pathname,
        creationOptions: {
          enableSetup: true,
          useTranscript,
        },
      },
    },
  };
  const hostStorage = provideHostStorage();
  const c1 = await buildVatController(config, [], {
    hostStorage,
  });
  await c1.run();
  t.deepEqual(c1.dump().log, ['ephemeralCounter=1 sturdyCounter=1']);

  const c2 = await buildVatController(config, [], {
    hostStorage,
  });
  c2.queueToVatRoot('bootstrap', 'go', [], 'panic');
  await c2.run();
  if (useTranscript) {
    t.deepEqual(c2.dump().log, [
      'ephemeralCounter=1 sturdyCounter=1',
      'ephemeralCounter=2 sturdyCounter=2',
    ]);
  } else {
    t.deepEqual(c2.dump().log, ['ephemeralCounter=1 sturdyCounter=2']);
  }
}

test('transcript on', async t => {
  await testTranscriptlessness(t, true);
});

test('transcript off', async t => {
  await testTranscriptlessness(t, false);
});
