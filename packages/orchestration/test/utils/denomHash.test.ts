import test from '@endo/ses-ava/prepare-endo.js';

import bundleSource from '@endo/bundle-source';
import { importBundle } from '@endo/import-bundle';
import { createRequire } from 'node:module';
import { denomHash } from '../../src/utils/denomHash.js';

const nodeRequire = createRequire(import.meta.url);

test('compartment use of denomHash', async t => {
  const bundle = await bundleSource(nodeRequire.resolve('./denomHashEx.js'));
  const { length } = JSON.stringify(bundle);
  t.log('bundle length', length);
  const expected = denomHash({ channelId: 'channel-0', denom: 'uatom' });

  const { denomHashExample } = await importBundle(bundle);
  t.deepEqual(denomHashExample(), expected);
});
