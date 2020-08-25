import { resolve } from 'path';

import { test } from 'tape-promise/tape';

import { locateWorkerBin } from '../src/locate';

test('locateWorkerBin', t => {
  const bin = locateWorkerBin({ resolve });
  t.ok(bin.startsWith('/'));
  t.ok(bin.endsWith('/xs-vat-worker'));
  t.end();
});
