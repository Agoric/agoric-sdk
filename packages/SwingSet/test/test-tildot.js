import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

test('vat code can use tildot', async t => {
  const config = { bootstrapIndexJS: require.resolve('./vat-tildot.js') };
  const c = await buildVatController(config, []);
  await c.step();
  // this also checks that vats get transformTildot, e.g. for a REPL
  t.deepEqual(c.dump().log, [
    'tildot',
    'HandledPromise.applyMethod(x, "foo", [y]);',
    'ok',
  ]);
  t.end();
});
