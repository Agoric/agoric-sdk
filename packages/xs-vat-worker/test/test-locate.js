import { test } from 'tape-promise/tape';

import { xsWorkerBin } from '../src/locate';

test('locateWorkerBin', t => {
  t.ok(!xsWorkerBin || xsWorkerBin.endsWith('xs-vat-worker'));
  t.end();
});
