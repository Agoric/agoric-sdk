#!/usr/bin/env tsx
/** @file Fetch canonical chain info to generate the minimum needed for agoricNames */
import '@endo/init';
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
const chainNames = [
  'agoric',
  'celestia',
  'cosmoshub',
  'dydx',
  'juno',
  'neutron',
  'noble',
  'omniflixhub',
  'osmosis',
  'secretnetwork',
  'stargaze',
  'stride',
  'umee',
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
