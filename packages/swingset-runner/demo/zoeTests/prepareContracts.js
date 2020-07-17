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

const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const { source, moduleFormat } = await bundleSource(
      `${__dirname}/../../../zoe/src/contracts/${contract}`,
    );
    const obj = { source, moduleFormat, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

generateBundlesP.then(() => console.log('contracts prepared'));
