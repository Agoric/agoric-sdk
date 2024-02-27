// @ts-check
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

  // @ts-expect-error fake Zoe
  const bundler = E(publicFacet).makeBundler({ zoe });

  const installation = await installInPieces(endoPieces, bundler, {
    log: t.log,
    maxBytesInFlight: 200_000,
    persist: true,
  });

  t.is(installation, 'INSTALLATION!');
  t.deepEqual(installedBundle, endoPieces);

  // preload from persisted entries
  installedBundle = undefined;
  const logged = [];
  const install2 = await installInPieces(endoPieces, bundler, {
    log: (...args) => {
      logged.push(`${args[0]}`);
      t.log(...args);
    },
    maxBytesInFlight: 200_000,
  });
  t.is(install2, 'INSTALLATION!');
  const cacheMiss = logged.filter(s => s.match(/adding/));
  t.is(cacheMiss.length, 0);
  t.deepEqual(installedBundle, endoPieces);
});
