/* eslint-disable @jessie.js/safe-await-separator -- XXX irrelevant for tests */
import '@agoric/swingset-liveslots/tools/prepare-test-env.js';
import test from '@endo/ses-ava/prepare-endo.js';

import { makeNameHubKit } from '@agoric/vats';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { makeChainHub } from '../../src/exos/chain-hub.js';
import { provideDurableZone } from '../supports.js';
import { registerKnownChains } from '../../src/chain-info.js';
import knownChains from '../../src/fetched-chain-info.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';

const connection = {
  id: 'connection-1',
  client_id: '07-tendermint-3',
  counterparty: {
    client_id: '07-tendermint-2',
    connection_id: 'connection-1',
    prefix: {
      key_prefix: '',
    },
  },
  state: 3 /* IBCConnectionState.STATE_OPEN */,
  transferChannel: {
    portId: 'transfer',
    channelId: 'channel-1',
    counterPartyChannelId: 'channel-1',
    counterPartyPortId: 'transfer',
    ordering: 1 /* Order.ORDER_UNORDERED */,
    state: 3 /* IBCConnectionState.STATE_OPEN */,
    version: 'ics20-1',
  },
} as const;

// fresh state for each test
const setup = () => {
  const zone = provideDurableZone('root');
  const vt = prepareSwingsetVowTools(zone);
  const { nameHub, nameAdmin } = makeNameHubKit();
  const chainHub = makeChainHub(nameHub, vt);

  return { chainHub, nameAdmin, vt };
};

test.serial('getChainInfo', async t => {
  const { chainHub, nameAdmin, vt } = setup();
  // use fetched chain info
  await registerKnownChains(nameAdmin);

  const vow = chainHub.getChainInfo('celestia');
  t.like(await vt.asPromise(vow), { chainId: 'celestia' });
});

test.serial('concurrency', async t => {
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

test.serial('getConnectionInfo', async t => {
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

test('getBrandInfo support', async t => {
  const { chainHub, vt } = setup();

  const denom = 'utok1';
  const info1: CosmosChainInfo = {
    chainId: 'chain1',
    stakingTokens: [{ denom }],
  };

  chainHub.registerChain('chain1', info1);
  const info = {
    chainName: 'chain1',
    baseName: 'chain1',
    baseDenom: denom,
  };
  chainHub.registerAsset('utok1', info);

  const actual = chainHub.lookupAsset('utok1');
  t.deepEqual(actual, info);
});
