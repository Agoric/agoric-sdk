import '@endo/init/pre-bundle-source.js';
import '@endo/init';

import fs from 'node:fs';
import { createRequire } from 'node:module';

import bundleSource from '@endo/bundle-source';

const CONTRACT_FILES = ['simpleExchange.js'];
const resolve = createRequire(import.meta.url).resolve;

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const contractUrl = resolve(`@agoric/zoe/src/contracts/${contract}`);
    const contractPath = new URL(contractUrl).pathname;
    const bundle = await bundleSource(contractPath);
    const obj = { bundle, contract };
    fs.writeFileSync(
      new URL(`bundle-${contract}`, import.meta.url).pathname,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(
  () => console.log('contracts prepared'),
  reason => console.error('Failed to generate contracts', reason),
);
