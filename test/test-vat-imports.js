import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

async function requireNat(t, withSES) {
  const config = { bootstrapIndexJS: require.resolve('./vat-imports-1.js') };
  const c = await buildVatController(config, withSES, ['nat']);
  await c.step();
  t.deepEqual(c.dump().log, ['nat-1', '2']);
}

test('vat can require nat with SES', async t => {
  await requireNat(t, true);
  t.end();
});

test('vat can require nat without SES', async t => {
  await requireNat(t, false);
  t.end();
});

async function requireHarden(t, withSES) {
  const config = { bootstrapIndexJS: require.resolve('./vat-imports-1.js') };
  const c = await buildVatController(config, withSES, ['harden']);
  await c.step();
  t.deepEqual(c.dump().log, ['harden-1', 'true', 'true']);
}

test('vat can require harden with SES', async t => {
  await requireHarden(t, true);
  t.end();
});

test('vat can require harden without SES', async t => {
  await requireHarden(t, false);
  t.end();
});
