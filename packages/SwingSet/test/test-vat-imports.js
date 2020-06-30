import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

async function requireHarden(t) {
  const config = { bootstrapIndexJS: require.resolve('./vat-imports-1.js') };
  const c = await buildVatController(config, ['harden']);
  await c.step();
  t.deepEqual(c.dump().log, ['harden-1', 'true', 'true']);
}

test('vat can require harden', async t => {
  await requireHarden(t);
  t.end();
});
