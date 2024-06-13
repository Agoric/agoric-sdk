import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';

import { mustMatch } from '@endo/patterns';
import { makeIssuerKit } from '@agoric/ertp';
import { CosmosChainInfo, IBCConnectionInfo } from '../../src/cosmos-api.js';
import { commonSetup } from '../supports.js';
import { SingleAmountRecord } from '../../src/examples/sendAnywhere.contract.js';
import { registerChain } from '../../src/utils/chainHub.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'sendAnywhere';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/sendAnywhere.contract.js').start;

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

test('single amount proposal shape (keyword record)', async t => {
  const { brand } = makeIssuerKit('IST');
  const amt = harden({ brand, value: 1n });
  const cases = harden({
    good: [{ Kw: amt }],
    bad: [
      { give: { Kw1: amt, Kw2: amt }, msg: /more than 1/ },
      { give: {}, msg: /fail negated pattern: {}/ },
      { give: { Kw: 123 }, msg: /Must be a copyRecord/ },
      { give: { Kw: { brand: 1, value: 1n } }, msg: /Must be a remotable/ },
    ],
  });
  for (const give of cases.good) {
    t.notThrows(() => mustMatch(give, SingleAmountRecord));
  }
  for (const { give, msg } of cases.bad) {
    t.throws(() => mustMatch(give, SingleAmountRecord), {
      message: msg,
    });
  }
});

test('send using arbitrary chain info', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { ist },
    utils: { inspectLocalBridge, pourPayment },
  } = await commonSetup(t);

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
      prefix: {
        key_prefix: 'aWJj',
      },
    },
    transferChannel: {
      counterPartyChannelId: 'channel-1',
      channelId: 'channel-0',
      ...txChannelDefaults,
    },
  } as IBCConnectionInfo;
  const chainName = await E(sendKit.creatorFacet).addChain(
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
    await E(userSeat).getOfferResult();

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
    await E(userSeat).getOfferResult();
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
    await E(userSeat).getOfferResult();
    const history = inspectLocalBridge();
    const { messages, address: execAddr } = history.at(-1);
    t.is(messages.length, 1);
    const [txfr] = messages;
    t.log('local bridge', txfr);
    t.like(txfr, {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'hot1destAddr',
      sender: execAddr,
      sourceChannel: 'channel-0',
      token: { amount: '4250000', denom: 'uist' },
    });
  }
});
