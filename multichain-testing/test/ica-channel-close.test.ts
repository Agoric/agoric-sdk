import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import type { CosmosOrchestrationAccountStorageState } from '@agoric/orchestration/src/exos/cosmos-orchestration-account.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import {
  commonSetup,
  SetupContextWithWallets,
  chainConfig,
} from './support.js';
import { makeQueryClient } from '../tools/query.js';
import { parseLocalAddress, parseRemoteAddress } from '../tools/address.js';
import chainInfo from '../starship-chain-info.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['cosmoshub', 'osmosis'];

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

/** The account holder chooses to close their ICA account (channel) */
const intentionalCloseAccountScenario = test.macro({
  title: (_, chainName: string) => `Close and reopen account on ${chainName}`,
  exec: async (t, chainName: string) => {
    const config = chainConfig[chainName];
    if (!config) return t.fail(`Unknown chain: ${chainName}`);

    const {
      wallets,
      provisionSmartWallet,
      makeQueryTool,
      retryUntilCondition,
      useChain,
    } = t.context;

    const vstorageClient = makeQueryTool();

    const agoricAddr = wallets[chainName];
    const wdUser1 = await provisionSmartWallet(agoricAddr, {
      BLD: 100n,
      IST: 100n,
    });
    t.log(`provisioning agoric smart wallet for ${agoricAddr}`);

    const doOffer = makeDoOffer(wdUser1);
    t.log(`${chainName} makeAccount offer`);
    const offerId = `${chainName}-makeAccount-${Date.now()}`;

    await doOffer({
      id: offerId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeOrchAccountInvitation']],
      },
      offerArgs: { chainName },
      proposal: {},
    });
    const currentWalletRecord = await retryUntilCondition(
      () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
      ({ offerToPublicSubscriberPaths }) =>
        Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
      `${offerId} continuing invitation is in vstorage`,
    );
    const offerToPublicSubscriberMap = Object.fromEntries(
      currentWalletRecord.offerToPublicSubscriberPaths,
    );

    const accountStoragePath = offerToPublicSubscriberMap[offerId]?.account;
    t.assert(accountStoragePath, 'account storage path returned');
    const address = accountStoragePath.split('.').pop();
    t.log('Got address:', address);

    const {
      remoteAddress,
      localAddress,
    }: CosmosOrchestrationAccountStorageState =
      await vstorageClient.queryData(accountStoragePath);
    const { rPortID, rChannelID } = parseRemoteAddress(remoteAddress);

    const remoteQueryClient = makeQueryClient(
      await useChain(chainName).getRestEndpoint(),
    );
    const localQueryClient = makeQueryClient(
      await useChain('agoric').getRestEndpoint(),
    );

    const { channel } = await retryUntilCondition(
      () => remoteQueryClient.queryChannel(rPortID, rChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_OPEN',
      `ICA channel is open on Host - ${chainName}`,
    );
    t.log('Channel State Before', channel);
    // @ts-expect-error ChannelSDKType.state is a string not a number
    t.is(channel?.state, 'STATE_OPEN', 'channel is open');

    const closeAccountOfferId = `${chainName}-closeAccount-${Date.now()}`;
    await doOffer({
      id: closeAccountOfferId,
      invitationSpec: {
        source: 'continuing',
        previousOffer: offerId,
        invitationMakerName: 'CloseAccount',
      },
      proposal: {},
    });

    const { channel: rChannelAfterClose } = await retryUntilCondition(
      () => remoteQueryClient.queryChannel(rPortID, rChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_CLOSED',
      `ICA channel is closed on Host - ${chainName}`,
    );
    t.log('Remote Channel State After', rChannelAfterClose);
    t.is(
      rChannelAfterClose?.state,
      // @ts-expect-error ChannelSDKType.state is a string not a number
      'STATE_CLOSED',
      `channel is closed from host perspective - ${chainName}`,
    );

    const { lPortID, lChannelID } = parseLocalAddress(localAddress);
    const { channel: lChannelAfterClose } = await retryUntilCondition(
      () => localQueryClient.queryChannel(lPortID, lChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_CLOSED',
      `ICA channel is closed on Controller - ${chainName}`,
    );
    t.log('Local Channel State After', lChannelAfterClose);
    if (!lChannelAfterClose?.state) throw Error('channel state is available');
    t.is(
      lChannelAfterClose.state,
      // @ts-expect-error ChannelSDKType.state is a string not a number
      'STATE_CLOSED',
      `channel is closed from controller perspective - ${chainName}`,
    );

    const reopenAccountOfferId = `${chainName}-reopenAccount-${Date.now()}`;
    await doOffer({
      id: reopenAccountOfferId,
      invitationSpec: {
        source: 'continuing',
        previousOffer: offerId,
        invitationMakerName: 'ReopenAccount',
      },
      proposal: {},
    });

    const { channel: rChannelAfterCloseReopen } = await retryUntilCondition(
      () => remoteQueryClient.queryChannel(rPortID, rChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_OPEN',
      `ICA channel is reopened on ${chainName} Host`,
    );
    t.log('Remote Channel State After Reopening', rChannelAfterCloseReopen);
    t.is(
      rChannelAfterCloseReopen?.state,
      // @ts-expect-error ChannelSDKType.state is a string not a number
      'STATE_OPEN',
      `ICA channel is reopened on ${chainName} Host`,
    );
  },
});

/** The channel is closed for an unexpected reason and should automatically reopen */
const unintentionalCloseAccountScenario = test.macro({
  title: (_, chainName: string) =>
    `Automatically reopen closed channel on ${chainName}`,
  exec: async (t, chainName: string) => {
    const config = chainConfig[chainName];
    if (!config) return t.fail(`Unknown chain: ${chainName}`);

    const {
      wallets,
      provisionSmartWallet,
      makeQueryTool,
      retryUntilCondition,
      useChain,
      hermes,
    } = t.context;

    const vstorageClient = makeQueryTool();

    const agoricAddr = wallets[chainName];
    const wdUser1 = await provisionSmartWallet(agoricAddr, {
      BLD: 100n,
      IST: 100n,
    });
    t.log(`provisioning agoric smart wallet for ${agoricAddr}`);

    const doOffer = makeDoOffer(wdUser1);
    t.log(`${chainName} makeAccount offer`);
    const offerId = `${chainName}-makeAccount-${Date.now()}`;

    await doOffer({
      id: offerId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeOrchAccountInvitation']],
      },
      offerArgs: { chainName },
      proposal: {},
    });
    const currentWalletRecord = await retryUntilCondition(
      () => vstorageClient.queryData(`published.wallet.${agoricAddr}.current`),
      ({ offerToPublicSubscriberPaths }) =>
        Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
      `${offerId} continuing invitation is in vstorage`,
    );
    const offerToPublicSubscriberMap = Object.fromEntries(
      currentWalletRecord.offerToPublicSubscriberPaths,
    );

    const accountStoragePath = offerToPublicSubscriberMap[offerId]?.account;
    t.assert(accountStoragePath, 'account storage path returned');
    const address = accountStoragePath.split('.').pop();
    t.log('Got address:', address);

    const {
      remoteAddress,
      localAddress,
    }: CosmosOrchestrationAccountStorageState =
      await vstorageClient.queryData(accountStoragePath);
    const { rPortID, rChannelID } = parseRemoteAddress(remoteAddress);
    const { lPortID, lChannelID, lConnectionID } =
      parseLocalAddress(localAddress);

    const dst = {
      chainId: chainInfo['agoric'].chainId,
      channelID: lChannelID,
      portID: lPortID,
      connectionID: lConnectionID,
    };
    const src = {
      chainId: useChain(chainName).chainInfo.chain.chain_id,
      channelID: rChannelID,
      portID: rPortID,
    };
    console.log(`Initiating channelCloseInit for dst: ${dst} src: ${src}`);
    const closeChannelTx = hermes.channelCloseInit(chainName, dst, src);
    console.log('closeChannelExec', closeChannelTx);

    const remoteQueryClient = makeQueryClient(
      await useChain(chainName).getRestEndpoint(),
    );
    const { channel } = await retryUntilCondition(
      () => remoteQueryClient.queryChannel(rPortID, rChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_CLOSED',
      'ICA channel closed from Hermes closeChannelInit',
      {
        retryIntervalMs: 300,
        maxRetries: 10,
      },
    );
    t.is(
      channel?.state,
      // @ts-expect-error ChannelSDKType.state is a string not a number
      'STATE_CLOSED',
      'closed state is observed',
    );

    const { channel: channel2 } = await retryUntilCondition(
      () => remoteQueryClient.queryChannel(rPortID, rChannelID),
      // @ts-expect-error ChannelSDKType.state is a string not a number
      ({ channel }) => channel?.state === 'STATE_CLOSED',
      `ICA channel closed from Hermes closeChannelInit on ${chainName}`,
    );
    t.is(
      channel2?.state,
      // @ts-expect-error ChannelSDKType.state is a string not a number
      'STATE_OPEN',
      `channel is automatically reopened on ${chainName}`,
    );
  },
});

test.serial(intentionalCloseAccountScenario, 'cosmoshub');
test.serial(intentionalCloseAccountScenario, 'osmosis');

test.serial(unintentionalCloseAccountScenario, 'cosmoshub');
test.serial(unintentionalCloseAccountScenario, 'osmosis');
