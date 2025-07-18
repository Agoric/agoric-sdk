import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import { mustMatch } from '@endo/patterns';
import { registerChain } from '../../src/chain-info.js';
import type {
  CosmosChainInfo,
  IBCConnectionInfo,
} from '../../src/cosmos-api.js';
import * as contractExports from '../../src/examples/send-anywhere.contract.js';
import { SingleNatAmountRecord } from '../../src/examples/send-anywhere.contract.js';
import { commonSetup } from '../supports.js';

const contractName = 'sendAnywhere';
type StartFn = typeof contractExports.start;

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
      {
        give: {},
        msg:
          // TODO https://github.com/Agoric/agoric-sdk/issues/11605
          // This is a golden error message test. We're currently in transition
          // from having pattern error messages quote nested patterns using
          // `q` to quoting them using `qp`. In order to tolerate both during
          // this transition at reasonable cost, this golden error message
          // pattern accepts anything in the position of the quoted nested
          // pattern.
          /fail negated pattern: (.*)/,
      },
      { give: { Kw: 123 }, msg: /Must be a copyRecord/ },
      { give: { Kw: { brand: 1, value: 1n } }, msg: /Must be a remotable/ },
    ],
  });
  for (const give of cases.good) {
    t.notThrows(() => mustMatch(give, SingleNatAmountRecord));
  }
  for (const { give, msg } of cases.bad) {
    t.throws(() => mustMatch(give, SingleNatAmountRecord), {
      message: msg,
    });
  }
});

const bootstrapOrchestration = async t => {
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
    await bundleAndInstall(contractExports);

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );
  const sendKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );
  return {
    bootstrap,
    commonPrivateArgs,
    ist,
    inspectLocalBridge,
    pourPayment,
    transmitTransferAck,
    vt,
    zoe,
    installation,
    storageNode,
    sendKit,
  };
};

test('send using arbitrary chain info', async t => {
  const {
    bootstrap,
    commonPrivateArgs,
    ist,
    inspectLocalBridge,
    pourPayment,
    transmitTransferAck,
    vt,
    zoe,
    installation,
    storageNode,
    sendKit,
  } = await bootstrapOrchestration(t);

  const hotChainInfo = harden({
    bech32Prefix: 'hot',
    chainId: 'hot-new-chain-0',
    namespace: 'cosmos',
    reference: 'hot-new-chain-0',
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

  const usdcKit = withAmountUtils(makeIssuerKit('USDC'));
  t.log('another contract uses the now well-known hot chain');
  const orchKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer, USDC: usdcKit.issuer },
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
  }
});

test('baggage', async t => {
  const {
    commonPrivateArgs,
    brands: { ist },
  } = await commonSetup(t);

  let contractBaggage;
  const setJig = ({ baggage }) => {
    contractBaggage = baggage;
  };
  const { bundleAndInstall, zoe } = await setUpZoeForTest({
    setJig,
  });

  await E(zoe).startInstance(
    await bundleAndInstall(contractExports),
    { Stable: ist.issuer },
    {},
    commonPrivateArgs,
  );

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});

test('failed ibc transfer returns give', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { ist },
    utils: {
      inspectLocalBridge,
      pourPayment,
      inspectBankBridge,
      transmitVTransferEvent,
    },
  } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );
  const sendKit = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.log('client sends an ibc transfer we expect will timeout');

  const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
  const inv = E(publicFacet).makeSendInvitation();
  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'send');

  const anAmt = ist.make(504n);
  const Send = await pourPayment(anAmt);
  const userSeat = await E(zoe).offer(
    inv,
    { give: { Send: anAmt } },
    { Send },
    { destAddr: 'cosmos1destAddr', chainName: 'cosmoshub' },
  );

  await transmitVTransferEvent('timeoutPacket');
  await E(userSeat).hasExited();
  const payouts = await E(userSeat).getPayouts();
  t.log('Failed offer payouts', payouts);
  const amountReturned = await ist.issuer.getAmountOf(payouts.Send);
  t.log('Failed offer Send amount', amountReturned);
  t.deepEqual(anAmt, amountReturned, 'give is returned');

  await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
    message:
      'IBC Transfer failed "[Error: transfer operation received timeout packet]"',
  });

  t.log('ibc MsgTransfer was attempted from a local chain account');
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
    sender: execAddr,
    sourcePort: 'transfer',
    token: { amount: '504', denom: 'uist' },
  });

  t.log('deposit to and withdrawal from LCA is observed in bank bridge');
  const bankHistory = inspectBankBridge();
  t.log('bank bridge', bankHistory);
  t.deepEqual(
    bankHistory[bankHistory.length - 2],
    {
      type: 'VBANK_GIVE',
      recipient: 'agoric1fakeLCAAddress',
      denom: 'uist',
      amount: '504',
    },
    'funds sent to LCA',
  );
  t.deepEqual(
    bankHistory[bankHistory.length - 1],
    {
      type: 'VBANK_GRAB',
      sender: 'agoric1fakeLCAAddress',
      denom: 'uist',
      amount: '504',
    },
    'funds withdrawn from LCA in catch block',
  );
});

test('non-vbank asset presented is returned', async t => {
  t.log('bootstrap, orchestration core-eval');
  const { bootstrap, commonPrivateArgs } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const moolah = withAmountUtils(makeIssuerKit('MOO'));

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );
  const sendKit = await E(zoe).startInstance(
    installation,
    { MOO: moolah.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
  const inv = E(publicFacet).makeSendInvitation();

  const anAmt = moolah.make(10n);
  const Moo = moolah.mint.mintPayment(anAmt);
  const userSeat = await E(zoe).offer(
    inv,
    { give: { Moo: anAmt } },
    { Moo },
    { destAddr: 'cosmos1destAddr', chainName: 'cosmoshub' },
  );

  await t.throwsAsync(vt.when(E(userSeat).getOfferResult()), {
    message:
      '[object Alleged: MOO brand guest wrapper] not registered in ChainHub',
  });

  await E(userSeat).tryExit();
  const payouts = await E(userSeat).getPayouts();
  const amountReturned = await moolah.issuer.getAmountOf(payouts.Moo);
  t.deepEqual(anAmt, amountReturned, 'give is returned');
});

test('rejects multi-asset send', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { ist, bld },
    utils: { pourPayment },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );
  const sendKit = await E(zoe).startInstance(
    installation,
    { BLD: bld.issuer, IST: ist.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
  const inv = E(publicFacet).makeSendInvitation();

  const tenBLD = bld.make(10n);
  const tenIST = ist.make(10n);

  await t.throwsAsync(
    E(zoe).offer(
      inv,
      { give: { BLD: tenBLD, IST: tenIST } },
      { BLD: await pourPayment(tenBLD), IST: await pourPayment(tenIST) },
      { destAddr: 'cosmos1destAddr', chainName: 'cosmoshub' },
    ),
    {
      message:
        '"send" proposal: give: Must not have more than 1 properties: {"BLD":{"brand":"[Alleged: BLD brand]","value":"[10n]"},"IST":{"brand":"[Alleged: IST brand]","value":"[10n]"}}',
    },
  );
});

test('send to Noble', async t => {
  const {
    commonPrivateArgs,
    ist,
    inspectLocalBridge,
    pourPayment,
    transmitTransferAck,
    vt,
    zoe,
    installation,
    storageNode,
    sendKit,
  } = await bootstrapOrchestration(t);

  t.log('client uses contract to send to noble');
  {
    const publicFacet = await E(zoe).getPublicFacet(sendKit.instance);
    const anAmt = ist.units(3.5);
    const Send = await pourPayment(anAmt);
    const userSeat = await E(zoe).offer(
      E(publicFacet).makeSendInvitation(),
      { give: { Send: anAmt } },
      { Send },
      { destAddr: 'nobleDestAddr', chainName: 'noble' },
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
      receiver: 'nobleDestAddr',
      sender: execAddr,
      sourceChannel: 'channel-62',
      sourcePort: 'transfer',
      token: { amount: '3500000', denom: 'uist' },
    });
  }

  const usdcKit = withAmountUtils(makeIssuerKit('USDC'));
  await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer, USDC: usdcKit.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );
});
