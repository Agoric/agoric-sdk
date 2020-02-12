import path from 'path';
import url from 'url';
import test from 'tape';
import rollupNS from 'rollup';
const { rollup } = rollupNS;
import acorn from 'acorn';
import eventualSend from '../index.js';

function resolvePath(what) {
  const filename = url.fileURLToPath(import.meta.url);
  const dirname = path.dirname(filename);
  return path.resolve(dirname, what);
}

test('SwingSet bug', async t => {
  try {
    const bundle = await rollup({
      input: resolvePath('../encouragementBotCommsWavyDot/bootstrap.js'),
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
