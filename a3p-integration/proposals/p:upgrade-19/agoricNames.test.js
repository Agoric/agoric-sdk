/* eslint-env node */

/**
 * @file The goal of this file is to test different aspects of agoricNames to make sure
 * everything works after an upgrade. Here's the test plan;
 * 1. upgrade agoricNames
 * 2. send a core-eval that writes into children of agoricNames (brand, issuer, instance...)
 *   2b. expect a child nameHub of agoricNames will publish ALL its entries when a new item is written to it
 *   2c. check the values in the vstorage match before and after the upgrade
 *   2d. also check that new items are in the vstorage as well
 * 3. append new chain
 *    CONTEXT: there are two new children introduced to agoricNames by orchestration and their
 *    onUpdate callback isn't durable. So we must check that if we write a new chain info to those child
 *    nameHubs, we should observe the new value in vstorage.
 *   3b. send a core-eval that writes new chain info to published.agoricNames.chain and published.agoricNames.chainConnection
 *   3c. wait until the expected data observed in vstorage
 *
 *
 * TESTING CODE THAT HOLDS ONTO 'agoricNames': smartWallet is one of the vats that depend on agoricNames to work properly the most.
 * smartWallet uses agoricNames to;
 * - create purses for known brands
 *   - looks for the brand in agoricNames.brand
 *   - creates a purse for the brand using the issuer in agoricNames.issuer
 * - create invitations for a from the publicFacet of a given instance (agoricNames.instance)
 *
 * So the fact that a user can complete an offer successfully means;
 * - smartWallet can find the instance on agoricNames.instance (for invitationSource = 'agoricContract')
 * - smartWallet can find, if not present create, a purse for known brand, agoricNames.brand
 * and agoricNames.issuer returned correct values
 *
 *
 * 4. add a new PSM and swap against it
 * 4b. adding the new PSM requires introducing a new asset to the chain and writing
 * the PSM instance to agoricNames.instance
 * 4c. being able to deposit the new asset to a user means that smartWallet created a purse
 * for the new brand
 * 4d. being able to send the offer to the PSM instance means smartWallet can find the instance
 * in agoricNames.instance
 *
 * 5. we want to make sure objects that were already in agoricNames works as well, so open a vault
 * in an existing collateralManager
 * 5a. fund GOV1 with ATOM
 * 5b. open a vault
 * 5c. check the vault is opened successfully
 *
 */

import '@endo/init';
import test from 'ava';
import {
  agoric,
  ATOM_DENOM,
  evalBundles,
  getIncarnation,
  GOV1ADDR,
  openVault,
} from '@agoric/synthetic-chain';
import { makeVstorageKit, retryUntilCondition } from '@agoric/client-utils';
import {
  bankSend,
  extractBalance,
  psmSwap,
  tryISTBalances,
} from './test-lib/psm-lib.js';
import { getBalances, listVaults } from './test-lib/utils.js';
import { walletUtils } from './test-lib/index.js';

const AGORIC_NAMES_UPGRADE_DIR = 'agoricNamesCoreEvals/upgradeAgoricNames';
const WRITE_AGORIC_NAMES_DIR = 'agoricNamesCoreEvals/writeToAgoricNames';
const APPEND_CHAIN_DIR = 'agoricNamesCoreEvals/appendChainInfo';
const ADD_USD_OLIVES_DIR = 'agoricNamesCoreEvals/addUsdOlives';
const DEPOSIT_USD_OLIVES_DIR = 'agoricNamesCoreEvals/depositUsdOlives';

const makeWaitUntilKeyFound = (keyFinder, vstorage) => (path, targetKey) =>
  retryUntilCondition(
    () => vstorage.keys(path),
    keys => keyFinder(keys, targetKey),
    'Key not found.',
    { maxRetries: 5, retryIntervalMs: 2000, log: console.log, setTimeout },
  );

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial('upgrade agoricNames', async t => {
  await evalBundles(AGORIC_NAMES_UPGRADE_DIR);

  const incarnation = await getIncarnation('agoricNames');
  t.is(incarnation, 1, 'incorrect incarnation');
});

test.serial('check all existing values are preserved', async t => {
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

  await evalBundles(WRITE_AGORIC_NAMES_DIR);

  const agoricNamesAfter = await getAgoricNames();
  t.like(agoricNamesAfter, agoricNamesBefore);

  agoricNamesChildren.forEach(child =>
    assert(
      agoricNamesAfter[child][`test${child}`],
      'we should be able to add new value',
    ),
  );
});

test.serial('check we can add new chains', async t => {
  // @ts-expect-error
  const { vstorageKit } = t.context;
  await evalBundles(APPEND_CHAIN_DIR);

  const waitUntilKeyFound = makeWaitUntilKeyFound(
    (keys, targetKey) => keys.includes(targetKey),
    vstorageKit.vstorage,
  );
  await Promise.all([
    waitUntilKeyFound('published.agoricNames.chain', 'hot'),
    waitUntilKeyFound(
      'published.agoricNames.chainConnection',
      'cosmoshub-4_hot-1',
    ),
  ]);

  const [chainInfo, connectionInfo] = await Promise.all([
    vstorageKit.readLatestHead('published.agoricNames.chain.hot'),
    vstorageKit.readLatestHead(
      'published.agoricNames.chainConnection.cosmoshub-4_hot-1',
    ),
  ]);

  t.log({
    chainInfo,
    connectionInfo,
  });

  t.deepEqual(chainInfo, { allegedName: 'Hot New Chain', chainId: 'hot-1' });
  t.deepEqual(connectionInfo, {
    client_id: '07-tendermint-2',
    counterparty: {
      client_id: '07-tendermint-3',
      connection_id: 'connection-99',
    },
    id: 'connection-1',
    state: 3,
    transferChannel: {
      channelId: 'channel-1',
      counterPartyChannelId: 'channel-1',
      counterPartyPortId: 'transfer',
      ordering: 1,
      portId: 'transfer',
      state: 3,
      version: 'ics20-1',
    },
  });
});

test.serial('check contracts depend on agoricNames are not broken', async t => {
  await evalBundles(ADD_USD_OLIVES_DIR);

  await evalBundles(DEPOSIT_USD_OLIVES_DIR);

  const psmSwapIo = {
    now: Date.now,
    follow: agoric.follow,
    setTimeout,
    log: console.log,
  };

  const balancesBefore = await getBalances([GOV1ADDR]);

  await psmSwap(
    GOV1ADDR,
    ['swap', '--pair', 'IST.USD_OLIVES', '--wantMinted', 1],
    psmSwapIo,
  );

  const balancesAfter = await getBalances([GOV1ADDR]);
  await tryISTBalances(
    t,
    extractBalance(balancesAfter, 'uist'),
    extractBalance(balancesBefore, 'uist') + 1000000, // in uist
  );
});

test.serial('open a vault', async t => {
  await bankSend(GOV1ADDR, `200000000000000000${ATOM_DENOM}`);
  const istBalanceBefore = await getBalances([GOV1ADDR]);
  const activeVaultsBefore = await listVaults(GOV1ADDR, walletUtils);

  const mint = '5.0';
  const collateral = '10.0';
  await openVault(GOV1ADDR, mint, collateral);

  const istBalanceAfter = await getBalances([GOV1ADDR]);
  const activeVaultsAfter = await listVaults(GOV1ADDR, walletUtils);

  await tryISTBalances(
    t,
    extractBalance(istBalanceAfter, 'uist'),
    extractBalance(istBalanceBefore, 'uist') + 5000000,
  );

  t.is(
    activeVaultsAfter.length,
    activeVaultsBefore.length + 1,
    `The number of active vaults should increase after opening a new vault.`,
  );
});
