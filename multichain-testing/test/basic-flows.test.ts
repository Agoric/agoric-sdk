import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, SetupContextWithWallets } from './support.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { chainConfig, chainNames } from './support.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['user1', 'user2', 'user3']; // one account for each scenario

const contractName = 'basicFlows';
const contractBuilder =
  '../packages/builders/scripts/orchestration/init-basic-flows.js';

test.before(async t => {
  const { deleteTestKeys, setupTestKeys, ...rest } = await commonSetup(t);
  deleteTestKeys(accounts).catch();
  const wallets = await setupTestKeys(accounts);
  t.context = { ...rest, wallets, deleteTestKeys };

  t.log('bundle and install contract', contractName);
  await t.context.deployBuilder(contractBuilder);
  const vstorageClient = t.context.makeQueryTool();
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

const makeAccountScenario = test.macro({
  title: (_, chainName: string) => `Create account on ${chainName}`,
  exec: async (t, chainName: string) => {
    const config = chainConfig[chainName];
    if (!config) return t.fail(`Unknown chain: ${chainName}`);

    const {
      wallets,
      provisionSmartWallet,
      makeQueryTool,
      retryUntilCondition,
    } = t.context;

    const vstorageClient = makeQueryTool();

    const wallet = accounts[chainNames.indexOf(chainName)];
    const wdUser1 = await provisionSmartWallet(wallets[wallet], {
      BLD: 100n,
      IST: 100n,
    });
    t.log(`provisioning agoric smart wallet for ${wallets[wallet]}`);

    const doOffer = makeDoOffer(wdUser1);
    t.log(`${chainName} makeAccount offer`);
    const offerId = `${chainName}-makeAccount-${Date.now()}`;

    // FIXME we get payouts but not an offer result; it times out
    // https://github.com/Agoric/agoric-sdk/issues/9643
    // chain logs shows an UNPUBLISHED result
    const _offerResult = await doOffer({
      id: offerId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeOrchAccountInvitation']],
      },
      offerArgs: { chainName },
      proposal: {},
    });
    t.true(_offerResult);
    // t.is(await _offerResult, 'UNPUBLISHED', 'representation of continuing offer');

    // TODO fix above so we don't have to poll for the offer result to be published
    // https://github.com/Agoric/agoric-sdk/issues/9643
    const currentWalletRecord = await retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${wallets[wallet]}.current`),
      ({ offerToPublicSubscriberPaths }) =>
        Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
      `${offerId} continuing invitation is in vstorage`,
    );

    const offerToPublicSubscriberMap = Object.fromEntries(
      currentWalletRecord.offerToPublicSubscriberPaths,
    );

    const address = offerToPublicSubscriberMap[offerId]?.account
      .split('.')
      .pop();
    t.log('Got address:', address);
    t.regex(
      address,
      new RegExp(`^${config.expectedAddressPrefix}1`),
      `address for ${chainName} is valid`,
    );

    const latestWalletUpdate = await vstorageClient.queryData(
      `published.wallet.${wallets[wallet]}`,
    );
    t.log('latest wallet update', latestWalletUpdate);
    t.like(
      latestWalletUpdate.status,
      {
        id: offerId,
        numWantsSatisfied: 1,
        result: 'UNPUBLISHED',
        error: undefined,
      },
      'wallet offer satisfied without errors',
    );
  },
});

test.serial(makeAccountScenario, 'agoric');
test.serial(makeAccountScenario, 'cosmoshub');
test.serial(makeAccountScenario, 'osmosis');
