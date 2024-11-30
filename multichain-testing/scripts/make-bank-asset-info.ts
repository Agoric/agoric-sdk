#!/usr/bin/env tsx
/* eslint-env node */

import '@endo/init';
import starshipChainInfo from '../starship-chain-info.js';
import { makeAssetInfo } from '../tools/asset-info.ts';

const main = () => {
  if (!starshipChainInfo) {
    throw new Error(
      'starshipChainInfo not found. run `make override-chain-registry` or `node_modules/.bin/tsx scripts/fetch-starship-chain-info.ts` first.',
    );
  }

  const assetInfo = makeAssetInfo(starshipChainInfo)
    .filter(
      ([_, { chainName, baseName }]) =>
        chainName === 'agoric' && baseName !== 'agoric',
    )
    .map(([denom, { baseDenom }]) => ({
      denom,
      keyword: baseDenom.replace(/^u/, '').toUpperCase(),
      decimalPlaces: 6, // TODO do not assume 6
    }));

  // Directly output JSON string for proposal builder options
  process.stdout.write(JSON.stringify(assetInfo));
};

main();
