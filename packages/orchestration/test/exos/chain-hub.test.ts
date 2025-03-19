import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import test from '@endo/ses-ava/prepare-endo.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeNameHubKit, type IBCChannelID } from '@agoric/vats';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import {
  registerChainAssets,
  registerKnownChains,
} from '../../src/chain-info.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';
import { makeChainHub, registerAssets } from '../../src/exos/chain-hub.js';
import knownChains from '../../src/fetched-chain-info.js';
import { assets as assetFixture } from '../assets.fixture.js';
import { provideFreshRootZone } from '../durability.js';
import cctpChainInfo from '../../src/cctp-chain-info.js';
import type { BaseChainInfo } from '../../src/orchestration-api.js';

// fresh state for each test
const setup = () => {
  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone.subZone('vows'));
  const { nameHub, nameAdmin } = makeNameHubKit();
  const chainHub = makeChainHub(zone.subZone('chainHub'), nameHub, vt);

  return { chainHub, nameAdmin, vt, zone };
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
    chainId: 'agoric-any',
    namespace: 'cosmos',
    reference: 'agoric-any',
    stakingTokens: [{ denom }],
  };
  const tok1 = withAmountUtils(makeIssuerKit('Tok1'));

  chainHub.registerChain('agoric', info1);
  const info = {
    chainName: 'agoric',
    baseName: 'agoric',
    baseDenom: denom,
    brand: tok1.brand,
  };
  chainHub.registerAsset('utok1', info);

  t.deepEqual(
    chainHub.getAsset('utok1', 'agoric'),
    info,
    'getAsset(denom) returns denom info',
  );

  t.is(
    chainHub.getAsset('utok404', 'agoric'),
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
    chainHub.registerChain(name, {
      chainId: name,
      namespace: 'cosmos',
      reference: name,
      bech32Prefix: name,
    });
  }

  await registerChainAssets(nameAdmin, 'cosmoshub', assetFixture.cosmoshub);
  const details = await E(E(nameAdmin).readonly()).lookup(
    'chainAssets',
    'cosmoshub',
  );
  registerAssets(chainHub, 'cosmoshub', details);

  {
    const actual = chainHub.getAsset('uatom', 'cosmoshub');
    t.deepEqual(actual, {
      chainName: 'cosmoshub',
      baseName: 'cosmoshub',
      baseDenom: 'uatom',
    });
  }

  {
    const actual = chainHub.getAsset(
      'ibc/F04D72CF9B5D9C849BB278B691CDFA2241813327430EC9CDC83F8F4CA4CDC2B0',
      'cosmoshub',
    );
    t.deepEqual(actual, {
      chainName: 'cosmoshub',
      baseName: 'kava',
      baseDenom: 'erc20/tether/usdt',
    });
  }
});

test('makeChainAddress', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  // call getChainInfo so ChainHub performs agoricNames lookup that populates its local cache
  await vt.asPromise(chainHub.getChainInfo('osmosis'));

  const MOCK_ICA_ADDRESS =
    'osmo1ht7u569vpuryp6utadsydcne9ckeh2v8dkd38v5hptjl3u2ewppqc6kzgd' as const;
  t.deepEqual(chainHub.makeChainAddress(MOCK_ICA_ADDRESS), {
    chainId: 'osmosis-1',
    value: MOCK_ICA_ADDRESS,
    encoding: 'bech32',
  });

  t.throws(
    () => chainHub.makeChainAddress(MOCK_ICA_ADDRESS.replace('osmo1', 'foo1')),
    {
      message: 'Chain info not found for bech32Prefix "foo"',
    },
  );

  t.throws(() => chainHub.makeChainAddress('notbech32'), {
    message: 'No separator character for "notbech32"',
  });

  t.throws(() => chainHub.makeChainAddress('1notbech32'), {
    message: 'Missing prefix for "1notbech32"',
  });
});

test('resolveAccountId', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  // call getChainInfo so ChainHub performs agoricNames lookup that populates its local cache
  await vt.asPromise(chainHub.getChainInfo('osmosis'));

  const MOCK_ICA_ADDRESS =
    'osmo1ht7u569vpuryp6utadsydcne9ckeh2v8dkd38v5hptjl3u2ewppqc6kzgd' as const;

  // Should return CAIP-10 account ID when given a bech32 address
  t.is(
    chainHub.resolveAccountId(MOCK_ICA_ADDRESS),
    'cosmos:osmosis-1:osmo1ht7u569vpuryp6utadsydcne9ckeh2v8dkd38v5hptjl3u2ewppqc6kzgd',
    'resolves bech32 address to CAIP-10',
  );

  // Should return same CAIP-10 account ID when given one, regardless of the
  // hub's bech32 mapping
  const CAIP10_ID = `cosmos:osmosis-notinhub:${MOCK_ICA_ADDRESS}` as const;
  t.is(
    chainHub.resolveAccountId(CAIP10_ID),
    CAIP10_ID,
    'returns same CAIP-10 ID when given one',
  );

  // Should throw for invalid bech32 prefix
  t.throws(
    () => chainHub.resolveAccountId('foo1xyz'),
    {
      message: 'Chain info not found for bech32Prefix "foo"',
    },
    'throws on unknown bech32 prefix',
  );

  // Should throw for invalid address format
  t.throws(
    () => chainHub.resolveAccountId('notbech32'),
    {
      message: 'No separator character for "notbech32"',
    },
    'throws on invalid address format',
  );
});

test('updateChain updates existing chain info and mappings', t => {
  const { chainHub } = setup();

  const initialInfo = {
    chainId: 'chain-1',
    namespace: 'cosmos' as const,
    reference: 'chain-1',
    bech32Prefix: 'chain',
  };
  const updatedInfo = {
    ...initialInfo,
    bech32Prefix: 'newchain',
  };

  // Register initial chain
  chainHub.registerChain('testchain', initialInfo);

  // Update chain
  chainHub.updateChain('testchain', updatedInfo);

  // Verify chain address works with new prefix
  const address = `${updatedInfo.bech32Prefix}1abc`;
  const chainAddress = chainHub.makeChainAddress(address);
  t.deepEqual(chainAddress, {
    chainId: 'chain-1',
    value: address,
    encoding: 'bech32',
  });

  // Old prefix should not work
  t.throws(() => chainHub.makeChainAddress(`${initialInfo.bech32Prefix}1abc`), {
    message: `Chain info not found for bech32Prefix "${initialInfo.bech32Prefix}"`,
  });
});

test('updateChain errors on non-existent chain', t => {
  const { chainHub } = setup();

  t.throws(
    () =>
      chainHub.updateChain('nonexistent', {
        chainId: 'test',
        namespace: 'cosmos',
        reference: 'test',
      }),
    {
      message: 'Chain "nonexistent" not registered',
    },
  );
});

test('updateConnection updates existing connection info', async t => {
  const { chainHub, vt } = setup();

  const celestia = { chainId: knownChains.celestia.chainId };
  const neutron = { chainId: knownChains.neutron.chainId };
  const initialConnection = knownChains.celestia.connections['neutron-1'];

  // Register initial connection
  chainHub.registerConnection(
    celestia.chainId,
    neutron.chainId,
    initialConnection,
  );

  // Update with new channel info
  const updatedConnection = {
    ...initialConnection,
    transferChannel: {
      ...initialConnection.transferChannel,
      channelId: 'channel-999' as IBCChannelID,
    },
  };
  chainHub.updateConnection(
    celestia.chainId,
    neutron.chainId,
    updatedConnection,
  );

  // Verify lookup from both directions
  const forwardInfo = await vt.when(
    chainHub.getConnectionInfo(celestia.chainId, neutron.chainId),
  );
  t.is(forwardInfo.transferChannel.channelId, 'channel-999');

  const reverseInfo = await vt.when(
    chainHub.getConnectionInfo(neutron.chainId, celestia.chainId),
  );
  t.is(
    reverseInfo.transferChannel.counterPartyChannelId,
    'channel-999',
    'reverse direction shows updated channel',
  );
});

test('updateConnection errors on non-existent connection', t => {
  const { chainHub } = setup();

  t.throws(
    () =>
      chainHub.updateConnection('chain1', 'chain2', {
        id: 'connection-0',
        client_id: '07-tendermint-test',
        counterparty: {
          client_id: '07-tendermint-test',
          connection_id: 'connection-1',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-1',
          counterPartyPortId: 'transfer',
          version: 'ics20-1',
          state: 3,
          ordering: 0,
        },
      }),
    { message: 'Connection "chain1"<->"chain2" not registered' },
  );
});

test('updateAsset updates existing asset and brand mappings', t => {
  const { chainHub } = setup();

  // Register chains
  chainHub.registerChain('chain1', {
    chainId: 'chain-1',
    namespace: 'cosmos',
    reference: 'chain-1',
    bech32Prefix: 'a',
  });
  chainHub.registerChain('chain2', {
    chainId: 'chain-2',
    namespace: 'cosmos',
    reference: 'chain-2',
    bech32Prefix: 'b',
  });
  chainHub.registerChain('agoric', {
    chainId: 'agoric-3',
    bech32Prefix: 'agoric',
    namespace: 'cosmos',
    reference: 'agoric-3',
  });

  // Create initial asset with brand
  const tok1 = withAmountUtils(makeIssuerKit('Tok1'));
  const tok2 = withAmountUtils(makeIssuerKit('Tok2'));

  const initialDetail = {
    chainName: 'agoric',
    baseName: 'chain1',
    baseDenom: 'utok1',
    brand: tok1.brand,
  };

  // Register initial asset
  chainHub.registerAsset('utok1', initialDetail);

  // Update asset with new base chain and brand
  const updatedDetail = {
    ...initialDetail,
    baseName: 'chain2',
    brand: tok2.brand,
  };

  chainHub.updateAsset('utok1', updatedDetail);

  // Verify getAsset shows new details
  t.deepEqual(chainHub.getAsset('utok1', 'agoric'), updatedDetail);

  // Verify brand mappings are updated
  t.is(chainHub.getDenom(tok1.brand), undefined, 'old brand mapping removed');
  t.is(chainHub.getDenom(tok2.brand), 'utok1', 'new brand mapping added');
});

test('updateAsset errors appropriately', t => {
  const { chainHub, zone } = setup();

  // Register chains
  chainHub.registerChain('agoric', {
    chainId: 'agoric-3',
    bech32Prefix: 'agoric',
    namespace: 'cosmos',
    reference: 'agoric-3',
  });
  chainHub.registerChain('chain1', {
    chainId: 'chain-1',
    namespace: 'cosmos',
    reference: 'chain-1',
    bech32Prefix: 'c1',
  });

  const detail = {
    chainName: 'agoric',
    baseName: 'chain1',
    baseDenom: 'utok1',
  };

  // Register initial asset
  chainHub.registerAsset('utok1', detail);

  // Error on non-existent asset
  t.throws(() => chainHub.updateAsset('utok2', detail), {
    message: 'Asset "utok2" on "agoric" not registered',
  });

  // Error on non-existent base chain
  t.throws(
    () =>
      chainHub.updateAsset('utok1', {
        ...detail,
        baseName: 'nonexistent',
      }),
    { message: 'Chain "nonexistent" not registered' },
  );

  // First register an asset on chain1
  const tok1 = withAmountUtils(makeIssuerKit('Tok1'));
  chainHub.registerAsset('utok1', {
    ...detail,
    chainName: 'chain1',
  });

  // Now try to update it with a brand (which should fail)
  t.throws(
    () =>
      chainHub.updateAsset('utok1', {
        ...detail,
        chainName: 'chain1',
        brand: tok1.brand,
      }),
    { message: 'Brands only registerable for agoric-held assets' },
  );

  chainHub.registerAsset('ibc/toytok1', { ...detail, brand: tok1.brand });

  {
    t.throws(
      () =>
        chainHub.updateAsset('ibc/toytok1', {
          ...detail,
          baseName: 'nonexistent',
        }),
      { message: 'Chain "nonexistent" not registered' },
    );
    t.truthy(
      chainHub.getDenom(tok1.brand),
      'error does not cause state change',
    );
  }
});

test('cctp, non-cosmos chains', async t => {
  const {
    chainHub,
    vt: { when },
  } = setup();

  chainHub.registerChain('agoric', {
    chainId: 'agoric-3',
    bech32Prefix: 'agoric',
    namespace: 'cosmos',
    reference: 'agoric-3',
  });

  const withChainId = (info: BaseChainInfo) =>
    info.namespace === 'cosmos'
      ? { ...info, chainId: info.reference }
      : {
          ...info,
          chainId: `${info.namespace}:${info.reference}`,
        };

  for (const [chainName, info] of Object.entries(cctpChainInfo)) {
    // can register non-cosmos (cctp) chains
    chainHub.registerChain(chainName, withChainId(info));

    // can retrieve non-cosmos (cctp) chains
    t.deepEqual(
      await when(chainHub.getChainInfo(chainName)),
      withChainId(info),
    );

    // mimic call that occurs in the Orchestrator during `orch.getChain()`
    const getChainsAndConnectionP = when(
      chainHub.getChainsAndConnection(chainName, 'agoric'),
    );
    if (chainName === 'noble') {
      // expected; provide connections to avoid this error
      await t.throwsAsync(getChainsAndConnectionP, {
        message: 'connection not found: noble-1<->agoric-3',
      });
    } else {
      await t.notThrowsAsync(getChainsAndConnectionP);
    }
  }

  // document full chain info
  t.deepEqual(await when(chainHub.getChainInfo('ethereum')), {
    chainId: 'eip155:1',
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  });
});
