/* eslint-env node */

/**
 * @file
 * Ideas:
 * - write something new to agoricNames and check vstorage
 * - can you add a new chain for orc?
 * - can you add a new psm?
 * - can you open a vault?
 */

import '@endo/init';
import test from 'ava';
import {
  evalBundles,
  agd as agdAmbient,
  agoric,
  getDetailsMatchingVats,
} from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';

const AGORIC_NAMES_UPGRADE_DIR = 'upgradeAgoricNames';
const WRITE_AGORIC_NAMES = 'writeToAgoricNames';

const ambientAuthority = {
  query: agdAmbient.query,
  follow: agoric.follow,
  setTimeout,
  log: console.log,
};

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial.only('upgrade agoricNames', async t => {
  await evalBundles(AGORIC_NAMES_UPGRADE_DIR);

  const vatDetailsAfter = await getDetailsMatchingVats('agoricNames');
  const { incarnation } = vatDetailsAfter.find(vat =>
    vat.vatName.endsWith('agoricNames'),
  );

  t.log(vatDetailsAfter);
  t.is(incarnation, 1, 'incorrect incarnation');
  t.pass();
});

test.serial.only('check all existing values are preserved', async t => {
  // @ts-expect-error
  const { vstorageKit } = t.context;
  const agoricNamesChildren = [
    'brand',
    'installation',
    'instance',
    'issuer',
    'oracleBrand',
    'vbankAsset',
  ];

  const getAgoricNames = () =>
    Promise.all(
      agoricNamesChildren.map(async child => {
        const content = await vstorageKit.readLatestHead(
          `published.agoricNames.${child}`,
        );
        return [child, Object.fromEntries(content)];
      }),
    ).then(rawAgoricNames => Object.fromEntries(rawAgoricNames));

  const agoricNamesBefore = await getAgoricNames();
  console.log('AGORIC_NAMES_BEFORE', agoricNamesBefore);

  await evalBundles(WRITE_AGORIC_NAMES);

  const agoricNamesAfter = await getAgoricNames();
  t.like(agoricNamesAfter, agoricNamesBefore);

  agoricNamesChildren.forEach(child =>
    assert(
      agoricNamesAfter[child][`test${child}`],
      'we should be able to add new value',
    ),
  );
});

test.serial.only('check we can add new chains', async t => {
  await evalBundles('chainInfoTest');
  t.pass();
});

test.serial.skip(
  'check contracts depend on agoricNames are not broken',
  async t => {},
);
