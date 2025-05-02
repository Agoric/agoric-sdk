import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('executes', async t => {
  const { walletFactoryDriver, buildProposal, evalProposal } = t.context;

  t.log('start valueVow');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/start-valueVow.js'),
  );

  const getterExecutor = await walletFactoryDriver.provideSmartWallet(
    'agoric1getterexecutor',
  );
  console.log('executing script');
  await getterExecutor.executeScript(
    'execute-get-value',
    true,
    `
      const { offers } = powers;
      
      const getResultP = E(offers).executeOffer({
        id: 'get-value',
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['valueVow'],
          callPipe: [['makeGetterInvitation']],
        },
        proposal: {},
      });

      await getResultP;
    `,
  );

  t.log('confirm the value is not in offer results');
  {
    const statusRecord = getterExecutor.getLatestUpdateRecord();
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
  t.log('confirm the getter execution is still active');
  {
    const walletRecord = getterExecutor.getCurrentWalletRecord();
    t.like(walletRecord, {
      activeScriptExecutions: ['execute-get-value'],
    });
  }

  t.log('restart valueVow');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/restart-valueVow.js'),
  );

  t.log('use wallet to set value');
  const setterExecutor = await walletFactoryDriver.provideSmartWallet(
    'agoric1setterexecutor',
  );
  await setterExecutor.executeScript(
    'execute-set-value',
    true,
    ` 
      const { offers } = powers;

      const offerArgs = { value: 'Ciao, mondo!' };
      
      const setResultP = E(offers).executeOffer({
        id: 'set-value',
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['valueVow'],
          callPipe: [['makeSetterInvitation']],
        },
        offerArgs,
        proposal: {},
      });

      await setResultP;
  `,
  );

  t.like(setterExecutor.getLatestUpdateRecord(-2), {
    updated: 'offerStatus',
    status: {
      id: 'set-value',
      numWantsSatisfied: 1,
    },
  });
  t.like(setterExecutor.getLatestUpdateRecord(-1), {
    updated: 'scriptExecutionStatus',
    executionId: 'execute-set-value',
    status: {
      eventType: 'finish',
      success: true,
    },
  });

  t.log('confirm the value is now in offer results');
  {
    const statusRecord = getterExecutor.getLatestUpdateRecord(-2);
    // narrow the type
    assert(statusRecord.updated === 'offerStatus');
    t.true('result' in statusRecord.status, 'got result');
    t.like(statusRecord, {
      status: {
        id: 'get-value',
        result: 'Ciao, mondo!',
      },
      updated: 'offerStatus',
    });
  }
  t.log('confirm the getter execution is no longer active');
  {
    const walletRecord = getterExecutor.getCurrentWalletRecord();
    t.like(walletRecord, {
      activeScriptExecutions: [],
    });

    t.like(getterExecutor.getLatestUpdateRecord(-1), {
      updated: 'scriptExecutionStatus',
      executionId: 'execute-get-value',
      status: {
        eventType: 'finish',
        success: true,
      },
    });
  }
});
