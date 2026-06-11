import type { TestFn } from 'ava';
import anyTest from '@endo/ses-ava/prepare-endo.js';
import { AmountMath } from '@agoric/ertp';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { makeQueryClient } from '../tools/query.js';
import { commonSetup, type SetupContextWithWallets } from './support.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['user1'];

const contractName = 'basicFlows';
const contractBuilder =
  '../packages/builders/scripts/orchestration/init-basic-flows.js';
const assetName = 'BLD';
const assetDenom = 'ubld';

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...common, wallets };
  await startContract(contractName, contractBuilder, commonBuilderOpts);
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

test('Deposit BLD to orchAccount and then withdraw', async t => {
  const {
    wallets,
    provisionSmartWallet,
    vstorageClient,
    retryUntilCondition,
    useChain,
  } = t.context;

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.user1;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 200n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const doOffer = makeDoOffer(wdUser);

  // Create orchAccount
  const makeAccountOfferId = `makeAccount-${Date.now()}`;
  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: { chainName: 'agoric' },
    proposal: {},
  });

  // Wait for the orchAccount to be created
  const { offerToPublicSubscriberPaths } = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
    result =>
      Object.fromEntries(result.offerToPublicSubscriberPaths)[
        makeAccountOfferId
      ],
    'makeAccount offer result is in vstorage',
  );

  // TODO type `offerToPublicSubscriberPaths` #10214 (OrchAccount)
  const accountStoragePath = Object.fromEntries(offerToPublicSubscriberPaths)[
    makeAccountOfferId
  ]!.account;
  const lcaAddress = accountStoragePath.split('.').at(-1);
  t.truthy(lcaAddress, 'Account address is in storage path');

  // Get BLD brand
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const assetBrand = Object.fromEntries(brands)[assetName];

  // Deposit BLD to orchAccount
  const depositValue = 100_000_000n;
  const depositAmount = AmountMath.make(assetBrand, depositValue);
  const depositOfferId = `deposit-${Date.now()}`;
  await doOffer({
    id: depositOfferId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: makeAccountOfferId,
      invitationMakerName: 'Deposit',
    },
    offerArgs: {},
    proposal: {
      give: { Asset: depositAmount },
    },
  });

  // Verify deposit
  const apiUrl = await useChain('agoric').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);

  const lcaBalanceAfterDeposit = await retryUntilCondition(
    () => queryClient.queryBalance(lcaAddress, assetDenom),
    ({ balance }) =>
      balance?.denom === assetDenom && balance?.amount === String(depositValue),
    'Deposit reflected in localOrchAccount balance',
  );
  t.deepEqual(lcaBalanceAfterDeposit.balance, {
    denom: assetDenom,
    amount: String(depositValue),
  });

  const driverBalanceAfterDeposit = await retryUntilCondition(
    () => queryClient.queryBalance(agoricAddr, assetDenom),
    ({ balance }) => balance?.denom === assetDenom,
    'Driver account balance is available after deposit',
  );
  if (!driverBalanceAfterDeposit.balance) {
    throw Error(`Driver account ${assetDenom} balance unavailable`);
  }
  const driverBalanceBeforeWithdraw = BigInt(
    driverBalanceAfterDeposit.balance.amount,
  );

  // Withdraw BLD from orchAccount
  const withdrawValue = 50_000_000n;
  const withdrawAmount = AmountMath.make(assetBrand, withdrawValue);
  const withdrawOfferId = `withdraw-${Date.now()}`;
  await doOffer({
    id: withdrawOfferId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: makeAccountOfferId,
      invitationMakerName: 'Withdraw',
    },
    offerArgs: {},
    proposal: {
      want: { Asset: withdrawAmount },
    },
  });

  // Verify withdrawal
  const lcaBalanceAfterWithdrawValue = depositValue - withdrawValue;
  const lcaBalanceAfterWithdraw = await retryUntilCondition(
    () => queryClient.queryBalance(lcaAddress, assetDenom),
    ({ balance }) =>
      balance?.denom === assetDenom &&
      balance?.amount === String(lcaBalanceAfterWithdrawValue),
    'Withdraw reflected in localOrchAccount balance',
  );
  t.deepEqual(lcaBalanceAfterWithdraw.balance, {
    denom: assetDenom,
    amount: String(lcaBalanceAfterWithdrawValue),
  });

  const driverBalanceAfterWithdraw = await retryUntilCondition(
    () => queryClient.queryBalance(agoricAddr, assetDenom),
    ({ balance }) => {
      if (balance?.denom !== assetDenom) return false;
      return BigInt(balance.amount) > driverBalanceBeforeWithdraw;
    },
    'Withdraw reflected in driverAccount balance',
  );
  if (!driverBalanceAfterWithdraw.balance) {
    throw Error(`Driver account ${assetDenom} balance unavailable`);
  }
  t.is(driverBalanceAfterWithdraw.balance.denom, assetDenom);
});

test.todo('Deposit and Withdraw ATOM/OSMO to localOrchAccount via offer #9966');

test('Attempt to withdraw more than available balance', async t => {
  const { wallets, provisionSmartWallet, vstorageClient, retryUntilCondition } =
    t.context;

  // Provision the Agoric smart wallet
  const agoricAddr = wallets.user1;
  const wdUser = await provisionSmartWallet(agoricAddr, {
    BLD: 100n,
  });
  t.log(`Provisioned Agoric smart wallet for ${agoricAddr}`);

  const doOffer = makeDoOffer(wdUser);

  // Create orchAccount
  const makeAccountOfferId = `makeLocalAccount-${Date.now()}`;
  await doOffer({
    id: makeAccountOfferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: { chainName: 'agoric' },
    proposal: {},
  });

  // Wait for the orchAccount to be created
  const { offerToPublicSubscriberPaths } = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
    result =>
      Object.fromEntries(result.offerToPublicSubscriberPaths)[
        makeAccountOfferId
      ],
    `${makeAccountOfferId} offer result is in vstorage`,
  );

  const accountStoragePath = Object.fromEntries(offerToPublicSubscriberPaths)[
    makeAccountOfferId
  ]?.account;
  const lcaAddress = accountStoragePath.split('.').at(-1);
  t.truthy(lcaAddress, 'Account address is in storage path');

  // Get BLD brand
  const brands = await vstorageClient.queryData('published.agoricNames.brand');
  const assetBrand = Object.fromEntries(brands)[assetName];

  // Attempt to withdraw more than available balance
  const excessiveWithdrawAmount = AmountMath.make(assetBrand, 200n);
  const withdrawOfferId = `withdraw-error-${Date.now()}`;
  await doOffer({
    id: withdrawOfferId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: makeAccountOfferId,
      invitationMakerName: 'Withdraw',
    },
    offerArgs: {},
    proposal: {
      want: { Asset: excessiveWithdrawAmount },
    },
  });

  // Verify that the withdrawal failed
  const offerResult = await retryUntilCondition(
    () => vstorageClient.queryData(`published.wallet.${agoricAddr}`),
    ({ status }) => status.id === withdrawOfferId && status.error !== undefined,
    'Withdrawal offer error is in vstorage',
  );
  t.regex(
    offerResult.status.error,
    /Error: One or more withdrawals failed \["\[Error: cannot grab 200ubld coins: (spendable balance )?(0ubld)? is smaller than 200ubld: insufficient funds\]"\]/,
  );
});
