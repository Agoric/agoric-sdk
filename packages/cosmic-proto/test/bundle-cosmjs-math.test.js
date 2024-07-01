// A test to verify that importing @cosmsjs/math into an ESM via bundleSource
// can see the exported Decimal constructor, which was at time of writing obscured
// by https://github.com/endojs/endo/pull/2330, temporarily mitigated by a patch.
// Placed here only because Agoric CLI depends on both bundleSource and CosmJS math.

import test from '@endo/ses-ava/prepare-endo.js';
import url from 'url';
import bundleSource from '@endo/bundle-source';
import { importBundle } from '@endo/import-bundle';

test('bundled @comjs/math exports Decimal', async t => {
  const entryPath = url.fileURLToPath(
    new URL('bundle-cosmjs-math.js', import.meta.url),
  );
  const bundle = await bundleSource(entryPath);
  const ns = await importBundle(bundle);
  t.not(ns.Decimal, undefined);
});
