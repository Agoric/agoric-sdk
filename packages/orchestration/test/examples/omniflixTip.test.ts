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
      bootstrap,
      commonPrivateArgs,
      brands: { flix, osmo, bld },
      customTerms,
    } = await commonSetup(t);
    const vt = bootstrap.vowTools;
  
    const installation = await bundleAndInstall('/Users/bhavesh/Agoric/agoric-sdk/packages/orchestration/src/examples/omniflixTip.contract.js');
    const storageNode = await E(bootstrap.storage.rootNode).makeChildNode('omniflixTip');
    const tipKit = await t.throwsAsync(
      await E(zoe).startInstance(
      installation,
      { FLIX: flix.issuer, OSMO: osmo.issuer, BLD: bld.issuer },
      {},
      { ...commonPrivateArgs, storageNode, customTerms }
    ), {
      message: 'customTerms: {"chainDetails":{"agoric":{"chainId":"agoric"},"omniflixlocal":{"chainId":"omniflixlocal"},"osmosislocal":{"chainId":"osmosislocal"}}} - Must not have unexpected properties: ["chainDetails"]',
    });
    const flixChainInfo = harden({
      chainId: 'omniflixlocal',
      stakingTokens: [{ denom: 'uflix'}],
      ...chainInfoDefaults,
    }) as CosmosChainInfo;
    
    const osmoChainInfo = harden({
      chainId: 'osmosislocal',
      stakingTokens: [{ denom: 'uosmo'}],
      ...chainInfoDefaults,
    }) as CosmosChainInfo;
    t.log('admin adds chains with creatorFacet',flixChainInfo.chainId, osmoChainInfo.chainId)
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
    const chainName = 'osmosislocal';
    await E(tipKit.creatorFacet).registerChain(
      chainName,
      osmoChainInfo,
      agoricToOsmoConnection,
    );
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
    await E(tipKit.creatorFacet).registerChain(
      chainNameFlix,
      flixChainInfo,
      osmoToFlixConnection,
    );  


    const publicFacet = await E(zoe).getPublicFacet(tipKit.instance);
    const inv = E(publicFacet).makeTipInvitation();
  
    const anAmt = flix.make(10n);
    const Flix = flix.mint.mintPayment(anAmt);
    const userSeat = await E(zoe).offer(
      inv,
      { give: { Flix: anAmt } },
      { Flix },
      { chainId: 'osmosislocal', tokenDenom: 'uosmo', recipientAddress: 'omniflix1destAddr', slippage: 0.03 },
    );
  
    await t.notThrowsAsync(E(userSeat).getOfferResult());
    const payouts = await E(userSeat).getPayouts();
    const amountReturned = await flix.issuer.getAmountOf(payouts.Flix);
    t.deepEqual(anAmt, amountReturned, 'give is returned');
  });