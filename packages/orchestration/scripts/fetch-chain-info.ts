#!/usr/bin/env -S node --import ts-blank-space/register
/** @file Fetch canonical chain info to generate the minimum needed for agoricNames */
import { ChainRegistryClient } from '@chain-registry/client';
import fsp from 'node:fs/promises';
import prettier from 'prettier';
import { convertChainInfo } from '../src/utils/registry.js';

// XXX script assumes it's run from the package path
// XXX .json would be more apt; UNTIL https://github.com/endojs/endo/issues/2110
const outputFile = 'src/fetched-chain-info.js';

/**
 * Names for which to fetch info
 */
export const chainNames = [
  'agoric',
  'archway',
  'beezee',
  'carbon',
  'celestia',
  'coreum',
  'cosmoshub',
  'crescent',
  'doravota',
  'dydx',
  'dymension',
  'empowerchain',
  'evmos',
  'haqq',
  'injective',
  'juno',
  'kava',
  'kujira',
  'lava',
  'migaloo',
  'neutron',
  'nibiru',
  'noble',
  'nolus',
  'omniflixhub',
  'osmosis',
  'persistence',
  'planq',
  'provenance',
  'pryzm',
  'quicksilver',
  'secretnetwork',
  'sei',
  'shido',
  'sifchain',
  'stargaze',
  'stride',
  'terra2',
  'titan',
  'umee',
  'elys',
];

const client = new ChainRegistryClient({
  chainNames,
});

// chain info, assets and ibc data will be downloaded dynamically by invoking fetchUrls method
await client.fetchUrls();

const chainInfo = await convertChainInfo(client);

const record = JSON.stringify(chainInfo, null, 2);
const src = `/** @file Generated by fetch-chain-info.ts */\nexport default /** @type {const} } */ (${record});`;
const prettySrc = await prettier.format(src, {
  parser: 'babel', // 'typescript' fails to preserve parens for typecast
  singleQuote: true,
  trailingComma: 'all',
});
await fsp.writeFile(outputFile, prettySrc);
