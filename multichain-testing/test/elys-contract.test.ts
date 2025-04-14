import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import starshipChainInfo from '../starship-chain-info.js';
import { makeFundAndTransfer } from '../tools/ibc-transfer.js';
import type { SetupContextWithWallets } from './support.js';
import { commonSetup } from './support.js';
import { E } from '@endo/far';
import { makeDoOffer } from '../tools/e2e-tools.js';
const { fromEntries } = Object;

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
    skipInstanceCheck: true
  });
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

const elysContractScenario = test.macro({
  title: (_, chainName: string) => `receive stride Staked STtokens on Elys`,
  exec: async (t, chainName: string) => {
    const {
      wallets,
      vstorageClient,
      provisionSmartWallet,
      retryUntilCondition,
      useChain,
    } = t.context;

    let localStorage = await vstorageClient.queryData('published.agoricNames.ElysContractAccount.localAgoricAccount')
    console.log('elysContractInstance', localStorage);
  
    let elysContractInstance = await vstorageClient.queryData('published.agoricNames.instance')
    console.log('elysContractInstance', elysContractInstance);

  }
});

test.serial(elysContractScenario, 'cosmoshub');
