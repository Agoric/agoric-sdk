import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, type SetupContextWithWallets } from '../support.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricSender', 'agoricReceiver'];

const contractName = 'payments';
const contractBuilder =
  '../packages/payments/scripts/init-payments.js';

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  console.log('WALLETS', wallets);
  t.context = { ...common, wallets };
  await startContract(contractName, contractBuilder, commonBuilderOpts, { skipInstanceCheck: true });
});

test('check-vstorage-for-local-account', async t => {
  const { vstorageClient } = t.context;

  const {
    hookAccount: { value: baseAddress },
  } = await vstorageClient.queryData('published.spikePayments');
  t.regex(baseAddress, /^agoric1/, 'LOA address is valid');
});