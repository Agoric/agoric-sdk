// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import { decodeBase64, encodeBase64 } from '@endo/base64';

import type { TestFn } from 'ava';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup, SetupContextWithWallets } from './support.js';

import { merkleTreeAPI } from './airdrop-data/merkle-tree/index.js';
import accounts from './airdrop-data/oct21-accounts.js';

import phrases from './phrases.js';
const test = anyTest as TestFn<SetupContextWithWallets>;

const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

const trace = label => value => {
  // console.log(label, ':::', value);
  return value;
};

// const prepareKeyring = async (t, makeWallets = () => keys) => {
//   const keyring = await makeWallets;
//   // console.log({ keyring });

//   const accounts = await keyring.map(async x => {
//     const account = await x.getAccounts().then(res => {
//       return res;
//     });

//     // console.log('account :::: from keyring', account);
//     // console.log('----------------------------------');
//     const res = { ...account[0], key: encodeBase64(account[0].pubkey) };
//     // console.log('withPubkey ::::', res);
//     // console.log('----------------------------------');
//     return res;
//   });
//   // .map(account => {
//   //   const withPubkey = { ...account, key: bytesToHex(account.pubkey) };
//   //   return withPubkey;
//   // });
//   return { accounts, keyring };
// };

test.before(async t => {
  const { startContract, ...setup } = await commonSetup(t);
  console.log({ setup });
  phrases.map(async (x, i) =>
    addKey('user' + i, x).then(res => {
      console.log('res ::::', res);
      console.log('----------------------------------');
      return res;
    }),
  );

  // console.log({ setup });
  t.context = { ...setup };

  await startContract(contractName, contractBuilder);
});

// const wait = (time, cancel = Promise.reject()) =>
//   new Promise((resolve, reject) => {
//     const timer = setTimeout(resolve, time);
//     const noop = () => {};

//     cancel.then(() => {
//       clearTimeout(timer);
//       reject(new Error('Cancelled'));
//     }, noop);
//   });

const runManyOffers = (accountObjects = []) => {
  let eligibleAccounts = accountObjects;

  const makeClaimOffer = async (t, claimerAddress) => {
    const { vstorageClient } = t.context;
    const currentAcct = eligibleAccounts[0];
    const walletCurrent = await vstorageClient.queryData(
      `published.wallet.${currentAcct.address}.current`,
    );
    console.group(
      '################ START makeClaimOffer logger ##############',
    );
    console.log('----------------------------------------');
    console.log('currentAccount ::::', vstorageClient);
    console.log('----------------------------------------');
    console.log('eligibleAccounts ::::', eligibleAccounts);
    console.log(
      '--------------- END makeClaimOffer logger -------------------',
    );
    console.groupEnd();

    eligibleAccounts = eligibleAccounts.slice(1);

    const currentSmartWallet = vstorageClient.walletView(currentAcct.address);

    // console.log('smartWallet ::::', smartWallet);
    // console.log('----------------------------------');

    const offerHandler = await makeDoOffer(currentSmartWallet)({
      id: `offer-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeClaimTokensInvitation']],
      },
      offerArgs: {
        ...makeOfferArgs(currentAcct),
        proof: merkleTreeAPI.generateMerkleProof(
          currentAcct.pubkey.key,
          accountObjects.map(x => x.pubkey.key),
        ),
        tier: createTestTier(),
      },
      proposal: {
        give: {
          Fee: harden({
            brand: istBrand,
            value: 5n,
          }),
        },
      },
    });

    t.log('offerResult', result);
    return offerHandler;
  };

  return { getEligibleAccounts: () => eligibleAccounts, makeClaimOffer };
};

const makeClaimOffer = async (t, eligibleAccounts) => {
  const currentAcct = eligibleAccounts[0];

  eligibleAccounts = eligibleAccounts.slice(1);

  // console.log('smartWallet ::::', smartWallet);
  // console.log('----------------------------------');
  //     const [brands, instances] = await Promise.all([
  //       vstorageClient.queryData('published.agoricNames.brand'),
  //       vstorageClient.queryData('published.agoricNames.instance'),
  //     ]);

  //     console.log('Brands::', brands);

  //     const istBrand = Object.fromEntries(brands).IST;
  const offerHandler = await makeDoOffer(smartWallet)({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeClaimTokensInvitation']],
    },
    offerArgs: {
      ...makeOfferArgs(currentAcct),
      proof: merkleTreeAPI.generateMerkleProof(
        currentAcct.pubkey.key,
        accountObjects.map(x => x.pubkey.key),
      ),
      tier: createTestTier(),
    },
    proposal: {
      give: {
        Fee: harden({
          brand: istBrand,
          value: 5n,
        }),
      },
    },
  });

  const result = await offerHandler;
  t.like(result, {});
  return result;
};
// const wait = time => fn => setTimeout()
test('tester', async t => {
  runManyOffers();
});

// const stressTestMacro = test.macro({
//   title: (_, accounts, frequency, duration) =>
//     `Stress testing ${accounts.length} with ${frequency} over ${duration} ms.`,
//   exec: async (t, accounts, frequency, durationMs) => {
//     const interval = durationMs / frequency; // Calculate the interval between calls
//     for (let i = 0; i < frequency; i++) {
//       setTimeout(async () => {
//         simulateApiCall(t, accounts.pop());
//       }, i * interval);
//     }
//   },
// });

// test.serial(stressTestMacro, accounts, accounts.length, 5000);
// ('offers', t => {
//   // Import your utility functions
//   const makeOfferInterval = (t, accounts) => (frequency, durationMs) => {
//     const interval = durationMs / frequency; // Calculate the interval between calls
//     for (let i = 0; i < frequency; i++) {
//       setTimeout(async () => {
//         try {
//           test('simulateApiCall(t, accounts.pop())', async t => {
//             const res = simulateApiCall(t, accounts.pop());
//             t.deepEqual(res, {});
//             return res;
//           });
//         } catch (error) {
//           console.error('Error during API call:', error);
//         }
//       }, i * interval);
//     }
//   };
//   await makeOfferInterval(t, accounts)(10000n, 50);
// });
test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

// // Example test case
// test('Stress test API interaction: 5 calls over 5 minutes', async t => {
//   const frequency = 5; // Number of calls to simulate
//   const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

//   await stressTestApiCall(frequency, durationMs);

//   t.pass(); // Pass the test if no errors were encountered
// });

// test('Stress test API interaction: 10 calls over 5 minutes', async t => {
//   const frequency = 10; // Number of calls to simulate
//   const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

//   await stressTestApiCall(frequency, durationMs);

//   t.pass(); // Pass the test if no errors were encountered
// });

// Add more test cases as needed
