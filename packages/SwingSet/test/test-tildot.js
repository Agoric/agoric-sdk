/* global require */
import { test } from '../tools/prepare-test-env-ava';

import { buildVatController } from '../src/index';

test('vat code can use tildot', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./vat-tildot.js'),
      },
    },
  };
  const c = await buildVatController(config);
  t.teardown(c.shutdown);
  await c.step();
  // this also checks that vats get transformTildot, e.g. for a REPL
  t.deepEqual(c.dump().log, [
    'tildot',
    'HandledPromise.applyMethod(x, "foo", [y]);',
    'ok',
  ]);
});
