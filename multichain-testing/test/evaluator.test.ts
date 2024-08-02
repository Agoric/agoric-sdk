import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, SetupContextWithWallets } from './support.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { chainConfig, chainNames } from './support.js';
import * as fs from 'fs/promises';
import {execa, execaNode} from 'execa';

const test = anyTest as TestFn<Record<string, SetupContextWithWallets>>;

const accounts = ['agorictest1'];
const agoricChains = ['agoric'];

const contractName = 'agoricEvaluator';
const contractBuilder = new URL(
  '../../packages/evaluator/src/evaluator.builder.js',
  import.meta.url,
).pathname;

test.before(async t => {
  for (const agoricChainName of agoricChains) {
    t.log('setting up in', agoricChainName);
    const { deleteTestKeys, setupTestKeys, ...rest } = await commonSetup(t, agoricChainName);
    deleteTestKeys(accounts).catch();
    const wallets = await setupTestKeys(accounts);
    t.context[agoricChainName] = { ...rest, wallets, deleteTestKeys };

    t.log(`'patching ${wallets[accounts[0]]} as ${accounts[0]} in contract builder`);
    if (!process.env.AGORIC_EVALUATOR_INVITED_OWNERS) {
      process.env.AGORIC_EVALUATOR_INVITED_OWNERS = JSON.stringify({agorictest1: wallets[accounts[0]]});
    }
    t.log('Add agorictest1 to host agd');
    const seedArray = new Uint8Array(Buffer.from(wallets[`seed.${accounts[0]}`] + '\n'));
    await execa`agd keys delete -y ${accounts[0]}`.catch(() => {});
    await execa({stdin:seedArray })`agd keys add --recover ${accounts[0]}`;

    t.log('bundle and install contract', contractName);
    await t.context[agoricChainName].deployBuilder(contractBuilder);
    const vstorageClient = t.context[agoricChainName].makeQueryTool();
    await t.context[agoricChainName].retryUntilCondition(
      () => vstorageClient.queryData(`published.agoricNames.instance`),
      res => contractName in Object.fromEntries(res),
      `${contractName} instance is available`,
    );
  }
});

// test.after(async t => {
//   for (const agoricChainName of agoricChains) {
//     const { deleteTestKeys } = t.context[agoricChainName];
//     deleteTestKeys(accounts);
//   }
// });

const makeEvalScenario = test.macro({
  title: (_, chainName: string) => `Eval code on ${chainName}`,
  exec: async (t, chainName: string) => {
    const config = chainConfig[chainName];
    if (!config) return t.fail(`Unknown chain: ${chainName}`);

    const {
      wallets,
      provisionSmartWallet,
      makeQueryTool,
      retryUntilCondition,
    } = t.context[chainName];

    const vstorageClient = makeQueryTool();

    const wallet = accounts[0];
    const wdUser1 = await provisionSmartWallet(wallets[wallet], {
      BLD: 100n,
      IST: 100n,
    });
    t.log(`provisioning agoric smart wallet for ${wallets[wallet]}`);

    const doOffer = makeDoOffer(wdUser1);
    t.log(`${chainName} eval offer`);
    const evalOfferId = `eval-${chainName}-${Date.now()}`;
    const claimOfferId = `claimEval-${chainName}-${Date.now()}`;

    t.log('claim invitation for', wallet, wallets[wallet]);

    const claimResult = await execa`agops eval claim --from=${wallet} --offerId`.pipe`agoric wallet send --from=${wallet} --offer=/dev/stdin`;
    // const _claimResult = await doOffer({
    //   id: claimOfferId,
    //   invitationSpec: {
    //     source: 'purse',
    //     instancePath: [contractName],
    //     description: 'evaluator',
    //   },
    //   offerArgs: {
    //   },
    //   proposal: {},
    // });
    // t.true(_claimResult);

    const currentWalletRecord = await retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${wallets[wallet]}.current`),
      ({ offerToUsedInvitation }) =>
        Object.fromEntries(offerToUsedInvitation)[claimOfferId],
      `${claimOfferId} continuing invitation is in vstorage`,
    );

    const stringToEval = 'console.log("hello world")';
    const evalResult = await execa`agops eval offer --from=${wallet} --offerId=${evalOfferId} '${stringToEval}'`
    // const _offerResult = await doOffer({
    //   id: offerId,
    //   invitationSpec: {
    //     invitationArgs: [stringToEval],
    //     invitationMakerName: 'Eval',
    //     previousOffer: claimOfferId,
    //     source: 'continuing'
    //   },
    //   offerArgs: {},
    //   proposal: {},
    // });
    // t.true(_offerResult);

    //const lastEval = await vstorageClient.(`published.${contractName}.${wallets[wallet]}`);

    const currentEvalRecord = await retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.${contractName}.${wallets[wallet]}`),
      ({ offerToPublicSubscriberPaths }) =>
        Object.fromEntries(offerToPublicSubscriberPaths)['lastSequence'] === true,
      `${evalOfferId} eval is in vstorage`,
    );
    // t.is(
    //   await _offerResult,
    //   'UNPUBLISHED',
    //   'representation of continuing offer',
    // );

    // TODO fix above so we don't have to poll for the offer result to be published
    // https://github.com/Agoric/agoric-sdk/issues/9643
    // const currentWalletRecord = await retryUntilCondition(
    //   () =>
    //     vstorageClient.queryData(`published.wallet.${wallets[wallet]}.current`),
    //   ({ offerToPublicSubscriberPaths }) =>
    //     Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
    //   `${offerId} continuing invitation is in vstorage`,
    // );

    // const offerToPublicSubscriberMap = Object.fromEntries(
    //   currentWalletRecord.offerToPublicSubscriberPaths,
    // );

    // const address = offerToPublicSubscriberMap[offerId]?.account
    //   .split('.')
    //   .pop();
    // t.log('Got address:', address);
    // t.regex(
    //   address,
    //   new RegExp(`^${config.expectedAddressPrefix}1`),
    //   `address for ${chainName} is valid`,
    // );

    // const latestWalletUpdate = await vstorageClient.queryData(
    //   `published.wallet.${wallets[wallet]}`,
    // );
    t.log('latest wallet update', stringToEval);
    t.true(true);
  },
});

test.serial('noop', async t => {
  console.log(contractName, 'contract installed');
  t.pass(`${contractName} contract installed`);
});
test.serial(makeEvalScenario, 'agoric');
// test.serial(makeEvalScenario, 'agoric2');
