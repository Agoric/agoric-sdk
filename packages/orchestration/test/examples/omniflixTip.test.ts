import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { commonSetup } from '../supports.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';

const chainInfoDefaults = {
  connections: {},
};

const txChannelDefaults = {
  counterPartyPortId: 'transfer',
  version: 'ics20-1',
  portId: 'transfer',
  ordering: 1, // ORDER_UNORDERED
  state: 3, // STATE_OPEN
};

test('successful tip on Omniflix', async t => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const {
    facadeServices: { chainHub },
    bootstrap,
    commonPrivateArgs,
    brands: { flix, osmo, bld },
    customTerms,
  } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const installation = await bundleAndInstall(
    './src/examples/omniflixTip.contract.js',
  );
  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    'omniflixTip',
  );
  // Create chainDetails object with the required chain information
  // const chainDetails = {
  //   agoric: { chainId: 'agoric' },
  //   omniflixlocal: { chainId: 'omniflixlocal' },
  //   osmosislocal: { chainId: 'osmosislocal' }
  // };
  /** @type {IBCConnectionInfo} */
const c1 = harden({
  id: 'connection-0',
  client_id: 'client-0',
  state: 3, // OPEN
  counterparty: harden({
    client_id: 'client-0',
    connection_id: 'connection-0',
    // prefix: {
    //   key_prefix: 'key-prefix-0',
    // },
  }),
  transferChannel: harden({
    portId: 'transfer',
    channelId: 'channel-0',
    counterPartyPortId: 'transfer',
    counterPartyChannelId: 'channel-1',
    ordering: 2, // ORDERED
    version: '1',
    state: 3, // OPEN
  }),
});

// TODO: rename chainDetails to defaultChainDetails? or move back to test?
/** @type {Record<string, ChainInfo>} */
const chainDetails = harden({
  agoric: {
    chainId: `agoriclocal`,
    stakingTokens: [{ denom: 'ubld' }],
    connections: { osmosislocal: c1 },
  },
  osmosis: {
    chainId: `osmosislocal`,
    stakingTokens: [{ denom: 'uosmo' }],
  },
});

  const tipKit = await E(zoe).startInstance(
    installation,
    { FLIX: flix.issuer, OSMO: osmo.issuer, BLD: bld.issuer },
    { chainDetails },
    { ...commonPrivateArgs, storageNode },
  );
  const flixChainInfo = harden({
    chainId: 'omniflixlocal',
    stakingTokens: [{ denom: 'uflix' }],
    ...chainInfoDefaults,
  }) as CosmosChainInfo;

  const osmoChainInfo = harden({
    chainId: 'osmosis',
    stakingTokens: [{ denom: 'uosmo' }],
    ...chainInfoDefaults,
  }) as CosmosChainInfo;
  t.log(
    'admin adds chains with creatorFacet',
    flixChainInfo.chainId,
    osmoChainInfo.chainId,
  );
  const agoricToOsmoConnection = {
    id: 'connection-1',
    client_id: '07-tendermint-1',
    state: 3, // STATE_OPEN
    counterparty: {
      client_id: '07-tendermint-2109',
      connection_id: 'connection-1649',
    },
    transferChannel: {
      counterPartyChannelId: 'channel-1',
      channelId: 'channel-0',
      ...txChannelDefaults,
    },
  } as IBCConnectionInfo;
  const chainName = 'osmosis';
  chainHub.registerChain(chainName, osmoChainInfo);
  chainHub.registerConnection('agoric', 'osmosis', agoricToOsmoConnection);
  const osmoToFlixConnection = {
    id: 'connection-2',
    client_id: '07-tendermint-2',
    state: 3, // STATE_OPEN
    counterparty: {
      client_id: '07-tendermint-2110',
      connection_id: 'connection-1650',
    },
    transferChannel: {
      counterPartyChannelId: 'channel-1',
      channelId: 'channel-1',
      ...txChannelDefaults,
    },
  } as IBCConnectionInfo;
  const chainNameFlix = 'flix-chain-0';
  chainHub.registerChain(chainNameFlix, flixChainInfo);
  chainHub.registerConnection(chainName, chainNameFlix, osmoToFlixConnection);

  const publicFacet = await E(zoe).getPublicFacet(tipKit.instance);
  const inv = await E(publicFacet).makeTipInvitation();

  const TipAmt = flix.make(10n);
  const Flix = flix.issuerKit.mint.mintPayment(TipAmt);
  const offerArgs = harden({
    chainId: 'osmosis',
    tokenDenom: 'uosmo',
    recipientAddress: 'omniflix1destAddr',
    slippage: 0.03,
  });
  const userSeat = await E(zoe).offer(
    inv,
    {
      give: { TipAmt },
      want: {},
      exit: { onDemand: null },
    },
    { TipAmt: Flix },
    offerArgs,
  );

  await t.notThrowsAsync(E(userSeat).getOfferResult());
  const payouts = await E(userSeat).getPayouts();
  const amountReturned = await flix.issuer.getAmountOf(payouts.Flix);
  t.deepEqual(anAmt, amountReturned, 'give is returned');
});
