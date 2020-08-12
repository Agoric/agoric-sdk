import test from 'ava';
import { rollup } from 'rollup/dist/rollup.es';
import * as acorn from 'acorn';
import eventualSend from '..';

test('SwingSet bug', async t => {
  try {
    const bundle = await rollup({
      input: require.resolve('../encouragementBotCommsWavyDot/bootstrap.js'),
      treeshake: false,
      external: [],
      acornInjectPlugins: [eventualSend(acorn)],
    });
   t.assert(bundle);
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});
