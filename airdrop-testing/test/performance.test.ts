import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup, SetupContextWithWallets } from './support.js';
import AIRDROP_DATA from './keyring.js';
import { merkleTreeAPI } from './airdrop-data/merkle-tree/index.js';

const test = anyTest as TestFn<SetupContextWithWallets, Brand>;
const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

test.before(async t => {
  const setup = await commonSetup(t);

  // example usage. comment out after first run
  //  await setupSpecificKeys(MNEMONICS_SET_1);
  const [brands] = await Promise.all([
    setup.vstorageClient.queryData('published.agoricNames.brand'),
  ]);

  t.context = {
    ...setup,
    brands,
  };
});

const makeDoOfferHandler = async (
  _useChain,
  currentAccount,
  wallet,
  feeAmount,
) => {
  console.log(
    'claiming foxr account::',
    currentAccount.address,
    'pubkey',
    currentAccount.pubkey,
  );

  const doOffer = makeDoOffer(wallet);

  const proof = merkleTreeAPI.generateMerkleProof(
    currentAccount.pubkey.key,
    AIRDROP_DATA.pubkeys,
  );
  const offerArgs = {
    proof,
    address: currentAccount.address,
    key: currentAccount.pubkey.key,
    tier: createTestTier(),
  };
  // const offerArgs2 = makeOfferArgs(currentAccount);
  console.group(
    '################ START makeDoOfferHandler logger ##############',
  );
  console.log('----------------------------------------');
  console.log('proof ::::', proof);
  console.log('----------------------------------------');
  console.log('offerArgs ::::', offerArgs);
  console.log(
    '--------------- END makeDoOfferHandler logger -------------------',
  );
  console.groupEnd();
  const startTime = performance.now();

  await doOffer({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeClaimTokensInvitation']],
    },
    offerArgs,
    proposal: {
      give: {
        Fee: feeAmount,
      },
    },
  });

  const duration = performance.now() - startTime;
  return { ...currentAccount, duration, wallet };
};

const makeClaimAirdropMacro =
  accounts =>
  async (t, addressRange = [0, 1], delay) => {
    const [start, end] = addressRange;
    const { provisionSmartWallet, useChain, istBrand } = t.context;
    const durations: number[] = [];

    // Make multiple API calls with the specified delay
    for (let i = start; i < end; i++) {
      const currentAccount = accounts[i];
      console.log('Curren Acccount', currentAccount);
      console.log('Current iteration::', i);
      const wallet = await provisionSmartWallet(currentAccount.address, {
        IST: 1000n,
        BLD: 50n,
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

      console.log('----------------------------------');
      console.log('currentAccount.address ::::', address);
      console.log('----------------------------------');

      // Wait for the specified delay before making the next call
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return durations;
  };

const claimAirdropMacro = makeClaimAirdropMacro(AIRDROP_DATA.accounts);

test.serial(
  'makeClaimTokensInvitation offers ### start: accounts[3] || end: accounts[4] ### offer interval: 3000ms',
  async t => {
    const claimRange = [15, 4];
    const durations = await claimAirdropMacro(t, claimRange, 3000);
    t.log('Durations for all calls', durations);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', durations);
    console.log('----------------------------------------');
    console.log('claimRange ::::', claimRange);
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(durations.length === 10, true);
  },
);
const newLocal = provisionSmartWallet =>
  AIRDROP_DATA.accounts.slice(5, 15).map(async accountData => {
    const wallet = await provisionSmartWallet(accountData.address);
    return wallet;
  });

test.serial(
  'makeClaimTokensInvitation offers ### start: accounts[5] || end: accounts[15] ### offer interval: 3000ms',
  async t => {
    const claimRange = [5, 15];

    const durations = await claimAirdropMacro(t, claimRange, 3000);
    t.log('Durations for all calls', durations);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', durations);
    console.log('----------------------------------------');
    console.log('claimRange ::::', claimRange);
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(durations.length === 10, true);
  },
);

test.skip('makeClaimTokensInvitation offers ### start: accounts[25] || end: accounts[29] ### offer interval: 3500ms', async t => {
  const claimRange = [25, 29];
  const durations = await claimAirdropMacro(t, claimRange, 3500);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
  t.deepEqual(durations.length === 4, true);
});

test.skip('makeClaimTokensInvitation offers ### start: accounts[40] || end: accounts[90] ### offer interval: 6000ms', async t => {
  const claimRange = [40, 90];
  const durations = await claimAirdropMacro(t, claimRange, 6000);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
  t.deepEqual(durations.length === 50, true);
});
