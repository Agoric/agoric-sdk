import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  eventLoopIteration,
  inspectMapStore,
} from '@agoric/internal/src/testing-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import {
  MsgTransfer,
  MsgTransferResponse,
} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { IBCMethod } from '@agoric/vats';
import { SIMULATED_ERRORS } from '@agoric/vats/tools/fake-bridge.js';
import { protoMsgMocks, UNBOND_PERIOD_SECONDS } from '../ibc-mocks.js';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildVTransferEvent,
  parseOutgoingTxPacket,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/staking-combinations.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/staking-combinations.contract.js').start;

test('start', async t => {
  const {
    bootstrap: { timer, vowTools: vt },
    brands: { bld },
    mocks: { ibcBridge, transferBridge },
    utils: { inspectDibcBridge, pourPayment },
    commonPrivateArgs,
  } = await commonSetup(t);

  let contractBaggage;
  const { zoe, bundleAndInstall } = await setUpZoeForTest({
    setJig: ({ baggage }) => {
      contractBaggage = baggage;
    },
  });
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    // TODO use atom https://github.com/Agoric/agoric-sdk/issues/9966
    { Stake: bld.issuer },
    {},
    commonPrivateArgs,
  );

  const inv = E(publicFacet).makeAccount();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Make an ICA account',
  );

  const userSeat = await E(zoe).offer(
    inv,
    {},
    {},
    {
      chainName: 'cosmoshub',
    },
  );

  const result = await vt.when(E(userSeat).getOfferResult());
  t.like(result, {
    publicSubscribers: {
      account: {
        description: 'Staking Account holder status',
        storagePath: 'mockChainStorageRoot.cosmos1test',
      },
    },
  });

  // use Deposit and Delegate to fund the ICA account and delegate
  const depositAndDelegateInv = await E(
    result.invitationMakers,
  ).DepositAndDelegate();

  // ensure there's a denom for Stake brand
  // TODO use atom https://github.com/Agoric/agoric-sdk/issues/9966
  await E(creatorFacet).registerAsset('ubld', {
    chainName: 'agoric',
    baseName: 'agoric',
    baseDenom: 'ubld',
    brand: bld.brand,
  });

  ibcBridge.addMockAck(
    // Delegate 100 ubld from cosmos1test to cosmosvaloper1test observed in console
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0VkV0pzWkJJRE1UQXciLCJtZW1vIjoiIn0=',
    protoMsgMocks.delegate.ack,
  );

  // TODO use atom https://github.com/Agoric/agoric-sdk/issues/9966
  const stakeAmount = bld.make(100n);

  const depositAndDelegateUserSeat = await E(zoe).offer(
    depositAndDelegateInv,
    {
      give: { Stake: stakeAmount },
      exit: { waived: null },
    },
    {
      Stake: await pourPayment(stakeAmount),
    },
    {
      validator: {
        chainId: 'cosmoshub',
        value: 'cosmosvaloper1test',
        encoding: 'bech32',
      },
    },
  );

  // wait for targetApp to exist
  await eventLoopIteration();
  // similar transfer ack
  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: 'cosmos1test',
      sender: 'agoric1fakeLCAAddress',
      amount: 100n,
      denom: 'ubld',
      sourceChannel: 'channel-5',
      sequence: 1n,
    }),
  );

  const depositAndDelegateResult = await vt.when(
    E(depositAndDelegateUserSeat).getOfferResult(),
  );
  t.is(depositAndDelegateResult, undefined);

  // Undelegate the funds using the guest flow
  ibcBridge.addMockAck(
    // observed in console
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xZS0pTOWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxeloxVnVaR1ZzWldkaGRHVVNMUW9MWTI5emJXOXpNWFJsYzNRU0VHOXpiVzkyWVd4dmNHVnlNWFJsYzNRYURBb0ZkVzl6Ylc4U0F6RXdNQT09IiwibWVtbyI6IiJ9',
    protoMsgMocks.undelegate.ack,
  );
  ibcBridge.addMockAck(
    // MsgTransfer from cosmos1test to osmo1receiver observed in console
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ25nS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWtzS0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xURTBNUm9NQ2dWMWIzTnRieElETVRBd0lndGpiM050YjNNeGRHVnpkQ29OYjNOdGJ6RnlaV05sYVhabGNqSUFPSUNRK0lTZ21nRT0iLCJtZW1vIjoiIn0=',
    buildMsgResponseString(MsgTransferResponse, { sequence: 0n }),
  );
  const destination = {
    chainId: 'osmosis-1',
    value: 'osmo1receiver',
    encoding: 'bech32',
  };
  const undelegateAndTransferInv = await E(
    result.invitationMakers,
  ).UndelegateAndTransfer(
    [
      {
        validator: {
          value: 'osmovaloper1test',
          encoding: 'bech32',
          chainId: 'osmosis',
        },
        amount: { denom: 'uosmo', value: 100n },
      },
    ],
    destination,
  );
  t.like(await E(zoe).getInvitationDetails(undelegateAndTransferInv), {
    description: 'Undelegate and transfer',
  });

  const undelegateUserSeat = await E(zoe).offer(undelegateAndTransferInv);

  // Wait for the unbonding period
  timer.advanceBy(UNBOND_PERIOD_SECONDS * 1000n);

  const undelegateResult = await vt.when(
    E(undelegateUserSeat).getOfferResult(),
  );
  t.is(undelegateResult, undefined);

  const { bridgeDowncalls } = await inspectDibcBridge();
  const { messages } = parseOutgoingTxPacket(
    (bridgeDowncalls.at(-1) as IBCMethod<'sendPacket'>).packet.data,
  );
  const transferMsg = MsgTransfer.decode(messages[0].value);
  t.like(
    transferMsg,
    {
      receiver: 'osmo1receiver',
      sourcePort: 'transfer',
      token: {
        amount: '100',
        denom: 'uosmo',
      },
      memo: '',
    },
    'undelegateAndTransfer sent MsgTransfer',
  );

  // snapshot the resulting contract baggage
  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');

  {
    t.log('payments from failed transfers are returned');
    const bldAmt = bld.make(SIMULATED_ERRORS.TIMEOUT);

    const seat = await E(zoe).offer(
      await E(result.invitationMakers).DepositAndDelegate(),
      {
        give: { Stake: bldAmt },
        exit: { waived: null },
      },
      {
        Stake: await pourPayment(bldAmt),
      },
      {
        validator: {
          chainId: 'cosmoshub',
          value: 'cosmosvaloper1test',
          encoding: 'bech32',
        },
      },
    );
    await t.throwsAsync(vt.when(E(seat).getOfferResult()), {
      message:
        'ibc transfer failed "[Error: simulated unexpected MsgTransfer packet timeout]"',
    });
    await vt.when(E(seat).hasExited());
    const payouts = await E(seat).getPayouts();
    t.deepEqual(
      await bld.issuer.getAmountOf(payouts.Stake),
      bldAmt,
      'Stake is returned',
    );
  }
});
