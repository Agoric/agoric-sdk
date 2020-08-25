import { resolve } from 'path';

import test from 'ava';

import { locateWorkerBin } from '../src/locate';

test('locateWorkerBin', t => {
  const bin = locateWorkerBin({ resolve });
  t.truthy(bin.startsWith('/'));
  t.truthy(bin.endsWith('/xs-vat-worker'));
});
