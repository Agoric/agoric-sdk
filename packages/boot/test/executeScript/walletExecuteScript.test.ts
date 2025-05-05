import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '@aglocal/fast-usdc-deploy/test/walletFactory.ts';
import { makeSimulation } from '@aglocal/fast-usdc-deploy/test/fu-sim-iter.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

const readRelativeFile = (filename: string) =>
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), filename),
    'utf-8',
  );

test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test.serial('executes', async t => {
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
    readRelativeFile('execute-get-value.script.mjs'),
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

test.serial.failing('Buy FastLP with IST', async t => {
  const { walletFactoryDriver } = t.context;

  const sim = await makeSimulation(t.context);

  await sim.beforeDeploy(t);
  const instance = await sim.deployContract(t.context);
  t.truthy(instance);
  await sim.beforeIterations(t);

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1buyfastlp');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey: 'ATOM', // Tests are wired for ATOM collateral
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });

  console.log('executing script');
  // XXX can we get the `success` value from the script execution status?
  await wd.executeScript(
    'execute-buy-fastlp',
    true,
    readRelativeFile('execute-buy-fastlp.script.mjs'),
  );

  t.log('confirm the execution is no longer active');
  {
    const walletRecord = wd.getCurrentWalletRecord();
    t.like(walletRecord, {
      activeScriptExecutions: [],
    });

    t.like(wd.getLatestUpdateRecord(-1), {
      updated: 'scriptExecutionStatus',
      status: {
        eventType: 'finish',
        success: true,
      },
    });
  }
});
