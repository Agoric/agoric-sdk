// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { makeDoOffer, provisionSmartWallet } from '../tools/e2e-tools.js';
import { commonSetup, SetupContextWithWallets } from './support.js';
import { addresses, defaultMerkleObject } from './airdrop-data/oct21-keys.js';
import phrases from './airdrop-data/keypairs/twenty.js';

import ADMIN_ACCOUNT from './tg-account.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

test.before(async t => {
  const {
    deleteTestKeys,
    startContract,
    setupSpecificKeys,
    vstorageClient,
    ...setup
  } = await commonSetup(t);

  await startContract(contractName, contractBuilder);

  const [brands, instances] = await Promise.all([
    vstorageClient.queryData('published.agoricNames.brand'),
    vstorageClient.queryData('published.agoricNames.instance'),
  ]);

  t.log('Added' + phrases.length + ' keys to keyring');
  // await startContract(contractName, contractBuilder);

  t.context = {
    ...setup,
    instances: Object.fromEntries(instances),
    brands,
    istBrand: Object.fromEntries(brands).IST,
    vstorageClient,
    deleteTestKeys,
  };
});

const defaultAcct = {
  pubkey: { key: '' },
  address: 'agoric12d3fault',
};

const makeOfferArgs = (account = defaultAcct) => ({
  key: account.pubkey.key,
  proof: defaultMerkleObject.getProof(account),
  address: account.address,
  tier: createTestTier(),
});

const makeDoOfferHandler = async (
  useChain,
  currentAccount,
  wallet,
  feeAmount,
) => {
  console.log(
    'claiming for account::',
    currentAccount.address,
    'pubkey',
    currentAccount.pubkey,
  );

  const doOffer = makeDoOffer(wallet);
  const startTime = performance.now();

  await doOffer({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeClaimTokensInvitation']],
    },
    offerArgs: makeOfferArgs(currentAccount),
    // proof: defaultMerkleObject.getProof(currentAccount),
    // tier: createTestTier(),

    proposal: {
      give: {
        Fee: feeAmount,
      },
    },
  });

  const duration = performance.now() - startTime;
  return { ...currentAccount, duration, wallet };
};

const handleAccountBalanceQuery = async (
  t,
  address = '',
  chainName = 'agoric',
) => {
  const { useChain } = t.context;
  const agQueryClient = makeQueryClient(
    await useChain('agoric').getRestEndpoint(),
  );
  const { balances } = await queryClient.queryBalances(address);

  return { balances };
};
test.serial(
  'tribblesAirdrop ### makeClaimTokensInvitation: happy path',
  async t => {
    const { useChain, istBrand } = t.context;

    const wallet = await provisionSmartWallet(ADMIN_ACCOUNT.address, {
      BLD: 1000,
      IST: 1000,
    });

    const queryClient = makeQueryClient(
      await useChain('agoric').getRestEndpoint(),
    );
    const { balances } = await queryClient.queryBalances(addr);

    await makeDoOfferHandler(
      useChain,
      ADMIN_ACCOUNT,
      wallet,
      harden({ brand: istBrand, value: 5n }),
    );
    const walletCurrent = await vstorageClient.queryData(
      `published.wallet.${ADMIN_ACCOUNT.address}.current`,
    );

    t.is(balances, walletCurrent);
  },
);

const claimAirdropMacro = async (t, addressRange = [0, 1], delay) => {
  const [start, end] = addressRange;
  const { provisionSmartWallet, useChain, istBrand } = t.context;
  const durations = [];

  // Make multiple API calls with the specified delay
  for (let i = start; i < end; i++) {
    const currentAccount = defaultMerkleObject.getAccount(addresses[i]);
    console.log('Curren Acccount', currentAccount);
    console.log('----------------------------------');
    console.log('Current iteration::', i);
    const wallet = await provisionSmartWallet(currentAccount.address, {
      IST: 250000n,
      BLD: 5000n,
    });
    // picking off duration and address
    // this can be used to inspect the validity of offer results, however it comes at the expense
    // of a failing test halting execution & destroying duration data
    const { duration, address } = await makeDoOfferHandler(
      useChain,
      currentAccount,
      wallet,
      harden({ value: 5n, brand: istBrand }),
    );

    durations.push(duration);

    // Assert that the response matches the expected output

    console.group('######### CHECKING TRIBBLES ALLOCATION #######');
    console.log('----------------------------------');
    console.log('currentAccount.address ::::', address);
    console.log('----------------------------------');

    // Wait for the specified delay before making the next call
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return durations;
};

test.skip('makeClaimTokensInvitation offers ### start: accounts[20] || end: accounts[24] ### offer interval: 10000ms', async t => {
  const claimRange = [20, 24];
  const durations = await claimAirdropMacro(t, claimRange, 10000);
  console.log('INTANCE', t.context.instances);
  t.deepEqual(durations.length === 4, true);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
});

test.skip('makeClaimTokensInvitation offers ### start: accounts[25] || end: accounts[29] ### offer interval: 5000ms', async t => {
  const claimRange = [25, 29];
  const durations = await claimAirdropMacro(t, claimRange, 5000);
  t.deepEqual(durations.length === 4, true);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
});
