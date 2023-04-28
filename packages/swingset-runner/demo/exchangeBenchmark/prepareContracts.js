import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import fs from 'fs';

const CONTRACT_FILES = ['simpleExchange.js'];

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const contractUrl = await importMetaResolve(
      `@agoric/zoe/src/contracts/${contract}`,
      import.meta.url,
    );
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
