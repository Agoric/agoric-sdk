/* eslint-disable jsdoc/require-param */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { E } from '@endo/far';
import path from 'path';
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import { IBCEvent } from '@agoric/vats';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { ContinuingOfferResult } from '@agoric/smart-wallet/src/types.js';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildTxPacketString,
} from '../../tools/ibc-mocks.js';
import { CosmosValidatorAddress } from '../../src/cosmos-api.js';
import { defaultMockAckMap } from '../ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'restake';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn = typeof import('../../src/examples/restake.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>> & {
  zoe: ZoeService;
  instance: Instance<StartFn>;
};

const test = anyTest as TestFn<TestContext>;

test.before(async t => {
  const setupContext = await commonSetup(t);
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { ibcBridge },
  } = setupContext;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation = await bundleAndInstall(contractFile);

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const { instance } = await E(zoe).startInstance(
    installation,
    undefined,
    {
      minimumDelay: 10n,
      minimumInterval: 20n, // for testing only
    },
    { ...commonPrivateArgs, storageNode },
  );

  const buildMocks = () => {
    const withdrawReward = buildTxPacketString([
      MsgWithdrawDelegatorReward.toProtoMsg({
        delegatorAddress: 'cosmos1test',
        validatorAddress: 'cosmosvaloper1test',
      }),
    ]);
    const wdRewardResp = buildMsgResponseString(
      MsgWithdrawDelegatorRewardResponse,
      {
        amount: [{ denom: 'uatom', amount: '10' }],
      },
    );
    return { ...defaultMockAckMap, [withdrawReward]: wdRewardResp };
  };
  await E(ibcBridge).setMockAck(buildMocks());

  t.context = {
    ...setupContext,
    zoe,
    instance,
  };
});

const defaultValidator: CosmosValidatorAddress = {
  value: 'cosmosvaloper1test',
  chainId: 'cosmoshub-test',
  encoding: 'bech32',
};

test('restake contract schedules claimRewards() and delegate() on an interval', async t => {
  const {
    bootstrap: { vowTools: vt, timer },
    zoe,
    instance,
    utils: { inspectDibcBridge },
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const inv = E(publicFacet).makeRestakeAccountInvitation();

  const userSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
  });
  const { invitationMakers, publicSubscribers } = (await vt.when(
    E(userSeat).getOfferResult(),
  )) as ContinuingOfferResult;
  t.is(
    publicSubscribers.account.storagePath,
    'mockChainStorageRoot.restake.cosmos1test',
  );

  // Delegate, so we have some rewards to claim
  const delegateInv = await E(invitationMakers).Delegate(defaultValidator, {
    denom: 'uatom',
    value: 10n,
  });
  const delegateSeat = E(zoe).offer(delegateInv, {});
  await vt.when(E(delegateSeat).getOfferResult());

  const restakeInv = await E(invitationMakers).Restake(defaultValidator, {
    delay: 10n,
    interval: 20n,
  });
  const restakeSeat = await E(zoe).offer(restakeInv);
  await vt.when(E(restakeSeat).getOfferResult());

  /** verify WithdrawReward and Delegate acknowledgements */
  const verifyWithdrawAndDelegate = (
    events: IBCEvent<any>[],
    label: string,
  ) => {
    const withdrawRewardAck = events.at(
      -2,
    ) as IBCEvent<'acknowledgementPacket'>;
    console.log('withdrawRewardAck', withdrawRewardAck);
    t.is(
      withdrawRewardAck.acknowledgement,
      buildMsgResponseString(MsgWithdrawDelegatorRewardResponse, {
        amount: [{ denom: 'uatom', amount: '10' }],
      }),
      `Account withdrew rewards - ${label}`,
    );

    const delegateAck = events.at(-1) as IBCEvent<'acknowledgementPacket'>;
    t.is(
      delegateAck.acknowledgement,
      buildMsgResponseString(MsgDelegateResponse, {}),
      `Account delegated the claimed rewards - ${label} `,
    );
  };

  {
    t.log('Advance timer past first wake');
    timer.advanceTo(32n);
    await eventLoopIteration();
    const { bridgeEvents } = await inspectDibcBridge();
    // ChannelOpen, Delegate, WithdrawReward, Delegate
    t.is(bridgeEvents.length, 4);
    verifyWithdrawAndDelegate(bridgeEvents, 'first iteration');
  }

  {
    // repeater continues to fire
    timer.advanceTo(64n);
    await eventLoopIteration();
    const { bridgeEvents } = await inspectDibcBridge();
    t.is(bridgeEvents.length, 6);
    verifyWithdrawAndDelegate(bridgeEvents, 'second iteration');
  }

  t.log('Cancel the restake repeater');
  const cancelInv = await E(invitationMakers).CancelRestake();
  const cancelSeat = await E(zoe).offer(cancelInv);
  await vt.when(E(cancelSeat).getOfferResult());

  {
    timer.advanceTo(96n);
    await eventLoopIteration();
    const { bridgeEvents } = await inspectDibcBridge();
    t.is(bridgeEvents.length, 6, 'no more events after cancel');
  }

  t.log('contract enforces minimum intervals');
  await t.throwsAsync(
    E(invitationMakers).Restake(defaultValidator, {
      delay: 1n,
      interval: 2n,
    }),
    { message: 'delay must be at least "[10n]"' },
  );
  await t.throwsAsync(
    E(invitationMakers).Restake(defaultValidator, {
      delay: 10n,
      interval: 2n,
    }),
    { message: 'interval must be at least "[20n]"' },
  );
});

test.todo('if wake handler fails, repeater still continues');
test.todo('contract restart behavior');
