import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import starshipChainInfo from '../starship-chain-info.js';
import { makeFundAndTransfer } from '../tools/ibc-transfer.js';
import type { SetupContextWithWallets } from './support.js';
import { commonSetup } from './support.js';
import { E } from '@endo/far';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricAdmin', 'cosmoshub', 'elys', 'stride'];

const contractName = 'elysContract';
const contractBuilder =
  '../packages/builders/scripts/testing/init-elys-contract.js';

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

    const fundAndTransfer = makeFundAndTransfer(
      t,
      retryUntilCondition,
      useChain,
    );

    const remoteChainInfo = starshipChainInfo[chainName];
    const stakingDenom = remoteChainInfo?.stakingTokens?.[0].denom;
    if (!stakingDenom) throw Error(`staking denom found for ${chainName}`);

    const agoricUserAddr = wallets[chainName];
    const wdUser = await provisionSmartWallet(agoricUserAddr, {
      BLD: 100n,
      IST: 100n,
    });

    const contractInstance = await t.context.vstorageClient.queryData(
        `published.agoricNames.instance.${contractName}`,
    );
    const publicFacet = await E(contractInstance).getPublicFacet();
    const agoricLocalAddress = await E(publicFacet).getLocalAddress().value;
    t.log(`Agoric Local Address: ${agoricLocalAddress}`);

    // TODO: Check the local address format
    t.regex(agoricLocalAddress, /^agoric1/, 'Local Address is valid');
  },
});

test.serial(elysContractScenario, 'cosmoshub');
