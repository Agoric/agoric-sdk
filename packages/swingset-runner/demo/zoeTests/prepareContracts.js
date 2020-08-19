import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  'secondPriceAuction',
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
];

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const contractPath = require.resolve(
      `@agoric/zoe/src/contracts/${contract}`,
    );
    const bundle = await bundleSource(contractPath);
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(() => console.log('contracts prepared'));
