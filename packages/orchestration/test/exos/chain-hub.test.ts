/* eslint-disable @jessie.js/safe-await-separator -- XXX irrelevant for tests */
import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import test from '@endo/ses-ava/prepare-endo.js';

import { makeNameHubKit } from '@agoric/vats';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { E } from '@endo/far';
import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeChainHub, registerAssets } from '../../src/exos/chain-hub.js';
import { provideFreshRootZone } from '../durability.js';
import {
  registerChainAssets,
  registerKnownChains,
} from '../../src/chain-info.js';
import knownChains from '../../src/fetched-chain-info.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';
import { assets as assetFixture } from '../assets.fixture.js';

// fresh state for each test
const setup = () => {
  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone.subZone('vows'));
  const { nameHub, nameAdmin } = makeNameHubKit();
  const chainHub = makeChainHub(zone.subZone('chainHub'), nameHub, vt);

  return { chainHub, nameAdmin, vt };
};

test('getChainInfo', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  const vow = chainHub.getChainInfo('celestia');
  t.like(await vt.asPromise(vow), { chainId: 'celestia' });
});

test('concurrency', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  const v1 = chainHub.getChainInfo('celestia');
  const v2 = chainHub.getChainInfo('celestia');
  t.like(await vt.asPromise(vt.allVows([v1, v2])), [
    { chainId: 'celestia' },
    { chainId: 'celestia' },
  ]);
});

test('getConnectionInfo', async t => {
  const { chainHub, vt } = setup();

  // https://mapofzones.com/zones/celestia/peers
  const a = { chainId: knownChains.celestia.chainId };
  // https://mapofzones.com/zones/neutron-1/peers
  const b = { chainId: knownChains.neutron.chainId };
  const ab: IBCConnectionInfo = knownChains.celestia.connections['neutron-1'];
  const ba = knownChains.neutron.connections.celestia;

  chainHub.registerConnection(a.chainId, b.chainId, ab);

  // Look up by string or info object
  t.deepEqual(
    await vt.when(chainHub.getConnectionInfo(a.chainId, b.chainId)),
    ab,
  );
  t.deepEqual(await vt.when(chainHub.getConnectionInfo(a, b)), ab);

  // Look up the opposite direction
  t.deepEqual(await vt.when(chainHub.getConnectionInfo(b, a)), ba);
});

test('denom info support via getAsset and getDenom', async t => {
  const { chainHub } = setup();

  const denom = 'utok1';
  const info1: CosmosChainInfo = {
    bech32Prefix: 'chain',
    chainId: 'chain1',
    stakingTokens: [{ denom }],
  };
  const tok1 = withAmountUtils(makeIssuerKit('Tok1'));

  chainHub.registerChain('chain1', info1);
  const info = {
    chainName: 'chain1',
    baseName: 'chain1',
    baseDenom: denom,
    brand: tok1.brand,
  };
  chainHub.registerAsset('utok1', info);

  t.deepEqual(
    chainHub.getAsset('utok1'),
    info,
    'getAsset(denom) returns denom info',
  );

  t.is(
    chainHub.getAsset('utok404'),
    undefined,
    'getAsset returns undefined when denom not registered',
  );

  t.deepEqual(
    chainHub.getDenom(tok1.brand),
    info.baseDenom,
    'getDenom(brand) returns denom info',
  );

  const tok44 = withAmountUtils(makeIssuerKit('Tok404'));
  t.is(
    chainHub.getDenom(tok44.brand),
    undefined,
    'getDenom returns undefined when brand is not found',
  );
});

test('toward asset info in agoricNames (#9572)', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  await vt.when(chainHub.getChainInfo('cosmoshub'));

  for (const name of ['kava', 'fxcore']) {
    chainHub.registerChain(name, { chainId: name, bech32Prefix: name });
  }

  await registerChainAssets(nameAdmin, 'cosmoshub', assetFixture.cosmoshub);
  const details = await E(E(nameAdmin).readonly()).lookup(
    'chainAssets',
    'cosmoshub',
  );
  registerAssets(chainHub, 'cosmoshub', details);

  {
    const actual = chainHub.getAsset('uatom');
    t.deepEqual(actual, {
      chainName: 'cosmoshub',
      baseName: 'cosmoshub',
      baseDenom: 'uatom',
    });
  }

  {
    const actual = chainHub.getAsset(
      'ibc/F04D72CF9B5D9C849BB278B691CDFA2241813327430EC9CDC83F8F4CA4CDC2B0',
    );
    t.deepEqual(actual, {
      chainName: 'cosmoshub',
      baseName: 'kava',
      baseDenom: 'erc20/tether/usdt',
    });
  }
});

test('getChainInfoByAddress', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  // call getChainInfo so ChainHub performs agoricNames lookup that populates its local cache
  await vt.asPromise(chainHub.getChainInfo('osmosis'));

  const MOCK_ICA_ADDRESS =
    'osmo1ht7u569vpuryp6utadsydcne9ckeh2v8dkd38v5hptjl3u2ewppqc6kzgd';
  t.like(chainHub.getChainInfoByAddress(MOCK_ICA_ADDRESS), {
    chainId: 'osmosis-1',
    bech32Prefix: 'osmo',
  });

  t.throws(
    () =>
      chainHub.getChainInfoByAddress(MOCK_ICA_ADDRESS.replace('osmo1', 'foo1')),
    {
      message: 'Chain info not found for bech32Prefix "foo"',
    },
  );

  t.throws(() => chainHub.getChainInfoByAddress('notbech32'), {
    message: 'No separator character for "notbech32"',
  });

  t.throws(() => chainHub.getChainInfoByAddress('1notbech32'), {
    message: 'Missing prefix for "1notbech32"',
  });
});
