// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

/*
cd packages/SwingSet && yarn test --verbose test/model-gc/test-mode.js
*/

test('check GC model', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-bootstrap.js', import.meta.url).pathname,
        parameters: { "hello": "world" }
      },
      one: {
        sourceSpec: new URL('vat-one.js', import.meta.url).pathname,
        parameters: { "hello": "world" }
      },
    },
  };
  const c = await buildVatController(config, [{
    "foo!": "bar!"
  }]);
  await c.run(); // start kernel, send bootstrap message, wait until halt
  const log = c.dump().log
  t.deepEqual(log, ['message one', 'message two']);
});
