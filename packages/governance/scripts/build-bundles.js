#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [
  ['../src/contractGovernor.js', '../bundles/bundle-contractGovernor.js'],
  ['../src/committee.js', '../bundles/bundle-committee.js'],
  ['../src/noActionElectorate.js', '../bundles/bundle-noActionElectorate.js'],
  ['../src/binaryVoteCounter.js', '../bundles/bundle-binaryVoteCounter.js'],
];

await createBundles(sourceToBundle, dirname);
