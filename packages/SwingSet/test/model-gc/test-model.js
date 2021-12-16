// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

test('check GC model', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-bootstrap.js', import.meta.url).pathname,
      },
      one: {
        sourceSpec: new URL('vat-one.js', import.meta.url).pathname,
      },
    },
  };
  const c = await buildVatController(config);
  await c.run(); // start kernel, send bootstrap message, wait until halt
  t.deepEqual(c.dump().log, ['message one', 'message two']);
});
