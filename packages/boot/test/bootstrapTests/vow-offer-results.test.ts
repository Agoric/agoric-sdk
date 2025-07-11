import type { TestFn } from 'ava';

import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '@aglocal/boot/test/bootstrapTests/walletFactory.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  t.context = await makeWalletFactoryContext({
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
  });
});
test.after.always(t => t.context.swingsetTestKit.shutdown?.());

test('resolves', async t => {
  const {
    swingsetTestKit: { evaluateCoreProposal, runUntilQueuesEmpty },
    walletFactoryDriver: { provideSmartWallet },
  } = t.context;

  console.log('start valueVow');
  await evaluateCoreProposal(
    await buildProposal('@agoric/builders/scripts/testing/start-valueVow.js'),
  );

  console.log('use wallet to get a vow');
  const getter = await provideSmartWallet('agoric1getter');

  console.log('executing offer');
  // *send* b/c execution doesn't resolve until even the vow resolves and that won't happen until the set-value
  await getter.sendOffer({
    id: 'get-value',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['valueVow'],
      callPipe: [['makeGetterInvitation']],
    },
    proposal: {},
  });

  // Ensure the offer has executed. Without this there's work in the
  // crank when the contract is restarted below.
  await runUntilQueuesEmpty();

  console.log('confirm the value is not in offer results');
  let statusRecord = getter.getLatestUpdateRecord();
  t.like(statusRecord, {
    status: {
      id: 'get-value',
      numWantsSatisfied: 1,
    },
    updated: 'offerStatus',
  });
  // narrow the type
  assert(statusRecord.updated === 'offerStatus');
  t.false('result' in statusRecord.status, 'no result yet');

  console.log('restart valueVow');
  await evaluateCoreProposal(
    await buildProposal('@agoric/builders/scripts/testing/restart-valueVow.js'),
  );

  console.log('use wallet to set value');
  const offerArgs = { value: 'Ciao, mondo!' };
  const setter = await provideSmartWallet('agoric1setter');
  await setter.executeOffer({
    id: 'set-value',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['valueVow'],
      callPipe: [['makeSetterInvitation']],
    },
    offerArgs,
    proposal: {},
  });
  t.like(setter.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'set-value',
      numWantsSatisfied: 1,
    },
  });

  console.log('confirm the value is now in offer results');

  // Ensure the getter vow has had time to resolved.
  await runUntilQueuesEmpty();

  statusRecord = getter.getLatestUpdateRecord();
  // narrow the type
  assert(statusRecord.updated === 'offerStatus');
  t.true('result' in statusRecord.status, 'got result');
  t.like(statusRecord, {
    status: {
      id: 'get-value',
      result: offerArgs.value,
    },
    updated: 'offerStatus',
  });
});
