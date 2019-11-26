import { test } from 'tape-promise/tape';
import { rollup } from 'rollup/dist/rollup.es';
import * as acorn from 'acorn';
import eventualSend from '..';

test('SwingSet bug', async t => {
  try {
    const bundle = await rollup({
      input: require.resolve('../encouragementBotCommsWavyDot/bootstrap.js'),
      treeshake: false,
      external: ['@agoric/evaluate', '@agoric/nat', '@agoric/harden'],
      acornInjectPlugins: [eventualSend(acorn)],
    });
    t.ok(bundle);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
