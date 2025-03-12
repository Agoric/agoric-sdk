#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */

import '@endo/init';
import starshipChainInfo from '../starship-chain-info.js';
import { makeAssetInfo } from '../tools/asset-info.ts';

const main = () => {
  if (!starshipChainInfo) {
    throw new Error(
      'starshipChainInfo not found. run `./scripts/fetch-starship-chain-info.ts` first.',
    );
  }

  const assetInfo = makeAssetInfo(starshipChainInfo)
    .filter(
      ([_, { chainName, baseName }]) =>
        chainName === 'agoric' && baseName !== 'agoric',
    )
    .map(([denom, { baseDenom }]) => ({
      denom,
      issuerName: baseDenom.replace(/^u/, '').toUpperCase(),
      decimalPlaces: 6, // TODO do not assume 6
    }));

  // Directly output JSON string for proposal builder options
  process.stdout.write(JSON.stringify(assetInfo));
};

main();
