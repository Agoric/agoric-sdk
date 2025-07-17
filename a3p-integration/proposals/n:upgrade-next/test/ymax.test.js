import test from 'ava';
import '@endo/init/debug.js';

// import { getVatDetails } from '@agoric/synthetic-chain';
import { queryVstorageFormatted } from './agoric-tools.js';

test('ymax is installed and appears in vstorage', async t => {
  // Check if ymax is in vstorage
  const instancePath = 'published.agoricNames.instance';
  const instance = await queryVstorageFormatted(instancePath);

  const chainInfoPath = 'published.agoricNames.chain.axelar';
  const chainInfo = await queryVstorageFormatted(chainInfoPath);

  // test chain info for noble aogric and axelar

  // test if ymax gets installed
  console.log('YMAX instance:', instance);
  console.log('YMAX axelar chain info:', chainInfo);

  t.truthy(instance, 'ymax installation should exist in vstorage');
});
