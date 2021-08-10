// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
import '@agoric/install-ses';
import bundleSource from '@agoric/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import fs from 'fs';

const CONTRACT_FILES = ['atomicSwap'];

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
      new URL(`bundle-${contract}.js`, import.meta.url).pathname,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(() => console.log('contracts prepared'));
