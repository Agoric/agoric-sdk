// @ts-check
import '@endo/init/legacy.js'; // axios compat
import test from 'ava';
import { queryVstorage } from '@agoric/synthetic-chain';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { Far } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';

const oldBoardId = 'board013515'; // from mainnet proposal 100

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

test('ymax is in vstorage instance with a new boardId', async t => {
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const capData = JSON.parse(getCellValues(instanceRaw).at(-1));

  const m = boardSlottingMarshaller((slot, iface) => {
    return Far('SlotReference', {
      getDetails: () => ({ slot, iface }),
    });
  });
  const instances = Object.fromEntries(m.fromCapData(capData));
  const { ymax0 } = instances;

  t.is(passStyleOf(ymax0), 'remotable');
  const { slot, iface } = ymax0.getDetails();
  t.log({ oldBoardId, newReference: { slot, iface } });
  t.regex(slot, /^board0[0-9]+$/);
  t.not(slot, oldBoardId);
  if (iface !== undefined) {
    t.is(typeof iface, 'string');
    t.is(iface.replace(/^Alleged: /, ''), 'InstanceHandle');
  }
});
