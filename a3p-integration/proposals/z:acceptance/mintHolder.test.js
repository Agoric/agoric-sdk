/* eslint-env node */

import test from 'ava';
import {
  addUser,
  getUser,
  evalBundles,
  getISTBalance,
  provisionSmartWallet,
  ATOM_DENOM,
} from '@agoric/synthetic-chain';
import { NonNullish } from '@agoric/internal';
import {
  replaceTemplateValuesInFile,
  upgradeContract,
} from './test-lib/utils.js';

const USDC_DENOM = NonNullish(process.env.USDC_DENOM);
const SUBMISSION_DIR = 'mint-test-submission';

test.serial('mintHolder BLD contract is upgraded', async t => {
  const receiver = await addUser('receiver');
  const label = 'BLD';

  await provisionSmartWallet(
    receiver,
    `20000000ubld,10000000${ATOM_DENOM},10000000${USDC_DENOM}`,
  );

  const balanceBefore = await getISTBalance(receiver, 'ubld');
  t.is(balanceBefore, 10, 'receiver balance should have 20 BLD');

  await upgradeContract('upgrade-mintHolder-bld', label);

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: receiver,
    LABEL: label,
  });

  await evalBundles(SUBMISSION_DIR);

  const balanceAfter = await getISTBalance(receiver, 'ubld');
  t.is(balanceAfter, 20, 'receiver balance should have 20 BLD');
});

test.serial('mintHolder ATOM contract is upgraded', async t => {
  const receiver = await getUser('receiver');
  const label = 'ATOM';

  const balanceBefore = await getISTBalance(receiver, ATOM_DENOM);
  t.is(balanceBefore, 10, 'receiver balance should have 10 ATOM');

  await upgradeContract('upgrade-mintHolder-atom', label);

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: receiver,
    LABEL: label,
  });

  await evalBundles(SUBMISSION_DIR);

  const balanceAfter = await getISTBalance(receiver, ATOM_DENOM);
  t.is(balanceAfter, 20, 'receiver balance should have 20 ATOM');
});

test.serial('mintHolder USDC contract is upgraded', async t => {
  const receiver = await getUser('receiver');
  const label = 'USDC';

  const balanceBefore = await getISTBalance(receiver, USDC_DENOM);
  t.is(balanceBefore, 10, 'receiver balance should have 10 USDC');

  await upgradeContract('upgrade-mintHolder-usdc', label);

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: receiver,
    LABEL: label,
  });

  await evalBundles(SUBMISSION_DIR);

  const balanceAfter = await getISTBalance(receiver, USDC_DENOM);
  t.is(balanceAfter, 20, 'receiver balance should have 20 USDC');
});
