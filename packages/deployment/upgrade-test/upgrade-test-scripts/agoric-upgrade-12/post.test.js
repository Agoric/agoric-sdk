import test from 'ava';
import { getIncarnation } from '../lib/vat-status.js';

test(`verify Zoe vat incarnation`, async t => {
  const incarantion = await getIncarnation('zoe');
  t.is(incarantion, 1);
});
