import test from 'ava';
import { evalBundles, getIncarnation } from '@agoric/synthetic-chain';

test('Core-eval should pass after genesis test', async t => {
  const dir = 'upgrade-mintHolder';

  const incarnationBefore = await getIncarnation('BLD');

  await evalBundles(dir);

  const incarnationAfter = await getIncarnation('BLD');

  t.is(
    incarnationAfter,
    incarnationBefore + 1,
    'BLD vat incarnation should increase by 1',
  );
});
