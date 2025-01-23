import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { registerChain } from '../../src/chain-info.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';
import { commonSetup } from '../supports.js';
import { denomHash } from '../../src/utils/denomHash.js';
import { AxelarTestNet } from '../../src/fixtures/axelar-testnet.js';
import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { DenomDetail } from '../../src/types.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'sendAnywhere';
const contractFile = `${dirname}/../../src/examples/send-anywhere.contract.js`;
type StartFn =
  typeof import('../../src/examples/send-anywhere.contract.js').start;

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

const AgoricDevnetConfig = {
  chains: {
    osmosis: {
      chainId: 'osmo-test-5',
      bech32Prefix: 'osmosis',
      connections: {
        'axelar-testnet-lisbon-3': {
          id: 'connection-1233333', // XXX???
          client_id: '07-tendermint-1258',
          state: 3, // STATE_OPEN,
          counterparty: {
            client_id: 'XXXX???',
            connection_id: 'connection-87665', // XXX???
          },
          transferChannel: {
            channelId: 'channel-566434324', // XXX???
            counterPartyChannelId: 'channel-112233', // ???
            ...txChannelDefaults,
          },
        } as IBCConnectionInfo,
      },
    } as CosmosChainInfo,
  },
  connections: {
    'osmo-test-5': {
      id: 'connection-86',
      client_id: '07-tendermint-127',
      state: 3, // STATE_OPEN
      counterparty: {
        client_id: '07-tendermint-4326',
        connection_id: 'connection-3793',
      },
      transferChannel: {
        counterPartyChannelId: 'channel-10062',
        channelId: 'channel-65',
        ...txChannelDefaults,
      },
    } as IBCConnectionInfo,
  },
};

test('agoric / osmosis / axelar USDC denom info', t => {
  // Where did this denom come from?
  const DENOM_SENDING_TOKEN =
    'ibc/D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF';

  // aha!
  // $ agd query ibc-transfer denom-trace D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF --node https://devnet.rpc.agoric.net:443
  // denom_trace:
  //   base_denom: uausdc
  //   path: transfer/channel-65/transfer/channel-4118
  //
  // Now what is channel-65?
  // $ agd query ibc channel client-state transfer channel-65 --node https://devnet.rpc.agoric.net:443 -o json | jq -C '.client_state.chain_id'
  // "osmo-test-5"

  const baseDenom = 'uausdc';
  const { osmosis } = AgoricDevnetConfig.chains;
  const { channelId: agoricToOsmosis } =
    AgoricDevnetConfig.connections[osmosis.chainId].transferChannel;
  const { counterPartyChannelId: osmosisToAxelar } =
    AxelarTestNet.ibcConnections.osmosis.transferChannel;
  const path = `transfer/${agoricToOsmosis}/transfer/${osmosisToAxelar}`;

  t.log({ baseDenom, agoricToOsmosis, osmosisToAxelar, path });
  const denom = `ibc/${denomHash({ path, denom: baseDenom })}`;
  t.is(denom, DENOM_SENDING_TOKEN);
});

const registerAUSDC = async ({ bankManager, agoricNamesAdmin }) => {
  const ausdcKit = withAmountUtils(makeIssuerKit('AUSDC'));
  const { issuer, mint, brand } = ausdcKit;
  const denom =
    'ibc/D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF';
  const issuerName = 'AUSDC_axl_osmo';
  const proposedName = 'Axelar USDC via Osmosis';
  await E(bankManager).addAsset(denom, issuerName, proposedName, {
    issuer,
    mint,
    brand,
  });
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    denom,
    /** @type {AssetInfo} */ harden({
      brand,
      issuer,
      issuerName,
      denom,
      proposedName,
      displayInfo: { IOU: true },
    }),
  );
  return harden({ ...ausdcKit, denom });
};

test('send to avalance via osmosis and axelar', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { ist },
    utils: { inspectLocalBridge, pourPayment, transmitTransferAck },
  } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { bankManager, agoricNamesAdmin } = bootstrap;
  const ausdcKit = await registerAUSDC({ bankManager, agoricNamesAdmin });

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );

  // Mix osmosis from AgoricDevnetConfig with commonPrivateArgs
  const {
    agoric,
    osmosis: _x,
    ...withoutOsmosis
  } = commonPrivateArgs.chainInfo;
  const { osmosis } = AgoricDevnetConfig.chains;
  const connections = {
    ...agoric.connections,
    ...AgoricDevnetConfig.connections,
    // XXX to get from Agoric to axelar, use osmosis
    'axelar-testnet-lisbon-3': AgoricDevnetConfig.connections[osmosis.chainId],
  };
  const chainInfo = {
    ...withoutOsmosis,
    osmosis,
    agoric: { ...agoric, connections },
    avalanche: AxelarTestNet.evmChains.avalanche,
    axelar: { chainId: 'axelar-testnet-lisbon-3', pfmEnabled: true },
  };
  const assetInfo: Array<[string, DenomDetail]> = [
    ...commonPrivateArgs.assetInfo,
    [
      ausdcKit.denom,
      {
        baseDenom: 'uausdc',
        baseName: 'axelar',
        chainName: 'agoric',
        brand: ausdcKit.brand,
      },
    ],
  ];
  const sendKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer, AUSDC: ausdcKit.issuer },
    {},
    {
      ...commonPrivateArgs,
      assetInfo,
      chainInfo,
      storageNode,
    },
  );

  t.log('client uses contract to send to EVM chain');
  {
    const anAmt = ausdcKit.units(4.25);
    const Send = await E(ausdcKit.mint).mintPayment(anAmt);
    // const anAmt = ist.units(4.25);
    // const Send = await pourPayment(anAmt);
    const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
    const inv = E(publicFacet).makeSendInvitation();
    const userSeat = await E(zoe).offer(
      inv,
      { give: { Send: anAmt } },
      { Send },
      {
        destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
        chainName: 'avalanche',
      },
    );
    await transmitTransferAck();
    await vt.when(E(userSeat).getOfferResult());
    const history = inspectLocalBridge();
    const { messages, address: fakeLocalChainAddr } = history.at(-1);
    t.is(messages.length, 1);
    const [txfr] = messages;
    t.log('local bridge', txfr);
    t.like(txfr, {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'pfm', // XXX not sure
      // receiver: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
      sender: fakeLocalChainAddr,
      sourceChannel: 'channel-65',
      token: {
        amount: '4250000',
        // see test above
        denom:
          'ibc/D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF',
      },
    });
    // check memo for Axelar
    t.deepEqual(JSON.parse(txfr.memo), {
      // FIXME
      forward: {
        receiver:
          'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
        port: 'transfer',
        channel: 'channel-4118',
        retries: 2,
        timeout: '10m',
        next: JSON.stringify({
          destination_chain: 'avalanche',
          destination_address: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
          payload: null,
          type: 3, // TODO get enum for this Transfer value
        }),
      },
    });
  }
});
