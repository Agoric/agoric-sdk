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

test('ymax is deployed and appears in vstorage instance', async t => {
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const instance = Object.fromEntries(
    getCapDataStructure(getCellValues(instanceRaw).at(-1)).structure,
  );

  t.log(instancePath, Object.keys(instance).join(', '));

  t.truthy('ymax0' in instance, 'ymax instance is present in vstorage');
});
