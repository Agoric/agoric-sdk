import test from 'ava';
import '@endo/init/debug.js';
import { queryVstorage } from '@agoric/synthetic-chain';

test('ymax is deployed and appears in vstorage instance', async t => {
  // Check if ymax is in vstorage
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const instance = JSON.parse(instanceRaw.value);

  const chainInfoPath = 'published.agoricNames.chain.axelar';
  const chainInfoRaw = await queryVstorage(chainInfoPath);
  const chainInfo = JSON.parse(chainInfoRaw.value);

  t.log(instancePath, instance);
  t.log(chainInfoPath, chainInfo);

  t.truthy(
    instance.values.some(v => {
      const parsedV = JSON.parse(v);
      const body = JSON.parse(parsedV.body.replace(/^#/, ''));
      return body.some(entry => entry[0] === 'ymax0');
    }),
    'ymax installation should exist in vstorage',
  );

  t.truthy(chainInfo, 'axelar chain info should exist in vstorage');
});
