import bundleSource from '@endo/bundle-source';
import '@endo/init/debug.js';
import test from 'ava';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

test('test', async t => {
  const bundle = await bundleSource(nodeRequire.resolve('./incontract.js'));
  t.fail('todo');
});
