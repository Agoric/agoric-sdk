import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { E } from '@endo/far';

import url from 'url';

import { start } from '../../src/endo-pieces-contract.js';
import { installInPieces } from '../../src/installInPieces.js';

test('installInPieces', async t => {
  const { publicFacet } = start();

  // We have our own contract available, so use it for testing.
  const endoPieces = await bundleSource(
    url.fileURLToPath(
      new URL('../../src/endo-pieces-contract.js', import.meta.url),
    ),
  );

  let installedBundle;
  const zoe = {
    install: b => {
      installedBundle = b;
      return 'INSTALLATION!';
    },
  };

  const bundler = E(publicFacet).makeBundler({ zoe });

  const installation = await installInPieces(endoPieces, bundler, {
    log: t.log,
    maxBytesInFlight: 200_000,
  });

  t.is(installation, 'INSTALLATION!');
  t.deepEqual(installedBundle, endoPieces);
});
