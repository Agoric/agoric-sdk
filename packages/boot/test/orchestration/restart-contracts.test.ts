/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { TestFn } from 'ava';

import type { CosmosValidatorAddress } from '@agoric/orchestration';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

// FIXME the test needs to be able to send the acknowledgementPacket ack
// so that the transfer vow resolves.
test.serial.failing('sendAnywhere', async t => {
  const {
    walletFactoryDriver,
    buildProposal,
    evalProposal,
    bridgeUtils: { flushInboundQueue },
  } = t.context;

  const { IST } = t.context.agoricNamesRemotes.brand;

  t.log('start sendAnywhere');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/start-sendAnywhere.js'),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  // no money in wallet to actually send
  const zero = { brand: IST, value: 0n };
  // send because it won't resolve
  await wallet.sendOffer({
    id: 'send-somewhere',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['sendAnywhere'],
      callPipe: [['makeSendInvitation']],
    },
    proposal: {
      // @ts-expect-error XXX BoardRemote
      give: { Send: zero },
    },
    offerArgs: {
      // meaningless address
      destAddr: 'cosmos1qy352eufjjmc9c',
      chainName: 'cosmoshub',
    },
  });
  // no errors and no resolution
  const beforeFlush = wallet.getLatestUpdateRecord();
  t.like(wallet.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'send-somewhere',
      error: undefined,
    },
    numWantsSatisfied: undefined,
    payouts: undefined,
    result: undefined,
  });

  t.is(await flushInboundQueue(), 0);
  t.deepEqual(wallet.getLatestUpdateRecord(), beforeFlush);

  t.log('restart sendAnywhere');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/restart-sendAnywhere.js'),
  );

  const conclusion = wallet.getLatestUpdateRecord();
  console.log('conclusion', conclusion);
  t.like(conclusion, {
    updated: 'offerStatus',
    status: {
      id: 'send-somewhere',
      error: undefined,
    },
    numWantsSatisfied: undefined,
    payouts: undefined,
    result: undefined,
  });

  await flushInboundQueue();

  // Nothing interesting to confirm here.
});

const validatorAddress: CosmosValidatorAddress = {
  value: 'cosmosvaloper1test',
  chainId: 'gaiatest',
  encoding: 'bech32',
};

// check for key because the value will be 'undefined' when the result is provided
// TODO should it be something truthy?
const hasResult = (r: UpdateRecord) => {
  assert(r.updated === 'offerStatus');
  return 'result' in r.status;
};

// Tests restart but not of an orchestration() flow
test.serial('stakeAtom', async t => {
  const {
    buildProposal,
    evalProposal,
    agoricNamesRemotes,
    bridgeUtils: { flushInboundQueue },
    readLatest,
  } = t.context;

  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js'),
  );

  const wd = await t.context.walletFactoryDriver.provideSmartWallet(
    'agoric1testStakAtom',
  );

  await wd.sendOffer({
    id: 'request-account',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeAtom'],
      callPipe: [['makeAccountInvitationMaker']],
    },
    proposal: {},
  });
  // cosmos1test is from ibc/mocks.js
  const accountPath = 'published.stakeAtom.accounts.cosmos1test';
  t.throws(() => readLatest(accountPath));
  t.is(await flushInboundQueue(), 1);
  t.is(readLatest(accountPath), '');
  // request-account is complete

  const { ATOM } = agoricNamesRemotes.brand;
  assert(ATOM);

  await wd.sendOffer({
    id: 'request-delegate',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-account',
      invitationMakerName: 'Delegate',
      invitationArgs: [validatorAddress, { brand: ATOM, value: 10n }],
    },
    proposal: {},
  });
  // no result yet because the IBC incoming messages haven't arrived
  // and won't until we flush.
  t.false(hasResult(wd.getLatestUpdateRecord()));

  t.log('restart stakeAtom');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/restart-stakeAtom.js'),
  );

  t.is(await flushInboundQueue(), 1);
  t.true(hasResult(wd.getLatestUpdateRecord()));
});

// Tests restart of an orchestration() flow while an IBC response is pending.
//
// TODO consider testing this pausing during any pending IBC message. It'll need
// to fresh contract state on each iteration, and since this is a bootstrap test
// that means either restarting bootstrap or starting a new contract and
// restarting that one. For them to share bootstrap they'll each need a unique
// instance name, which will require paramatizing the the two builders scripts
// and the two core-eval functions.
test.serial('basicFlows', async t => {
  const {
    walletFactoryDriver,
    buildProposal,
    evalProposal,
    bridgeUtils: { getInboundQueueLength, flushInboundQueue },
  } = t.context;

  t.log('start basicFlows');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-basic-flows.js'),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  const id1 = 'make-orch-account';
  // send because it won't resolve
  await wallet.sendOffer({
    id: id1,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    proposal: {},
    offerArgs: {
      chainName: 'cosmoshub',
    },
  });
  // no errors and no result yet
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id1,
      error: undefined,
      numWantsSatisfied: 1,
      payouts: {},
      result: undefined, // no property
    },
  });
  t.is(getInboundQueueLength(), 1);

  const id2 = 'makePortfolio';
  await wallet.sendOffer({
    id: id2,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makePortfolioAccountInvitation']],
    },
    proposal: {},
    offerArgs: {
      chainNames: ['agoric', 'cosmoshub'],
    },
  });
  // no errors and no result yet
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id2,
      error: undefined,
      numWantsSatisfied: 1,
      payouts: {},
      result: undefined, // no property
    },
  });
  t.is(getInboundQueueLength(), 2);

  t.log('restart basicFlows');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/restart-basic-flows.js'),
  );

  t.log('flush and verify results');
  const beforeFlush = wallet.getLatestUpdateRecord();
  t.like(beforeFlush, {
    status: {
      result: undefined,
    },
  });
  t.is(await flushInboundQueue(1), 1);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id1,
      error: undefined,
      result: 'UNPUBLISHED',
    },
  });
  t.is(await flushInboundQueue(1), 1);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id2,
      error: undefined,
      result: 'UNPUBLISHED',
    },
  });
});
