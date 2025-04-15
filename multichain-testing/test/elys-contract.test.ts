import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import type { SetupContextWithWallets } from './support.js';
import { commonSetup } from './support.js';


const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricAdmin', 'cosmoshub', 'elys', 'stride'];

const contractName = 'ElysContract';
const contractBuilder =
  '../packages/builders/scripts/testing/init-elys-contract.js';

test.before(async t => {
  const { setupTestKeys, ...common } = await commonSetup(t);
  const { commonBuilderOpts, deleteTestKeys, startContract } = common;
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...common, wallets };
  await startContract(contractName, contractBuilder, commonBuilderOpts, {
    skipInstanceCheck: true,
  });
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

test('Elys contract is successfully installed', async t => {
  const { vstorageClient } = t.context;
  
  // Check if the ElysContract instance is registered in agoricNames
  const instances = Object.fromEntries(
    await vstorageClient.queryData('published.agoricNames.instance')
  );
  
  t.truthy(
    instances[contractName], 
    `${contractName} is registered in agoricNames instances`
  );
});

test('Elys contract has a valid address in vstorage', async t => {
  const { vstorageClient, retryUntilCondition } = t.context;
  
  // Check for the presence of the address in the ElysContract storage path
  const addressData = await retryUntilCondition(
    () => vstorageClient.queryData(`published.${contractName}.address`),
    (result) => result !== undefined,
    `${contractName} address is available in vstorage`,
    { maxRetries: 20, retryIntervalMs: 3000 }
  );
  
  t.log('Elys contract address data:', addressData);
  
  // No need to parse if it's already an object
  const addressObj = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
  t.truthy(addressObj, 'Address data is available');
  
  // Check that the address is a valid Agoric address (starts with agoric1)
  t.regex(
    addressObj.value,
    /^agoric1/,
    'Elys contract address is a valid Agoric address'
  );
  
  // Additional validation for address fields
  t.is(addressObj.encoding, 'bech32', 'Address has bech32 encoding');
  t.truthy(addressObj.chainId, 'Address has a chainId');
});

