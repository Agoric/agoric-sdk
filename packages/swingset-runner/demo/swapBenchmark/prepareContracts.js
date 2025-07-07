import '@endo/init/pre-bundle-source.js';
import '@endo/init';

import fs from 'node:fs';
import { createRequire } from 'node:module';

import bundleSource from '@endo/bundle-source';

const CONTRACT_FILES = ['atomicSwap.js'];
const resolve = createRequire(import.meta.url).resolve;

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const contractPath = resolve(`@agoric/zoe/src/contracts/${contract}`);
    const bundle = await bundleSource(contractPath);
    const obj = { bundle, contract };
    fs.writeFileSync(
      new URL(`bundle-${contract}.js`, import.meta.url).pathname,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(
  () => console.log('contracts prepared'),
  reason => console.error('failed to prepare contracts', reason),
);
