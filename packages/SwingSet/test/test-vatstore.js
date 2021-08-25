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

  for (const k of hostStorage.kvStore.getKeys('', '')) {
    if (k.endsWith('.foo')) {
      t.is(k, 'v1.vs.vvs.foo');
    }
  }

  send('store', 'x.1', 'one');
  send('store', 'x.2', 'two');
  send('store', 'x.3', 'three');
  send('store', 'x.a', 'four');
  send('store', 'x.qrz', 'five');
  send('store', 'xxx', 'not this');
  send('store', 'y.1', 'oney');
  send('store', 'y.2', 'twoy');
  send('store', 'y.3', 'threey');
  send('store', 'y.a', 'foury');
  send('store', 'y.b', 'fivey');
  send('store', 'y.c', 'sixy');
  send('store', 'y.d', 'seveny');
  send('store', 'yyy', 'not thisy');
  // check that we hit all the 'x.' keys
  send('scan', 'x.');
  // check that this works even if the iteration is interrupted
  send('scan', 'x.', 3);
  // check that interleaved iterations don't interfere
  send('scanInterleaved', 'x.', 'y.');
  // check for a successful empty iteration if there's no match
  send('scan', 'z.');
  // exercise various calls with malformed parameters
  send('apiAbuse', 'x.');
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
    'store x.1 <- "one"',
    'store x.2 <- "two"',
    'store x.3 <- "three"',
    'store x.a <- "four"',
    'store x.qrz <- "five"',
    'store xxx <- "not this"',
    'store y.1 <- "oney"',
    'store y.2 <- "twoy"',
    'store y.3 <- "threey"',
    'store y.a <- "foury"',
    'store y.b <- "fivey"',
    'store y.c <- "sixy"',
    'store y.d <- "seveny"',
    'store yyy <- "not thisy"',
    'scan x.:',
    '    x.1 -> one',
    '    x.2 -> two',
    '    x.3 -> three',
    '    x.a -> four',
    '    x.qrz -> five',
    'scan x. 3:',
    '    x.1 -> one',
    '    x.2 -> two',
    '    x.3 -> three',
    '    interrupting...',
    '    x.a -> four',
    '    x.qrz -> five',
    'scanInterleaved x. y.:',
    '    1: x.1 -> one',
    '    2: y.1 -> oney',
    '    1: x.2 -> two',
    '    2: y.2 -> twoy',
    '    1: x.3 -> three',
    '    2: y.3 -> threey',
    '    1: x.a -> four',
    '    2: y.a -> foury',
    '    1: x.qrz -> five',
    '    2: y.b -> fivey',
    '    2: y.c -> sixy',
    '    2: y.d -> seveny',
    'scan z.:',
    'apiAbuse x.: use prefix as prior key (should work)',
    '  x.1 -> one',
    'apiAbuse x.: use out of range prior key aaax.',
    '  getAfter(x., aaax.) threw Error: priorKey must start with keyPrefix',
    'apiAbuse x.: use invalid key prefix',
    '  getAfter("ab@%%$#", "") threw Error: invalid vatstore key',
  ]);
});
