// @ts-check
import test from 'ava';
import '@endo/init/debug.js';
import { queryVstorage } from '@agoric/synthetic-chain';
import { boardSlottingMarshaller } from '@agoric/client-utils';

const oldBoardId = 'board013515'; // from mainnet proposal 100

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

test('ymax is in vstorage instance with a new boardId', async t => {
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const capData = getCellValues(instanceRaw).at(-1);

  const m = boardSlottingMarshaller();
  const instance = Object.fromEntries(m.fromCapData(capData));

  const { slots } = m.toCapData(instance.ymax0);
  const [newBoardId] = slots;
  t.log('old, new boarId', oldBoardId, newBoardId);
  t.not(newBoardId, oldBoardId);
});
