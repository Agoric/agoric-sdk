import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import bundleSource from '@endo/bundle-source';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  {
    contractPath: 'auction/index',
    bundleName: 'secondPriceAuction',
  },
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
  'otcDesk',
];

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async settings => {
    let bundleName;
    let contractPath;
    if (typeof settings === 'string') {
      bundleName = settings;
      contractPath = settings;
    } else {
      ({ bundleName, contractPath } = settings);
    }
    const sourceUrl = await importMetaResolve(
      `@agoric/zoe/src/contracts/${contractPath}.js`,
      import.meta.url,
    );
    const sourcePath = new URL(sourceUrl).pathname;
    const bundle = await bundleSource(sourcePath);
    const obj = { bundle, bundleName };
    fs.writeFileSync(
      new URL(`bundle-${bundleName}.js`, import.meta.url).pathname,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(
  () => console.log('contracts prepared'),
  reason => console.error('failed to prepare contracts', reason),
);
