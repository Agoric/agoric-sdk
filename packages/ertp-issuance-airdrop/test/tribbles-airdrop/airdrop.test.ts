// @ts-nocheck
import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import { makeDoOffer } from '../tools/e2e-tools.js';
import {
  commonSetup,
  SetupContextWithWallets,
  chainConfig,
} from './support.js';
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

test.before(async t => {
  const { deleteTestKeys, setupTestKeys, ...rest } = await commonSetup(t);
  await deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...rest, wallets, deleteTestKeys };
  const { startContract } = rest;

  console.group(
    '################ START inside test.before logger ##############',
  );
  console.log('----------------------------------------');
  console.log('t.context ::::', t.context);
  console.log('----------------------------------------');
  console.log('wallets ::::', wallets);

  console.log(
    '--------------- END insi ®de test.before logger -------------------',
  );
  console.groupEnd();
  await startContract(contractName, contractBuilder);
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});
const makeMakeOfferArgs =
  (keys = publicKeys) =>
  ({ pubkey: { key = '' }, address = 'agoric12d3fault' }) => ({
    key,
    proof: merkleTreeAPI.generateMerkleProof(key, keys),
    address,
    tier: createTestTier(),
  });
const makeOfferArgs = makeMakeOfferArgs(pubkeys);

const simulatreClaim = test.macro({
  title: (_, agoricAccount) =>
    `Simulate claim for account ${agoricAccount.name} with address ${agoricAccount.address}`,
  exec: async (t, agoricAccount) => {
    console.log(t.context);
    const { address, pubkey } = agoricAccount;
    console.log(
      `testing makeCreateAndFundScenario for account ${agoricAccount.name}, and pubkey ${pubkey}`,
    );
    const {
      useChain,
      wallets,
      provisionSmartWallet,
      vstorageClient,
      retryUntilCondition,
    } = t.context;

    // const [pfFromZoe, terms] = await Promise.all([
    //   E(zoe).getPublicFacet(instance),
    //   E(zoe).getTerms(instance),
    // ]);

    const makeTestBalances = ({ IST = 50n, BLD = 100n }) => ({
      IST,
      BLD,
    });
    t.log(
      wallets[accounts[0]],
      Object.values(wallets).map(x => x),
    );

    const [brands, instances] = await Promise.all([
      vstorageClient.queryData('published.agoricNames.brand'),
      vstorageClient.queryData('published.agoricNames.instance'),
    ]);

    console.log('Brands::', brands);

    const istBrand = Object.fromEntries(brands).IST;

    console.group(
      '################ START AIRDROP.TEST.TS logger ##############',
    );
    console.log('----------------------------------------');
    console.log('brands ::::', brands);
    console.log('----------------------------------------');
    console.log('instances ::::', Object.fromEntries(instances));
    console.log('----------------------------------');
    console.log(
      '--------------- END AIRDROP.TEST.TS logger -------------------',
    );
    console.groupEnd();
    const feeAmount = harden({
      brand: istBrand,
      value: 5n,
    });

    // const testAddresses = await Promise.all(
    //   Object.values(wallets).map(async x => {
    //     await null;
    //     const newWallet = await provisionSmartWallet(x, {
    //       IST: 100n,
    //       BLD: 50n,
    //     });
    //     t.log('provisioned wallet for address::', x);
    //     return newWallet;
    //   }),
    // );
    const eligibleAccounts = agoricAccounts.map(x => x.address);

    const currentAcct = agoricAccount;

    const alicesWallet = await provisionSmartWallet(currentAcct.address, {
      IST: 10n,
      BLD: 30n,
    });

    const doOffer = makeDoOffer(alicesWallet);
    const id = 0;
    const offerId = `offer-${Date.now()}`;
    await doOffer({
      id: offerId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeClaimTokensInvitation']],
      },
      offerArgs: {
        ...makeOfferArgs(currentAcct),
        proof: merkleTreeAPI.generateMerkleProof(
          currentAcct.pubkey.key,
          agoricAccounts.map(x => x.pubkey.key),
        ),
        tier: 3,
      },
      proposal: {
        give: { Fee: feeAmount },
      },
    });
    const walletViewResults = await Promise.all(
      Object.values(wallets).map(x => vstorageClient.walletView(x)),
    );

    console.group(
      '################ START walletViewResults logger ##############',
    );
    console.log('----------------------------------------');
    console.log('walletViewResults ::::', walletViewResults);
    console.log('----------------------------------------');
    console.log('alicesWallet ::::', alicesWallet);
    console.log(
      '--------------- END walletViewResults logger -------------------',
    );
    console.groupEnd();

    const walletCurrent = await vstorageClient.queryData(
      `published.wallet.${currentAcct.address}.current`,
    );
    t.like(walletCurrent, { liveOffers: [], offerToPublicSubscriberPaths: [] });

    const agQueryClient = makeQueryClient(
      await useChain('agoric').getRestEndpoint(),
    );

    const { balances } = await agQueryClient.queryBalances(alicesWallet);
    t.deepEqual(
      balances,
      [
        { denom: 'ubld', amount: String(90_000_000n) },
        { denom: 'uist', amount: String(250_000n) },
      ],
      'faucet request minus 10 BLD, plus 0.25 IST provisioning credit',
    );
    t.log({ [currentAcct.address]: balances });
  },
});
test.serial(simulatreClaim, agoricAccounts[agoricAccounts.length - 1]);
