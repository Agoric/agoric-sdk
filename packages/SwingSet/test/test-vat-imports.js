import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

async function requireHarden(t, withSES) {
  const config = { bootstrapIndexJS: require.resolve('./vat-imports-1.js') };
  const c = await buildVatController(config, withSES, ['harden']);
  await c.step();
  t.deepEqual(c.dump().log, ['harden-1', 'true', 'true']);
}

test('vat can require harden with SES', async t => {
  try {
    await requireHarden(t, true);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

async function requireEvaluate(t, withSES) {
  const config = { bootstrapIndexJS: require.resolve('./vat-imports-1.js') };
  const c = await buildVatController(config, withSES, ['evaluate']);
  await c.step();
  t.deepEqual(c.dump().log, ['evaluate-1', '3', '4', '5']);
}

test('vat can require evaluate with SES', async t => {
  try {
    await requireEvaluate(t, true);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
