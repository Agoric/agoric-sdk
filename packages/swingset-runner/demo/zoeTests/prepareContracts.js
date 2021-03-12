/* global require __dirname */
import '@agoric/install-ses';
import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  {
    contractPath: 'auction/secondPriceAuction',
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
    const source = require.resolve(`@agoric/zoe/src/contracts/${contractPath}`);
    const bundle = await bundleSource(source);
    const obj = { bundle, bundleName };
    fs.writeFileSync(
      `${__dirname}/bundle-${bundleName}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(() => console.log('contracts prepared'));
