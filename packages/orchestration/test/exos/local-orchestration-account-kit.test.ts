import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import {
  LOCALCHAIN_QUERY_ALL_BALANCES_RESPONSE,
  SIMULATED_ERRORS,
} from '@agoric/vats/tools/fake-bridge.js';
import { heapVowE as VE } from '@agoric/vow/vat.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import type { IBCMsgTransferOptions } from '../../src/cosmos-api.js';
import { PFM_RECEIVER } from '../../src/exos/chain-hub.js';
import fetchedChainInfo from '../../src/fetched-chain-info.js';
import type {
  AmountArg,
  CosmosChainAddress,
  DenomAmount,
} from '../../src/orchestration-api.js';
import { assetOn } from '../../src/utils/asset.js';
import { maxClockSkew } from '../../src/utils/cosmos.js';
import { NANOSECONDS_PER_SECOND } from '../../src/utils/time.js';
import { buildVTransferEvent } from '../../tools/ibc-mocks.js';
import { UNBOND_PERIOD_SECONDS } from '../ibc-mocks.js';
import { commonSetup } from '../supports.js';
import { prepareMakeTestLOAKit } from './make-test-loa-kit.js';

test('deposit, withdraw', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();

  const {
    brands: { bld: stake },
    utils,
  } = common;

  const oneHundredStakePmt = await utils.pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  await VE(account).deposit(oneHundredStakePmt);
  t.deepEqual(await VE(account).getBalance('ubld'), {
    denom: 'ubld',
    value: stake.units(100).value,
  });

  // XXX races in the bridge
  await eventLoopIteration();
  const withdrawal1 = await VE(account).withdraw(stake.units(50));
  t.true(
    AmountMath.isEqual(
      await stake.issuer.getAmountOf(withdrawal1),
      stake.units(50),
    ),
  );

  await t.throwsAsync(
    VE(account).withdraw(stake.units(51)),
    undefined,
    'fails to overwithdraw',
  );
  await t.notThrowsAsync(
    VE(account).withdraw(stake.units(50)),
    'succeeeds at exactly empty',
  );
  await t.throwsAsync(
    VE(account).withdraw(stake.make(1n)),
    undefined,
    'fails to overwithdraw',
  );
});

test('delegate, undelegate', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();

  const {
    bootstrap: { timer },
    brands: { bld },
    utils,
  } = common;

  await VE(account).deposit(await utils.pourPayment(bld.units(100)));

  const validatorAddress = 'agoric1validator1';

  // Because the bridge is fake,
  // 1. these succeed even if funds aren't available
  // 2. there are no return values
  // 3. there are no side-effects such as assets being locked
  await VE(account).delegate(validatorAddress, bld.units(999));
  const undelegateP = VE(account).undelegate(validatorAddress, bld.units(999));
  const completionTime = UNBOND_PERIOD_SECONDS + maxClockSkew;

  const notTooSoon = Promise.race([
    timer.wakeAt(completionTime - 1n).then(() => true),
    undelegateP,
  ]);
  timer.advanceTo(completionTime, 'end of unbonding period');
  t.true(await notTooSoon, "undelegate doesn't resolve before completion_time");
  t.is(
    await undelegateP,
    undefined,
    'undelegate returns void after completion_time',
  );
});

test('transfer', async t => {
  const common = await commonSetup(t);
  const {
    brands: { bld: stake },
    utils: { inspectLocalBridge, pourPayment, transmitVTransferEvent },
  } = common;
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();

  t.truthy(account, 'account is returned');

  const oneHundredStakePmt = await pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  await VE(account).deposit(oneHundredStakePmt);
  t.deepEqual(await VE(account).getBalance('ubld'), {
    denom: 'ubld',
    value: stake.units(100).value,
  });

  const destination: CosmosChainAddress = {
    chainId: 'cosmoshub-4',
    value: 'cosmos1pleab',
    encoding: 'bech32',
  };

  /**
   * Helper to start the transfer without awaiting the result. It await the
   * event loop so the promise starts and increments sequence for use in the
   * acknowledgementPacket bridge message and wants
   * @param amount
   * @param dest
   * @param opts
   */
  const startTransfer = async (
    amount: AmountArg,
    dest: CosmosChainAddress,
    opts: IBCMsgTransferOptions = {},
  ) => {
    const transferP = VE(account).transfer(dest, amount, opts);
    // Ensure the toBridge of the transferP happens before the fromBridge is awaited after this function returns
    await eventLoopIteration();
    return { transferP };
  };

  t.log('.transfer() 1 bld to cosmos using DenomAmount');
  const { transferP } = await startTransfer(
    { denom: 'ubld', value: 1_000_000n },
    destination,
  );
  t.is(await Promise.race([transferP, 'not yet']), 'not yet');
  // simulate incoming message so that the transfer promise resolves
  await transmitVTransferEvent('acknowledgementPacket');
  const transferRes = await transferP;
  t.true(transferRes === undefined, 'Successful transfer returns Vow<void>.');

  t.log('testing timeout packet scenario...');
  const { transferP: timeoutTransferP } = await startTransfer(
    { denom: 'ubld', value: 504n },
    destination,
  );
  await transmitVTransferEvent('timeoutPacket');
  await t.throwsAsync(timeoutTransferP, {
    message: 'transfer operation received timeout packet',
  });

  t.log('testing unknown destination scenario...');
  const unknownDestination: CosmosChainAddress = {
    chainId: 'fakenet',
    value: 'fakenet1pleab',
    encoding: 'bech32',
  };
  // XXX dev has to know not to startTransfer here
  await t.throwsAsync(
    VE(account).transfer(unknownDestination, { denom: 'ubld', value: 1n }),
    { message: 'no connection info found for "agoric-3"<->"fakenet"' },
    'cannot create transfer msg with unknown chainId',
  );

  /**
   * Helper to start the transfer AND send the ack packet so this promise can be awaited
   */
  const doTransfer = async (
    amount: AmountArg,
    dest: CosmosChainAddress,
    opts: IBCMsgTransferOptions = {},
  ) => {
    const { transferP: promise } = await startTransfer(amount, dest, opts);
    await transmitVTransferEvent('acknowledgementPacket');
    return promise;
  };

  const latestTxMsg = () => {
    const tx = inspectLocalBridge().at(-1);
    if (tx.type !== 'VLOCALCHAIN_EXECUTE_TX') {
      throw new Error('last message was not VLOCALCHAIN_EXECUTE_TX');
    }
    return tx.messages[0];
  };

  await t.notThrowsAsync(
    doTransfer({ denom: 'ubld', value: 10n }, destination, {
      memo: 'hello',
    }),
    'can create transfer msg with memo',
  );
  t.like(latestTxMsg(), {
    memo: 'hello',
  });

  await t.notThrowsAsync(
    doTransfer({ denom: 'ubld', value: 10n }, destination, {
      // sets to current time, which shouldn't work in a real env
      timeoutTimestamp: BigInt(new Date().getTime()) * NANOSECONDS_PER_SECOND,
    }),
    'accepts custom timeoutTimestamp',
  );

  await t.notThrowsAsync(
    doTransfer({ denom: 'ubld', value: 10n }, destination, {
      timeoutHeight: { revisionHeight: 100n, revisionNumber: 1n },
    }),
    'accepts custom timeoutHeight',
  );

  const [uusdcOnAgoric] = assetOn(
    'uusdc',
    'noble',
    undefined,
    'agoric',
    fetchedChainInfo,
  );
  const dydxDest: CosmosChainAddress = {
    chainId: 'dydx-mainnet-1',
    encoding: 'bech32',
    value: 'dydx1test',
  };
  const aDenomAmount: DenomAmount = {
    denom: uusdcOnAgoric,
    value: 100n,
  };

  t.log('Transfer handles multi-hop transfers');
  await t.notThrowsAsync(doTransfer(aDenomAmount, dydxDest));

  t.is(latestTxMsg().receiver, PFM_RECEIVER, 'defaults to "pfm" receiver');
  t.deepEqual(JSON.parse(latestTxMsg().memo), {
    forward: {
      receiver: 'dydx1test',
      port: 'transfer',
      channel: 'channel-33',
      retries: 3,
      timeout: '10m',
    },
  });

  t.log('accepts pfm `forwardOpts`');
  const intermediateRecipient: CosmosChainAddress = {
    chainId: 'noble-1',
    value: 'noble1testintermediaterecipient',
    encoding: 'bech32',
  };
  await t.notThrowsAsync(
    doTransfer(aDenomAmount, dydxDest, {
      forwardOpts: {
        timeout: '999m',
        intermediateRecipient,
      },
    }),
  );

  t.is(latestTxMsg().receiver, intermediateRecipient.value);
  t.deepEqual(JSON.parse(latestTxMsg().memo), {
    forward: {
      timeout: '999m',
      channel: 'channel-33',
      port: 'transfer',
      receiver: 'dydx1test',
      retries: 3,
    },
  });

  t.log('testing pfm ack error scenario...');
  const { transferP: pfmTimeoutTransferP } = await startTransfer(
    {
      denom: uusdcOnAgoric,
      value: 500_000n,
    },
    dydxDest,
  );
  const ackErrorMsg =
    'packet-forward-middleware error: giving up on packet on channel (channel-33) port (transfer) after max retries';
  await transmitVTransferEvent('acknowledgementPacket', ackErrorMsg);
  await t.throwsAsync(pfmTimeoutTransferP, {
    message: `ICS20-1 transfer error "${ackErrorMsg}"`,
  });
});

test('monitor transfers', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();
  const {
    mocks: { transferBridge },
    bootstrap: { rootZone },
  } = common;

  let upcallCount = 0;
  const zone = rootZone.subZone('tap');
  const tap: TargetApp = zone.exo('tap', undefined, {
    receiveUpcall: (obj: unknown) => {
      upcallCount += 1;
      t.log('receiveUpcall', obj);
      return Promise.resolve();
    },
  });

  const { value: target } = await VE(account).getAddress();
  // XXX let the PacketTools subscribeToTransfers complete before triggering it
  // again with monitorTransfers
  await eventLoopIteration();

  const appRegistration = await VE(account).monitorTransfers(tap);

  // simulate upcall from golang to VM
  const simulateIncomingTransfer = async () =>
    VE(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: target,
      }),
    );

  await simulateIncomingTransfer();
  t.is(upcallCount, 1, 'first upcall received');
  await simulateIncomingTransfer();
  t.is(upcallCount, 2, 'second upcall received');

  await appRegistration.revoke();
  await simulateIncomingTransfer();
  t.is(upcallCount, 2, 'no more events after app is revoked');
});

test('send', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();
  t.truthy(account, 'account is returned');

  const {
    brands: { bld: stake, ist: stable },
    utils: { pourPayment, inspectLocalBridge },
  } = common;
  const oneHundredStakePmt = await pourPayment(stake.units(100));
  const oneHundredStablePmt = await pourPayment(stable.units(100));
  t.log('deposit 100 bld to account');
  await VE(account).deposit(oneHundredStakePmt);
  t.log('deposit 100 ist to account');
  await VE(account).deposit(oneHundredStablePmt);

  const toAddress = {
    value: 'agoric1EOAAccAddress',
    chainId: 'agoric-3',
    encoding: 'bech32',
  } as const;

  t.log(`send 10 bld to ${toAddress.value}`);
  await VE(account).send(toAddress, stake.units(10));

  // this would normally fail since we do not have ibc/1234 in our wallet,
  // but the mocked localchain bridge doesn't currently know about balances
  t.log(`send 10 ibc/1234 (not in vbank) to ${toAddress.value}`);
  await VE(account).send(toAddress, { denom: 'ibc/1234', value: 10n });

  await t.throwsAsync(
    VE(account).send(toAddress, {
      denom: 'ibc/400',
      value: SIMULATED_ERRORS.BAD_REQUEST,
    }),
    {
      message: 'simulated error',
    },
  );

  t.log(`send 10 bld and 10 ist to ${toAddress.value} via sendAll`);
  await VE(account).sendAll(toAddress, [
    { denom: 'ubld', value: 10_000_000n },
    { denom: 'uist', value: 10_000_000n },
  ]);

  const messages = inspectLocalBridge();
  const executedBankSends = messages.filter(
    m =>
      m.type === 'VLOCALCHAIN_EXECUTE_TX' &&
      m.messages?.[0]?.['@type'] === '/cosmos.bank.v1beta1.MsgSend',
  );
  t.is(
    executedBankSends.length,
    3,
    'sent 2 successful txs and 1 failed. 1 rejected before sending',
  );

  const toAccountId = `cosmos:${toAddress.chainId}:${toAddress.value}` as const;
  t.log(`send 10 bld to ${toAccountId}`);
  await VE(account).send(toAccountId, stake.units(10));

  t.deepEqual(inspectLocalBridge().slice(messages.length), [
    {
      address: 'agoric1fakeLCAAddress',
      messages: [
        {
          '@type': '/cosmos.bank.v1beta1.MsgSend',
          amount: [
            {
              amount: '10000000',
              denom: 'ubld',
            },
          ],
          fromAddress: 'agoric1fakeLCAAddress',
          toAddress: 'agoric1EOAAccAddress',
        },
      ],
      type: 'VLOCALCHAIN_EXECUTE_TX',
    },
  ]);

  await t.throwsAsync(
    VE(account).send(
      { ...toAddress, chainId: 'some-other-chain' },
      stake.units(101),
    ),
    {
      message: 'bank/send cannot send to a different chain "some-other-chain"',
    },
  );
});

test('getBalance', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();
  t.truthy(account, 'account is returned');

  const {
    brands: { bld: stake },
    utils: { pourPayment, inspectLocalBridge },
  } = common;
  const oneHundredStakePmt = await pourPayment(stake.make(100n));
  const expectedBalance = { denom: 'ubld', value: 100n };
  t.log('deposit 100 ubld to account');
  await VE(account).deposit(oneHundredStakePmt);

  t.deepEqual(
    await VE(account).getBalance(stake.brand),
    expectedBalance,
    'getBalance from brand',
  );
  t.deepEqual(
    await VE(account).getBalance('ubld'),
    expectedBalance,
    'getBalance from denom',
  );

  const ibcBalance = await VE(account).getBalance('ibc/1234');
  t.deepEqual(
    ibcBalance,
    { denom: 'ibc/1234', value: 10n },
    'getBalance returns balance of non-vbank denom',
  );

  const moolah = withAmountUtils(makeIssuerKit('MOOLAH'));
  await t.throwsAsync(
    VE(account).getBalance(moolah.brand),
    {
      message: 'No denom for brand: "[Alleged: MOOLAH brand]"',
    },
    'getBalance throws when presented non-vbank brand',
  );

  const localBridgeMessages = inspectLocalBridge();
  const queryMessages = localBridgeMessages.filter(
    x => x.type === 'VLOCALCHAIN_QUERY_MANY',
  );
  t.is(queryMessages.length, 1, 'only sent query for non-vbank DenomArg');
  t.is(
    queryMessages[0].messages[0].denom,
    'ibc/1234',
    'only sent query for ibc/1234',
  );
});

test('getBalances', async t => {
  const common = await commonSetup(t);
  common.utils.populateChainHub();
  const makeTestLOAKit = prepareMakeTestLOAKit(t, common);
  const account = await makeTestLOAKit();
  t.truthy(account, 'account is returned');

  const {
    utils: { inspectLocalBridge },
  } = common;

  t.deepEqual(
    await VE(account).getBalances(),
    LOCALCHAIN_QUERY_ALL_BALANCES_RESPONSE,
  );

  const localBridgeMessages = inspectLocalBridge();
  const queryMessages = localBridgeMessages.filter(
    x => x.type === 'VLOCALCHAIN_QUERY_MANY',
  );
  t.is(queryMessages.length, 1, 'getBalances sends query to cosmos golang');
});
