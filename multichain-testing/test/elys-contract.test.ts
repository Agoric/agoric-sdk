import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import {
  decodeBech32,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import type { SetupContextWithWallets } from './support.js';
import { commonSetup } from './support.js';
import { makeFundAndTransfer } from '../tools/ibc-transfer.js';
import { makeQueryClient } from '../tools/query.js';

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

test('Transfer fund to localAgoric account and get stTokens', async t => {
  const { vstorageClient,retryUntilCondition,useChain } = t.context;
  const fundAndTransfer = makeFundAndTransfer(
    t,
    retryUntilCondition,
    useChain,
  );
  const deriveAddress = (sender, hrp) => {
    const { bytes } = decodeBech32(sender);
    const derivedAddress = encodeBech32(hrp, bytes);
    return derivedAddress;
  };
  const addressData =  await vstorageClient.queryData(`published.${contractName}.address`);
  
  t.log('Elys contract address data:', addressData);
  
  // No need to parse if it's already an object
  const addressObj = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;

  const transferAmount = 1000000n;
  const { address } = await fundAndTransfer("cosmoshub", addressData.value, transferAmount);

  const remoteQueryClient = makeQueryClient(
    await useChain("elyslocal").getRestEndpoint(),
  );
  const elysAddress = deriveAddress(address, "elys");
  const { balances } = await remoteQueryClient.queryBalances(elysAddress);
  t.log('Balances:', balances);
  t.truthy(
    balances.find(balance => balance.denom === 'sttoken'),
    'Balances should include an entry with denom as sttoken'
  );
});

