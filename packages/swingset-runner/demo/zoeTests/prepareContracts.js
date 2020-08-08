import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  'publicAuction',
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
];

const generateBundlesE = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const bundle = await bundleSource(
      `${__dirname}/../../../zoe/src/contracts/${contract}`,
    );
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesE.then(() => console.log('contracts prepared'));
