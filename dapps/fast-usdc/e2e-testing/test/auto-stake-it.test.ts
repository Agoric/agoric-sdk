import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import starshipChainInfo from '../starship-chain-info.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { makeFundAndTransfer } from '../tools/ibc-transfer.js';
import { makeQueryClient } from '../tools/query.js';
import type { SetupContextWithWallets } from './support.js';
import { chainConfig, commonSetup } from './support.js';
import { AUTO_STAKE_IT_DELEGATIONS_TIMEOUT } from './config.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricAdmin', 'cosmoshub', 'osmosis'];

const contractName = 'autoAutoStakeIt';
const contractBuilder =
  '../packages/builders/scripts/testing/init-auto-stake-it.js';

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

const autoStakeItScenario = test.macro({
  title: (_, chainName: string) => `auto-stake-it on ${chainName}`,
  exec: async (t, chainName: string) => {
    // 1. setup
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

    // 2. Find 'stakingDenom' denom on agoric
    const remoteChainInfo = starshipChainInfo[chainName];
    const stakingDenom = remoteChainInfo?.stakingTokens?.[0].denom;
    if (!stakingDenom) throw Error(`staking denom found for ${chainName}`);

    // 3. Find a remoteChain validator to delegate to
    const remoteQueryClient = makeQueryClient(
      await useChain(chainName).getRestEndpoint(),
    );
    const { validators } = await remoteQueryClient.queryValidators();
    const validatorAddress = validators[0]?.operator_address;
    t.truthy(
      validatorAddress,
      `found a validator on ${chainName} to delegate to`,
    );
    t.log(
      { validatorAddress },
      `found a validator on ${chainName} to delegate to`,
    );

    // 4. Send an Offer to make the accounts and set up the transfer tap
    const agoricUserAddr = wallets[chainName];
    const wdUser = await provisionSmartWallet(agoricUserAddr, {
      BLD: 100n,
      IST: 100n,
    });
    const doOffer = makeDoOffer(wdUser);
    t.log(`${chainName} makeAccount offer`);
    const offerId = `${chainName}-makeAccountsInvitation-${Date.now()}`;

    await doOffer({
      id: offerId,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeAccountsInvitation']],
      },
      offerArgs: {
        chainName,
        validator: {
          value: validatorAddress,
          encoding: 'bech32',
          chainId: remoteChainInfo.chainId,
        },
      },
      proposal: {},
    });

    // FIXME https://github.com/Agoric/agoric-sdk/issues/9643
    const currentWalletRecord = await retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${agoricUserAddr}.current`),
      ({ offerToPublicSubscriberPaths }) =>
        Object.fromEntries(offerToPublicSubscriberPaths)[offerId],
      `${offerId} continuing invitation is in vstorage`,
    );

    const offerToPublicSubscriberMap = Object.fromEntries(
      currentWalletRecord.offerToPublicSubscriberPaths,
    );

    // 5. look up LOA address in vstorage
    console.log('offerToPublicSubscriberMap', offerToPublicSubscriberMap);
    const lcaAddress = offerToPublicSubscriberMap[offerId]?.agoric
      .split('.')
      .pop();
    const icaAddress = offerToPublicSubscriberMap[offerId]?.[chainName]
      .split('.')
      .pop();
    console.log({ lcaAddress, icaAddress });
    t.regex(lcaAddress, /^agoric1/, 'LOA address is valid');
    t.regex(
      icaAddress,
      new RegExp(`^${chainConfig[chainName].expectedAddressPrefix}1`),
      'COA address is valid',
    );

    // 6. transfer in some tokens over IBC
    const transferAmount = 99n;
    await fundAndTransfer(chainName, lcaAddress, transferAmount);

    // 7. verify the COA has active delegations
    const { delegation_responses } = await retryUntilCondition(
      () => remoteQueryClient.queryDelegations(icaAddress),
      ({ delegation_responses }) => !!delegation_responses.length,
      `auto-stake-it delegations visible on ${chainName}`,
      AUTO_STAKE_IT_DELEGATIONS_TIMEOUT,
    );
    t.log('delegation balance', delegation_responses[0]?.balance);
    t.like(
      delegation_responses[0].balance,
      { denom: stakingDenom, amount: String(transferAmount) },
      'delegations balance',
    );
    t.log(
      `Orchestration Account Delegations on ${chainName}`,
      delegation_responses,
    );

    // XXX consider using PortfolioHolder continuing inv to undelegate

    // XXX how to test other tokens do not result in an attempted MsgTransfer or MsgDelegate?
    // query tx history of the LOA via an rpc node?
  },
});

test.serial(autoStakeItScenario, 'osmosis');
test.serial(autoStakeItScenario, 'cosmoshub');
