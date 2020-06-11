import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

test('vat code can use tildot', async t => {
  const config = { bootstrapIndexJS: require.resolve('./vat-tildot.js') };
  const c = await buildVatController(config, true, []);
  await c.step();
  t.deepEqual(c.dump().log, ['tildot', 'ok']);
  t.end();
});

