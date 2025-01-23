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

test('agoric / osmosis / axelar USDC denom info', t => {
  // Where did this denom come from?
  const DENOM_SENDING_TOKEN =
    'ibc/D6077E64A3747322E1C053ED156B902F78CC40AE4C7240349A26E3BC216497BF';

  // aha!
  // $ agd query ibc channel client-state transfer channel-65 --node https://devnet.rpc.agoric.net:443 -o json | jq -C '.client_state.chain_id'
  // "osmo-test-5"
  // denom_trace:
  //   base_denom: uausdc
  //   path: transfer/channel-65/transfer/channel-4118

  const baseDenom = 'uausdc';
  const agoricToOsmosis = 'channel-65';
  const { counterPartyChannelId: osmosisToAxelar } =
    AxelarTestNet.ibcConnections.osmosis.transferChannel;
  const path = `transfer/${agoricToOsmosis}/transfer/${osmosisToAxelar}`;

  t.log({ baseDenom, agoricToOsmosis, osmosisToAxelar, path });
  const denom = `ibc/${denomHash({ path, denom: baseDenom })}`;
  t.is(denom, DENOM_SENDING_TOKEN);
});

test('send using arbitrary chain info', async t => {
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

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );
  const sendKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  const hotChainInfo = harden({
    chainId: 'hot-new-chain-0',
    stakingTokens: [{ denom: 'uhot' }],
    ...chainInfoDefaults,
  }) as CosmosChainInfo;
  t.log('admin adds chain using creatorFacet', hotChainInfo.chainId);
  const agoricToHotConnection = {
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
  const chainName = 'hot';
  await E(sendKit.creatorFacet).registerChain(
    chainName,
    hotChainInfo,
    agoricToHotConnection,
  );

  t.log('client uses contract to send to hot new chain');
  {
    const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
    const inv = E(publicFacet).makeSendInvitation();
    const amt = await E(zoe).getInvitationDetails(inv);
    t.is(amt.description, 'send');

    const anAmt = ist.units(3.5);
    const Send = await pourPayment(anAmt);
    const userSeat = await E(zoe).offer(
      inv,
      { give: { Send: anAmt } },
      { Send },
      { destAddr: 'hot1destAddr', chainName },
    );
    await transmitTransferAck();
    await vt.when(E(userSeat).getOfferResult());

    const history = inspectLocalBridge();
    t.like(history, [
      { type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' },
      { type: 'VLOCALCHAIN_EXECUTE_TX' },
    ]);
    const [_alloc, { messages, address: execAddr }] = history;
    t.is(messages.length, 1);
    const [txfr] = messages;
    t.log('local bridge', txfr);
    t.like(txfr, {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'hot1destAddr',
      sender: execAddr,
      sourceChannel: 'channel-0',
      sourcePort: 'transfer',
      token: { amount: '3500000', denom: 'uist' },
    });
  }

  t.log('well-known chains such as cosmos work the same way');
  {
    const anAmt = ist.units(1.25);
    const Send = await pourPayment(anAmt);
    const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
    const inv = E(publicFacet).makeSendInvitation();
    const userSeat = await E(zoe).offer(
      inv,
      { give: { Send: anAmt } },
      { Send },
      { destAddr: 'cosmos1destAddr', chainName: 'cosmoshub' },
    );
    await transmitTransferAck();
    await vt.when(E(userSeat).getOfferResult());
    const history = inspectLocalBridge();
    const { messages, address: execAddr } = history.at(-1);
    t.is(messages.length, 1);
    const [txfr] = messages;
    t.log('local bridge', txfr);
    t.like(txfr, {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1destAddr',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: { amount: '1250000', denom: 'uist' },
    });
  }

  t.log('hot chain is endorsed by chain governance');
  const { agoricNamesAdmin } = bootstrap;
  await registerChain(
    agoricNamesAdmin,
    'hot',
    harden({
      ...hotChainInfo,
      connections: { 'agoric-3': agoricToHotConnection },
    }),
  );

  t.log('another contract uses the now well-known hot chain');
  const orchKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.log('client can send to hot chain without admin action');
  {
    const anAmt = ist.units(4.25);
    const Send = await pourPayment(anAmt);
    const publicFacet = await E(zoe).getPublicFacet(orchKit.instance);
    const inv = E(publicFacet).makeSendInvitation();
    const userSeat = await E(zoe).offer(
      inv,
      { give: { Send: anAmt } },
      { Send },
      { destAddr: 'hot1destAddr', chainName: 'hot' },
    );
    await transmitTransferAck();
    await vt.when(E(userSeat).getOfferResult());
    const history = inspectLocalBridge();
    const { messages, address: execAddr } = history.at(-1);
    t.is(messages.length, 1);
    const [txfr] = messages;
    t.log('local bridge', txfr);
    t.like(txfr, {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'hot1destAddr',
      sender: execAddr,
      sourceChannel: 'channel-1',
      token: { amount: '4250000', denom: 'uist' },
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
