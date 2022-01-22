import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { buildVatController } from '../src/index.js';

test('top level syscalls fail', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-top-level-syscall.js', import.meta.url)
          .pathname,
        creationOptions: {
          virtualObjectCacheSize: 3,
        },
      },
    },
  };

  await t.throwsAsync(buildVatController(config, []), {
    message: 'syscall invoked prior to buildRootObject',
  });
});
