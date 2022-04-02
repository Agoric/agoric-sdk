// import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@endo/init';

import bundleSource from '@endo/bundle-source';
// import { E } from '@endo/far';
// import { ZipReader } from '@endo/zip';
// import { decodeBase64, encodeBase64 } from '@endo/base64';
import { start } from './endoCAS.js';
import { installInPieces } from './runStake-deploy.js';

const testIt = async () => {
  const zcf = {
    getZoeService: () => ({
      install: _b => 'INSTALLATION!',
    }),
  };

  const { publicFacet } = start(zcf);

  const bundles = {
    // runStake: await bundleSource(pathResolve(CONTRACT_ROOTS.runStake)),
    endoCAS: await bundleSource('./endoCAS.js'),
  };

  const installation = await installInPieces(bundles.endoCAS, publicFacet);

  console.log({ installation });
};

testIt().catch(err => console.error(err));
