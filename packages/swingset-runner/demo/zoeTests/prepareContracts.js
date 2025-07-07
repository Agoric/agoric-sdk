import '@endo/init/pre-bundle-source.js';
import '@endo/init';

import fs from 'node:fs';
import { createRequire } from 'node:module';

import bundleSource from '@endo/bundle-source';

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
const resolve = createRequire(import.meta.url).resolve;

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
    const sourceUrl = resolve(`@agoric/zoe/src/contracts/${contractPath}.js`);
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
