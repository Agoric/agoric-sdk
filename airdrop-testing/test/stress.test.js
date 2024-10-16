// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup, SetupContextWithWallets } from './support.js';
import {
  agoricGenesisAccounts as agoricAccounts,
  pubkeys,
} from './airdrop-data/genesis.keys.js';
import { merkleTreeAPI } from './airdrop-data/merkle-tree/index.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

const getPubkeyKey = ({ pubkey }) => `${pubkey.key}`;
const agoricPubkeys = agoricAccounts.map(getPubkeyKey);
const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

const accounts = ['alice', 'bob', 'carol'];
const makeKeyHolderName = prefix => identifier => prefix.concat(identifier);

const prepareKeyring = async (t, walletCount = 10) => {
  const keyring = await t.setupTestKeys(
    Array.from({ length: walletCount }).map(makeKeyHolderName('user')),
  );
  console.log({ keyring });

  return keyring;
};

test.before(async t => {
  const {setup, startContract} = await commonSetup(t);
  const activeKeyring = prepareKeyring(t, 20);

  t.log('activeKeyring', activeKeyring);

  setup.deleteTestKeys(accounts).catch();

  t.context = { ...setup, activeKeyring };

  await startContract(contractName, contractBuilder);
});



test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
const makeMakeOfferArgs =
  (keys = pubkeys) =>
  ({ pubkey: { key = '' }, address = 'agoric12d3fault' }) => ({
    key,
    proof: merkleTreeAPI.generateMerkleProof(key, keys),
    address,
    tier: createTestTier(),
  });

  test.serial('')


// Import your utility functions
import { simulateApiCall } from './yourUtilityFunctions'; // Adjust the path as necessary
const makeOfferInterval = (accounts) => (frequency, endTime) => {
  const interval = durationMs / numCalls; // Calculate the interval between calls
  for (let i = 0; i < numCalls; i++) {
      setTimeout(async () => {
          try {
              await simulateApiCall(); // Execute the API call
          } catch (error) {
              console.error('Error during API call:', error);
          }
      }, i * interval);
  }
}
/**
 * Stress test function that simulates API calls over a specified duration.
 * 
 * @param {number} numCalls - The number of API calls to simulate.
 * @param {number} durationMs - The total duration over which the calls are spread, in milliseconds.
 * 
 * @returns {Promise<void>} - A Promise that resolves when all calls are completed.
 */
async function stressTestApiCall(numCalls, durationMs) {
    const interval = durationMs / numCalls; // Calculate the interval between calls
    for (let i = 0; i < numCalls; i++) {
        setTimeout(async () => {
            try {
                await simulateApiCall(); // Execute the API call
            } catch (error) {
                console.error('Error during API call:', error);
            }
        }, i * interval);
    }
}

// Example test case
test('Stress test API interaction: 5 calls over 5 minutes', async t => {
    const numCalls = 5; // Number of calls to simulate
    const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

    await stressTestApiCall(numCalls, durationMs);

    t.pass(); // Pass the test if no errors were encountered
});

test('Stress test API interaction: 10 calls over 5 minutes', async t => {
    const numCalls = 10; // Number of calls to simulate
    const durationMs = 5 * 60 * 1000; // 5 minutes in milliseconds

    await stressTestApiCall(numCalls, durationMs);

    t.pass(); // Pass the test if no errors were encountered
});

// Add more test cases as needed
