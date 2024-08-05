import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { heapVowE } from '@agoric/vow/vat.js';
import path from 'path';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type { IBCEvent } from '@agoric/vats';
import type { TestFn } from 'ava';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildVTransferEvent,
  parseOutgoingTxPacket,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'auto-stake-it';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/auto-stake-it.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>> & {
  zoe: ZoeService;
  instanceKit: StartedInstanceKit<StartFn>;
};

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  const common = await commonSetup(t);
  const {
    bootstrap: { storage },
    commonPrivateArgs,
  } = common;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const autoAutoStakeItKit = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    { ...commonPrivateArgs, storageNode },
  );
  t.context = {
    ...common,
    zoe,
    instanceKit: autoAutoStakeItKit,
  };
});

const defaultValidator = {
  chainId: 'cosmoshub-4',
  value: 'cosmosvaloper1test',
  encoding: 'bech32',
};

test('auto-stake-it - make accounts, register tap, return invitationMakers', async t => {
  t.log('bootstrap, orchestration core-eval');

  const {
    mocks: { transferBridge },
    utils: { inspectLocalBridge, inspectDibcBridge },
    zoe,
    instanceKit: { publicFacet },
  } = t.context;

  // make an offer to create an LocalOrchAcct and a CosmosOrchAccount
  const inv = E(publicFacet).makeAccountsInvitation();
  const userSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
    validator: defaultValidator,
    // TODO user supplied until #9211
    localDenom: 'ibc/fakeuatomhash',
  });
  const result = await heapVowE(userSeat).getOfferResult();

  const {
    publicSubscribers: { agoric, cosmoshub },
  } = result;

  const loaAddress = agoric.storagePath.split('.').pop()!;
  const icaAddress = cosmoshub.storagePath.split('.').pop()!;
  t.regex(loaAddress, /^agoric/);
  t.regex(icaAddress, /^cosmos/);

  // simulate incoming transfers with upcall from golang to VM to initiate the
  // incoming transfer Tap
  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: loaAddress,
      amount: 10n,
      denom: 'unknown-token',
    }),
  );
  await eventLoopIteration();
  {
    const { messages } = inspectLocalBridge().at(-1);
    // we do not expect to see MsgTransfer for unknown tokens
    t.not(messages?.length, 1, 'unknown-token is ignored');
  }

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: loaAddress,
      amount: 10n,
      denom: 'unknown-token',
      sourceChannel: 'channel-0',
    }),
  );
  await eventLoopIteration();
  {
    const { messages } = inspectLocalBridge().at(-1);
    // we do not expect to see MsgTransfer for an sourceChannel
    t.not(messages?.length, 1, 'unknown sourceChannel is ignored');
  }

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: loaAddress,
      amount: 10n,
      denom: 'uatom',
    }),
  );
  await eventLoopIteration();

  const { messages, address: execAddr } = inspectLocalBridge().at(-1);
  t.is(messages?.length, 1, 'transfer message sent');
  t.like(
    messages[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'cosmos1test',
      sender: execAddr,
      sourceChannel: 'channel-5',
      token: { amount: '10', denom: 'ibc/fakeuatomhash' },
    },
    'tokens transferred from LOA to COA',
  );
  const { acknowledgement } = (await inspectDibcBridge()).at(
    -1,
  ) as IBCEvent<'acknowledgementPacket'>;
  // XXX consider checking ICA (dest|source)_channel, to verify the sender of
  // MsgDelegate, once available in vstorage
  t.is(
    acknowledgement,
    buildMsgResponseString(MsgDelegateResponse, {}),
    'COA delegated the received funds',
  );

  // second user can make an account
  const inv2 = E(publicFacet).makeAccountsInvitation();
  const userSeat2 = E(zoe).offer(inv2, {}, undefined, {
    chainName: 'cosmoshub',
    validator: defaultValidator,
    // TODO user supplied until #9211
    localDenom: 'ibc/fakeuatomhash',
  });
  const { publicSubscribers: pubSubs2 } =
    await heapVowE(userSeat2).getOfferResult();

  t.regex(pubSubs2.agoric.storagePath.split('.').pop()!, /^agoric/);
  t.regex(pubSubs2.cosmoshub.storagePath.split('.').pop()!, /^cosmos/);
});

test('holder can update delegator in staking tap', async t => {
  const {
    zoe,
    instanceKit: { publicFacet },
    mocks: { transferBridge },
    utils: { inspectDibcBridge },
  } = t.context;
  const inv = E(publicFacet).makeAccountsInvitation();
  const makeAccountSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
    validator: {
      ...defaultValidator,
      value: 'cosmosvaloper1testinitial',
    },
    // TODO user supplied until #9211
    localDenom: 'ibc/fakeuatomhash',
  });
  const { publicSubscribers, invitationMakers } =
    await heapVowE(makeAccountSeat).getOfferResult();

  const loaAddress = publicSubscribers.agoric.storagePath.split('.').pop();
  const coaAddress = publicSubscribers.cosmoshub.storagePath.split('.').pop();

  // use custom invitation makers provided to portfolio-holder-kit
  const newValidator = defaultValidator;
  const updateValidatorInv =
    // @ts-expect-error how can we tell GuardedKit about this method?
    await E(invitationMakers).UpdateValidator(newValidator);

  t.is(
    await heapVowE(E(zoe).offer(updateValidatorInv)).getOfferResult(),
    undefined,
  );

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: loaAddress,
    }),
  );
  await eventLoopIteration();
  const { packet } = (await inspectDibcBridge()).at(
    -1,
  ) as IBCEvent<'acknowledgementPacket'>;
  const { messages } = parseOutgoingTxPacket(packet.data);
  const { delegatorAddress, validatorAddress } = MsgDelegate.decode(
    messages[0].value,
  );
  t.is(delegatorAddress, coaAddress!);
  t.is(validatorAddress, newValidator.value);
});

test('holder can cancel autostake tap', async t => {
  const {
    zoe,
    instanceKit: { publicFacet },
    mocks: { transferBridge },
    utils: { inspectDibcBridge, inspectLocalBridge },
  } = t.context;
  const inv = E(publicFacet).makeAccountsInvitation();
  const makeAccountSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
    validator: defaultValidator,
    // TODO user supplied until #9211
    localDenom: 'ibc/fakeuatomhash',
  });
  const { publicSubscribers, invitationMakers } =
    await heapVowE(makeAccountSeat).getOfferResult();
  const loaAddress = publicSubscribers.agoric.storagePath.split('.').pop();

  await E(transferBridge).fromBridge(
    buildVTransferEvent({
      receiver: loaAddress,
    }),
  );

  const cancelAutoStakeInv =
    // @ts-expect-error how can we tell GuardedKit about this method?
    await E(invitationMakers).CancelAutoStake();

  t.is(
    await heapVowE(E(zoe).offer(cancelAutoStakeInv)).getOfferResult(),
    undefined,
  );
  // a normal application flow wouldn't throw, but this is seems to be the best
  // we can do wrt to mocking for now
  await t.throwsAsync(
    E(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: loaAddress,
      }),
    ),
    { message: `"targetToApp" not found: "${loaAddress}"` },
  );
});
