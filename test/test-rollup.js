import { test } from 'tape-promise/tape';
import { rollup } from 'rollup';
import infixBang from '..';

test('SwingSet bug', async t => {
  try {
    const bundle = await rollup({
      input: require.resolve('../encouragementBotCommsWavyDot/bootstrap.js'),
      treeshake: false,
      external: ['@agoric/evaluate', '@agoric/nat', '@agoric/harden'],
      acornInjectPlugins: [infixBang()],
    });
    t.ok(bundle);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
