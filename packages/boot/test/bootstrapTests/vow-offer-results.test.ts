import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';
import { loadOrCreateRunUtilsSnapshot } from '../tools/runutils-snapshots.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  const snapshot = await loadOrCreateRunUtilsSnapshot(
    'orchestration-base',
    t.log,
  );
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
    { snapshot },
  );
});
test.after.always(t => t.context.shutdown?.());

test('resolves', async t => {
  const { walletFactoryDriver, buildProposal, evalProposal, runUtils } =
    t.context;
  const flushKernel = () => runUtils.queueAndRun(() => undefined, true);
  const timeStep = async <T>(
    label: string,
    action: () => Promise<T>,
  ): Promise<T> => {
    const start = performance.now();
    try {
      return await action();
    } finally {
      t.log(`${label}: ${(performance.now() - start).toFixed(1)}ms`);
    }
  };

  t.log('start valueVow');
  const startProposal = await timeStep('build start-valueVow proposal', () =>
    buildProposal('@agoric/builders/scripts/testing/start-valueVow.js'),
  );
  await timeStep('eval start-valueVow proposal', () =>
    evalProposal(startProposal),
  );

  t.log('use wallet to get a vow');
  const getter = await timeStep('provide getter wallet', () =>
    walletFactoryDriver.provideSmartWallet('agoric1getter'),
  );
  // *send* b/c execution doesn't resolve until even the vow resolves and that won't happen until the set-value
  await timeStep('send getter offer', () =>
    getter.sendOffer({
      id: 'get-value',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['valueVow'],
        callPipe: [['makeGetterInvitation']],
      },
      proposal: {},
    }),
  );
  // Drain follow-on work triggered by the sendOnly offer before restarting.
  await timeStep('flush kernel after getter offer', flushKernel);

  t.log('confirm the value is not in offer results');
  {
    const statusRecord = getter.getLatestUpdateRecord();
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
  }

  t.log('restart valueVow');
  const restartProposal = await timeStep(
    'build restart-valueVow proposal',
    () => buildProposal('@agoric/builders/scripts/testing/restart-valueVow.js'),
  );
  await timeStep('eval restart-valueVow proposal', () =>
    evalProposal(restartProposal),
  );

  t.log('use wallet to set value');
  const offerArgs = { value: 'Ciao, mondo!' };
  const setter = await timeStep('provide setter wallet', () =>
    walletFactoryDriver.provideSmartWallet('agoric1setter'),
  );
  await timeStep('execute setter offer', () =>
    setter.executeOffer({
      id: 'set-value',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['valueVow'],
        callPipe: [['makeSetterInvitation']],
      },
      offerArgs,
      proposal: {},
    }),
  );
  t.like(setter.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'set-value',
      numWantsSatisfied: 1,
    },
  });

  t.log('confirm the value is now in offer results');
  await timeStep('flush kernel after setter offer', flushKernel);
  {
    const statusRecord = getter.getLatestUpdateRecord();
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
  }
});
