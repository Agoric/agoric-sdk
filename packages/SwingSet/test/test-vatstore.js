// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { provideHostStorage } from '../src/hostStorage.js';
import { buildVatController } from '../src/index.js';
import { capargs } from './util.js';

test('vatstore', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-vatstore.js', import.meta.url).pathname,
        creationOptions: {
          enableVatstore: true,
        },
      },
    },
  };
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, [], {
    hostStorage,
  });
  c.pinVatRoot('bootstrap');

  function send(msg, ...args) {
    c.queueToVatRoot('bootstrap', msg, capargs(args));
  }

  send('get', 'zot');
  await c.run();
  send('store', 'zot', 'first zot');
  send('get', 'zot');
  send('get', 'foo');
  send('store', 'zot', 'second zot');
  send('store', 'foo', 'first foo');
  send('get', 'zot');
  send('delete', 'zot');
  send('get', 'foo');
  send('get', 'zot');
  await c.run();

  t.deepEqual(c.dump().log, [
    'get zot -> <undefined>',
    'store zot <- "first zot"',
    'get zot -> "first zot"',
    'get foo -> <undefined>',
    'store zot <- "second zot"',
    'store foo <- "first foo"',
    'get zot -> "second zot"',
    'delete zot',
    'get foo -> "first foo"',
    'get zot -> <undefined>',
  ]);
  for (const k of hostStorage.kvStore.getKeys('', '')) {
    if (k.endsWith('.foo')) {
      t.is(k, 'v1.vs.vvs.foo');
    }
  }
});
