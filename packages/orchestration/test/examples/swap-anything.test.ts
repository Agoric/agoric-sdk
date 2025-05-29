import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { NonNullish } from '@agoric/internal';
import * as contractExports from '../../src/examples/swap-anything.contract.js';
import { commonSetup } from '../supports.js';
import { buildVTransferEvent } from '../../tools/ibc-mocks.js';

const contractName = 'swap-anything';
type StartFn = typeof contractExports.start;

const config = {
  xcsInformation: {
    // A message that we know to be working
    rawMsgNoNextMemo:
      '{"wasm":{"contract":"osmo17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9jfksztgw5uh69wac2pgs5yczr8","msg":{"osmosis_swap":{"output_denom":"uosmo","slippage":{"twap":{"window_seconds":10,"slippage_percentage":"20"}},"receiver":"agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx","on_failed_delivery":"do_nothing"}}}}',
  },
};

const bootstrapOrchestration = async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { bld },
    utils: {
      inspectLocalBridge,
      inspectBankBridge,
      pourPayment,
      transmitTransferAck,
      transmitVTransferEvent,
    },
    mocks: { transferBridge },
  } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );

  const swapKit = await E(zoe).startInstance(
    installation,
    { BLD: bld.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  return {
    bootstrap,
    commonPrivateArgs,
    bld,
    inspectLocalBridge,
    inspectBankBridge,
    pourPayment,
    transmitTransferAck,
    transmitVTransferEvent,
    vt,
    zoe,
    installation,
    storageNode,
    swapKit,
    transferBridge,
  };
};

const buildOfferArgs = rawMsg => {
  const {
    wasm: {
      contract,
      msg: {
        osmosis_swap: {
          receiver,
          output_denom: outDenom,
          slippage: {
            twap: {
              slippage_percentage: slippagePercentage,
              window_seconds: windowSeconds,
            },
          },

          on_failed_delivery: onFailedDelivery,
          next_memo: nextMemo,
        },
      },
    },
  } = JSON.parse(rawMsg);

  return {
    destAddr: contract,
    receiverAddr: receiver,
    outDenom,
    slippage: { slippagePercentage, windowSeconds },
    onFailedDelivery,
    nextMemo,
  };
};

test('swap BLD for Osmo, receiver on Agoric', async t => {
  const {
    vt,
    swapKit,
    zoe,
    pourPayment,
    bld,
    transmitTransferAck,
    inspectLocalBridge,
  } = await bootstrapOrchestration(t);

  const publicFacet = await E(zoe).getPublicFacet(swapKit.instance);
  const inv = E(publicFacet).makeSwapInvitation();
  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'swap');

  const anAmt = bld.units(3.5);
  const Send = await pourPayment(anAmt);
  const offerArgs = buildOfferArgs(config.xcsInformation.rawMsgNoNextMemo);

  const userSeat = await E(zoe).offer(
    inv,
    { give: { Send: anAmt } },
    { Send },
    offerArgs,
  );
  await transmitTransferAck();
  await vt.when(E(userSeat).getOfferResult());

  const history = inspectLocalBridge();
  t.log(history);
  t.like(history, [
    { type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' },
    { type: 'VLOCALCHAIN_EXECUTE_TX' },
  ]);

  t.like(
    history.find(x => x.type === 'VLOCALCHAIN_EXECUTE_TX')?.messages?.[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: offerArgs.destAddr, // XCS contract has to be the one receiving the IBC message
      sender: 'agoric1fakeLCAAddress',
      memo: config.xcsInformation.rawMsgNoNextMemo,
    },
    'crosschain swap sent',
  );
});

test('trigger osmosis swap from an address hook', async t => {
  const {
    bootstrap: { storage },
    transferBridge,
    inspectLocalBridge,
    commonPrivateArgs,
  } = await bootstrapOrchestration(t);
  await eventLoopIteration();

  const { sharedLocalAccount } = commonPrivateArgs.marshaller.fromCapData(
    JSON.parse(
      NonNullish(storage.data.get('mockChainStorageRoot.swap-anything')),
    ),
  );

  t.deepEqual(sharedLocalAccount.value, 'agoric1fakeLCAAddress');

  const memoArgs = buildOfferArgs(config.xcsInformation.rawMsgNoNextMemo);
  t.log(memoArgs);

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      event: 'writeAcknowledgement',
      denom: 'transfer/channel-9/ubld',
      receiver: encodeAddressHook(
        'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
        {
          destAddr: memoArgs.destAddr,
          receiverAddr: memoArgs.receiverAddr,
          outDenom: memoArgs.outDenom,
        },
      ),
      sourceChannel: 'channel-9',
    }),
  );
  await eventLoopIteration();

  const history = inspectLocalBridge();
  t.log(history);

  t.like(
    history.find(x => x.type === 'VLOCALCHAIN_EXECUTE_TX')?.messages?.[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: memoArgs.destAddr, // XCS contract has to be the one receiving the IBC message
      sender: 'agoric1fakeLCAAddress',
      memo: config.xcsInformation.rawMsgNoNextMemo,
    },
    'crosschain swap sent',
  );
});

test('should not execute transfer if query is malformed', async t => {
  const { transferBridge, inspectLocalBridge } =
    await bootstrapOrchestration(t);
  await eventLoopIteration();

  const memoArgs = buildOfferArgs(config.xcsInformation.rawMsgNoNextMemo);
  t.log(memoArgs);

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      event: 'writeAcknowledgement',
      denom: 'transfer/channel-9/ubld',
      receiver: encodeAddressHook(
        'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
        {
          // destAddr: memoArgs.destAddr,
          receiverAddr: memoArgs.receiverAddr,
          outDenom: memoArgs.outDenom,
        },
      ),
      sourceChannel: 'channel-9',
    }),
  );
  await eventLoopIteration();

  t.like(
    inspectLocalBridge(),
    [{ type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' }],
    'crosschain swap not executed',
  );

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      event: 'writeAcknowledgement',
      denom: 'transfer/channel-9/ubld',
      receiver: encodeAddressHook(
        'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
        {
          destAddr: memoArgs.destAddr,
          // receiverAddr: memoArgs.receiverAddr,
          outDenom: memoArgs.outDenom,
        },
      ),
      sourceChannel: 'channel-9',
    }),
  );
  await eventLoopIteration();

  t.like(
    inspectLocalBridge(),
    [{ type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' }],
    'crosschain swap not executed',
  );

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      event: 'writeAcknowledgement',
      denom: 'transfer/channel-9/ubld',
      receiver: encodeAddressHook(
        'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
        {
          destAddr: memoArgs.destAddr,
          receiverAddr: memoArgs.receiverAddr,
          // outDenom: memoArgs.outDenom,
        },
      ),
      sourceChannel: 'channel-9',
    }),
  );
  await eventLoopIteration();

  t.like(
    inspectLocalBridge(),
    [{ type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' }],
    'crosschain swap not executed',
  );
});

test('should recover failed transfer', async t => {
  const {
    vt,
    swapKit,
    zoe,
    pourPayment,
    bld,
    transmitVTransferEvent,
    inspectLocalBridge,
    inspectBankBridge,
  } = await bootstrapOrchestration(t);

  const publicFacet = await E(zoe).getPublicFacet(swapKit.instance);
  const inv = E(publicFacet).makeSwapInvitation();
  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'swap');

  const anAmt = bld.units(3.5);
  const Send = await pourPayment(anAmt);
  const offerArgs = buildOfferArgs(config.xcsInformation.rawMsgNoNextMemo);

  const userSeat = await E(zoe).offer(
    inv,
    { give: { Send: anAmt } },
    { Send },
    offerArgs,
  );

  await transmitVTransferEvent('timeoutPacket');
  await E(userSeat).hasExited();

  const payouts = await E(userSeat).getPayouts();
  t.log('Failed offer payouts', payouts);
  const amountReturned = await bld.issuer.getAmountOf(payouts.Send);
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
    token: { amount: '3500000', denom: 'ubld' },
  });

  t.log('deposit to and withdrawal from LCA is observed in bank bridge');
  const bankHistory = inspectBankBridge();
  t.log('bank bridge', bankHistory);
  t.deepEqual(
    bankHistory[bankHistory.length - 2],
    {
      type: 'VBANK_GIVE',
      recipient: 'agoric1fakeLCAAddress',
      denom: 'ubld',
      amount: '3500000',
    },
    'funds sent to LCA',
  );
  t.deepEqual(
    bankHistory[bankHistory.length - 1],
    {
      type: 'VBANK_GRAB',
      sender: 'agoric1fakeLCAAddress',
      denom: 'ubld',
      amount: '3500000',
    },
    'funds withdrawn from LCA in catch block',
  );
});

test.todo('should throw when Osmosis not connected');
