import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { commonSetup } from './support.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const accounts = ['agoric', 'cosmoshub', 'osmosis'];

const contractName = 'tribblesAirdrop';
const contractBuilder = '../builder/init-orca.js';

test.before(async t => {
  const { deleteTestKeys, setupTestKeys, ...rest } = await commonSetup(t);
  deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...rest, wallets, deleteTestKeys };

  t.log('bundle and install contract', contractName);
  await t.context.deployBuilder(contractBuilder);
  const { vstorageClient } = t.context;
  await t.context.retryUntilCondition(
    () => vstorageClient.queryData(`published.agoricNames.instance`),
    res => contractName in Object.fromEntries(res),
    `${contractName} instance is available`,
  );
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  deleteTestKeys(accounts);
});

const makeClaimScenario = test.macro({
  title: () => `Claim invitation`,
  exec: async t => {
    console.log('inside make claim');
    console.group('------------- NESTED LOGGER OPEN:: exec -------------');
    console.log('=====================================================');
    console.log('t.context::', t.context);
    console.log('----------------------------------------------');
    console.log('t.context.wallets::', t.context.wallets);
    console.log('=====================================================');
    console.log('---------- NESTED LOGGER CLOSED:: exec----------');
    console.groupEnd();
  },
});

test.serial('claim test', makeClaimScenario);

// const makeAccountScenario = test.macro({
//   title: (_, chainName) => `Create account on ${chainName}`,
//   exec: async (t, chainName) => {
//     const config = chainConfig[chainName];
//     if (!config) return t.fail(`Unknown chain: ${chainName}`);

//     console.log('testing makeAccountScenario');
//     const {
//       wallets,
//       provisionSmartWallet,
//       vstorageClient,
//       retryUntilCondition,
//     } = t.context;

//     const agoricAddr = wallets[chainName];
//     console.log('agoricAddr:', agoricAddr);
//     const wdUser1 = await provisionSmartWallet(agoricAddr, {
//       BLD: 100n,
//       IST: 100n,
//     });
//     t.log(`provisioning agoric smart wallet for ${agoricAddr}`);

//     const doOffer = makeDoOffer(wdUser1);
//     t.log(`${chainName} makeAccount offer`);
//     const offerId = `${chainName}-makeAccount-${Date.now()}`;

//     t.log('before doOffer');
//     await doOffer({
//       id: offerId,
//       invitationSpec: {
//         source: 'agoricContract',
//         instancePath: [contractName],
//         callPipe: [['makeAccountInvitation']],
//       },
//       offerArgs: { chainName },
//       proposal: {},
//     });
//     // TODO fix above so we don't have to poll for the offer result to be published
//     // https://github.com/Agoric/agoric-sdk/issues/9643
//     const currentWalletRecord = await retryUntilCondition(
//       () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
//       ({ offerToPublicSubscriberPaths }) =>
//         Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
//       `${offerId} continuing invitation is in vstorage`,
//     );

//     console.log('currentWalletRecord', currentWalletRecord);

//     const offerToPublicSubscriberMap = Object.fromEntries(
//       currentWalletRecord.offerToPublicSubscriberPaths,
//     );

//     const address = offerToPublicSubscriberMap[offerId]?.account
//       .split('.')
//       .pop();
//     t.log('Got address:', address);
//     t.regex(
//       address,
//       new RegExp(`^${config.expectedAddressPrefix}1`),
//       `address for ${chainName} is valid`,
//     );

//     const latestWalletUpdate = await vstorageClient.queryData(
//       `published.wallet.${agoricAddr}`,
//     );
//     t.log('latest wallet update', latestWalletUpdate);
//     t.like(
//       latestWalletUpdate.status,
//       {
//         id: offerId,
//         numWantsSatisfied: 1,
//         result: 'UNPUBLISHED',
//         error: undefined,
//       },
//       'wallet offer satisfied without errors',
//     );
//   },
// });

// const makeCreateAndFundScenario = test.macro({
//   title: (_, chainName, denom) =>
//     `Create and fund account on ${chainName} with denom: ${denom}`,
//   exec: async (t, chainName, denom) => {
//     const config = chainConfig[chainName];
//     if (!config) return t.fail(`Unknown chain: ${chainName}`);

//     console.log(
//       `testing makeCreateAndFundScenario for chain ${chainName}, and denom ${denom}`,
//     );
//     const {
//       wallets,
//       provisionSmartWallet,
//       vstorageClient,
//       retryUntilCondition,
//     } = t.context;

//     const agoricAddr = wallets[chainName];
//     console.log('agoricAddr:', agoricAddr);
//     const wdUser1 = await provisionSmartWallet(agoricAddr, {
//       BLD: 100n,
//       IST: 100n,
//     });

//     t.log(`Provisioning Agoric smart wallet for ${agoricAddr}`);

//     const doOffer = makeDoOffer(wdUser1);
//     t.log(`${chainName} makeCreateAndFund offer`);
//     const offerId = `${chainName}-makeCreateAndFund-${Date.now()}`;

//     t.log('Before doOffer');

//     // const { mint, issuer, brand } = makeIssuerKit('BLD');

//     // const issuers = {
//     //   BLDIssuer: issuer,
//     // };

//     const brands = await vstorageClient.queryData(
//       'published.agoricNames.brand',
//     );
//     const brand = Object.fromEntries(brands).BLD;

//     console.log('brand::', brand);

//     const amount = AmountMath.make(brand, 10n);

//     await doOffer({
//       id: offerId,
//       invitationSpec: {
//         source: 'agoricContract',
//         instancePath: [contractName],
//         callPipe: [['makeCreateAndFundInvitation']],
//       },
//       offerArgs: { chainName, denom },
//       proposal: {
//         give: { Deposit: amount },
//         want: {},
//         exit: { onDemand: null },
//       },
//     });

//     const currentWalletRecord = await retryUntilCondition(
//       () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
//       ({ offerToPublicSubscriberPaths }) =>
//         Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
//       `${offerId} continuing invitation is in vstorage`,
//     );

//     console.log('currentWalletRecord', currentWalletRecord);

//     const offerToPublicSubscriberMap = Object.fromEntries(
//       currentWalletRecord.offerToPublicSubscriberPaths,
//     );

//     const address = offerToPublicSubscriberMap[offerId]?.account
//       .split('.')
//       .pop();
//     t.log('got address:', address);
//     t.regex(
//       address,
//       new RegExp(`^${config.expectedAddressPrefix}1`),
//       `address for ${chainName} is valid`,
//     );

//     const latestWalletUpdate = await vstorageClient.queryData(
//       `published.wallet.${agoricAddr}`,
//     );
//     t.log('latest wallet update', latestWalletUpdate);
//     t.like(
//       latestWalletUpdate.status,
//       {
//         id: offerId,
//         numWantsSatisfied: 1,
//         result: 'UNPUBLISHED',
//         error: undefined,
//       },
//       'wallet offer satisfied without errors',
//     );
//   },
// });

// // test.serial(makeAccountScenario, 'agoric');
// // test.serial(makeAccountScenario, 'cosmoshub');
// // test.serial(makeAccountScenario, 'osmosis');

// // test.serial(makeCreateAndFundScenario, 'agoric', 'ubld');
// // use IBC/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596
//
// test.serial(makeClaimScenario, 'osmosis', 'ubld');
