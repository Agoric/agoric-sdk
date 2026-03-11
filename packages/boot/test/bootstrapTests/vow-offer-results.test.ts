import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeBootTestContext,
  withWalletFactory,
  type WalletFactoryBootTestContext,
} from '../tools/boot-test-context.js';

const test: TestFn<WalletFactoryBootTestContext> = anyTest;

test.before(async t => {
  t.context = await withWalletFactory(
    await makeBootTestContext(t, {
      configSpecifier:
        '@agoric/vm-config/decentral-itest-orchestration-config.json',
      fixtureName: 'vow-offer-results',
    }),
  );
});
test.after.always(t => t.context.shutdown?.());

test('resolves', async t => {
  const { applyProposal, provideSmartWallet, runUtils } = t.context;
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
  await timeStep('apply start-valueVow proposal', () =>
    applyProposal('@agoric/builders/scripts/testing/start-valueVow.js'),
  );

  t.log('use wallet to get a vow');
  const getter = await timeStep('provide getter wallet', () =>
    provideSmartWallet('agoric1getter'),
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
    const statusRecord = getter.expectStatus(t, {
      id: 'get-value',
      numWantsSatisfied: 1,
    });
    t.is(statusRecord.updated, 'offerStatus');
    // narrow the type
    assert(statusRecord.updated === 'offerStatus');
    t.false('result' in statusRecord.status, 'no result yet');
  }

  t.log('restart valueVow');
  await timeStep('apply restart-valueVow proposal', () =>
    applyProposal('@agoric/builders/scripts/testing/restart-valueVow.js'),
  );

  t.log('use wallet to set value');
  const offerArgs = { value: 'Ciao, mondo!' };
  const setter = await timeStep('provide setter wallet', () =>
    provideSmartWallet('agoric1setter'),
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
  setter.expectStatus(t, { id: 'set-value', numWantsSatisfied: 1 });

  t.log('confirm the value is now in offer results');
  await timeStep('flush kernel after setter offer', flushKernel);
  getter.expectResult(t, 'get-value', offerArgs.value);
});
