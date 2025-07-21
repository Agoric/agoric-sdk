// @ts-check
import test from 'ava';
import '@endo/init/debug.js';
import { queryVstorage } from '@agoric/synthetic-chain';

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

test('ymax deployed incompletely', async t => {
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const instance = Object.fromEntries(
    getCapDataStructure(getCellValues(instanceRaw).at(-1)).structure,
  );

  const chainInfoPath = 'published.agoricNames.chain.axelar';
  const chainInfoRaw = await queryVstorage(chainInfoPath);
  const chainInfo = getCapDataStructure(
    getCellValues(chainInfoRaw).at(-1),
  ).structure;

  t.log(instancePath, Object.keys(instance).join(', '));
  t.log(chainInfoPath, chainInfo);

  t.falsy(
    'ymax0' in instance,
    'ymax installation does not yet exist in vstorage',
  );

  t.truthy(chainInfo, 'axelar chain info should exist in vstorage');
});
