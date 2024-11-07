// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, SetupContextWithWallets } from './support.js';
import { MNEMONICS_SET_1 } from './2500.js';

const test = anyTest as TestFn<SetupContextWithWallets>;
const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

test.serial('setupExistingAccounts::', async t => {
  const { setupSpecificKeys } = await commonSetup(t);

  const accounts = await setupSpecificKeys('account')(MNEMONICS_SET_1);

  t.deepEqual(accounts.length === MNEMONICS_SET_1, true);
});

test.skip('startContract::', async t => {
  const { startContract } = await commonSetup(t);

  await startContract(contractName, contractBuilder);

  t.pass('contect started');
});
