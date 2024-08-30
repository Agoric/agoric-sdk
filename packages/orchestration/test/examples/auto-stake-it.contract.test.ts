import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { heapVowE } from '@agoric/vow/vat.js';
import path from 'path';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { IBCEvent } from '@agoric/vats';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildVTransferEvent,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'auto-stake-it';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/auto-stake-it.contract.js').start;

test('make accounts, register tap, return invitationMakers', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge },
    utils: { inspectLocalBridge, inspectDibcBridge, transmitTransferAck },
  } = await commonSetup(t);

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
  const publicFacet = await E(zoe).getPublicFacet(autoAutoStakeItKit.instance);

  // make an offer to create an LocalOrchAcct and a CosmosOrchAccount
  const inv = E(publicFacet).makeAccountsInvitation();
  const userSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
    validator: {
      chainId: 'cosmoshub-4',
      value: 'cosmosvaloper1test',
      encoding: 'bech32',
    },
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
      receiver: 'agoric1fakeLCAAddress',
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
      receiver: 'agoric1fakeLCAAddress',
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
      receiver: 'agoric1fakeLCAAddress',
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
      token: {
        amount: '10',
      },
    },
    'tokens transferred from LOA to COA',
  );
  await transmitTransferAck();
  const { acknowledgement } = (await inspectDibcBridge()).bridgeEvents.at(
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
    validator: {
      chainId: 'cosmoshub-4',
      value: 'cosmosvaloper1test',
      encoding: 'bech32',
    },
  });
  const { publicSubscribers: pubSubs2 } =
    await heapVowE(userSeat2).getOfferResult();

  t.regex(pubSubs2.agoric.storagePath.split('.').pop()!, /^agoric/);
  t.regex(pubSubs2.cosmoshub.storagePath.split('.').pop()!, /^cosmos/);
});
