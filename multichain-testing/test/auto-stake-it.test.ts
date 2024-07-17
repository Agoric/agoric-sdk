import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { ExecutionContext, TestFn } from 'ava';
import { useChain } from 'starshipjs';
import type { CosmosChainInfo, IBCConnectionInfo } from '@agoric/orchestration';
import type { SetupContextWithWallets } from './support.js';
import { chainConfig, commonSetup } from './support.js';
import { makeQueryClient } from '../tools/query.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import chainInfo from '../starship-chain-info.js';
import {
  createFundedWalletAndClient,
  makeIBCTransferMsg,
} from '../tools/ibc-transfer.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

const accounts = ['agoricAdmin', 'cosmoshub', 'osmosis'];

const contractName = 'autoAutoStakeIt';
const contractBuilder =
  '../packages/builders/scripts/testing/start-auto-stake-it.js';

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

const makeFundAndTransfer = (t: ExecutionContext<SetupContextWithWallets>) => {
  const { retryUntilCondition } = t.context;
  return async (chainName: string, agoricAddr: string, amount = 100n) => {
    const { staking } = useChain(chainName).chainInfo.chain;
    const denom = staking?.staking_tokens?.[0].denom;
    if (!denom) throw Error(`no denom for ${chainName}`);

    const { client, address, wallet } = await createFundedWalletAndClient(
      t,
      chainName,
    );
    const balancesResult = await retryUntilCondition(
      () => client.getAllBalances(address),
      coins => !!coins?.length,
      `Faucet balances found for ${address}`,
    );

    console.log('Balances:', balancesResult);

    const transferArgs = makeIBCTransferMsg(
      { denom, value: amount },
      { address: agoricAddr, chainName: 'agoric' },
      { address: address, chainName },
      Date.now(),
    );
    console.log('Transfer Args:', transferArgs);
    // TODO #9200 `sendIbcTokens` does not support `memo`
    // @ts-expect-error spread argument for concise code
    const txRes = await client.sendIbcTokens(...transferArgs);
    if (txRes && txRes.code !== 0) {
      console.error(txRes);
      throw Error(`failed to ibc transfer funds to ${chainName}`);
    }
    const { events: _events, ...txRest } = txRes;
    console.log(txRest);
    t.is(txRes.code, 0, `Transaction succeeded`);
    t.log(`Funds transferred to ${agoricAddr}`);
    return {
      client,
      address,
      wallet,
    };
  };
};

const autoStakeItScenario = test.macro({
  title: (_, chainName: string) => `auto-stake-it on ${chainName}`,
  exec: async (t, chainName: string) => {
    const {
      wallets,
      makeQueryTool,
      provisionSmartWallet,
      retryUntilCondition,
    } = t.context;

    const fundAndTransfer = makeFundAndTransfer(t);

    // 1. Send initial tokens so denom is available (debatably necessary, but
    // allows us to trace the denom until we have ibc denoms in chainInfo)
    const agAdminAddr = wallets['agoricAdmin'];
    console.log('Sending tokens to', agAdminAddr, `from ${chainName}`);
    await fundAndTransfer(chainName, agAdminAddr);

    // 2. Find 'stakingDenom' denom on agoric
    const agoricConns = chainInfo['agoric'].connections as Record<
      string,
      IBCConnectionInfo
    >;
    const remoteChainInfo = (chainInfo as Record<string, CosmosChainInfo>)[
      chainName
    ];
    // const remoteChainId = remoteChainInfo.chain.chain_id;
    // const agoricToRemoteConn = agoricConns[remoteChainId];
    const { portId, channelId } =
      agoricConns[remoteChainInfo.chainId].transferChannel;
    const agoricQueryClient = makeQueryClient(
      useChain('agoric').getRestEndpoint(),
    );
    const stakingDenom = remoteChainInfo?.stakingTokens?.[0].denom;
    if (!stakingDenom) throw Error(`staking denom found for ${chainName}`);
    const { hash } = await retryUntilCondition(
      () =>
        agoricQueryClient.queryDenom(`/${portId}/${channelId}`, stakingDenom),
      denomTrace => !!denomTrace.hash,
      `local denom hash for ${stakingDenom} found`,
    );
    t.log(`found ibc denom hash for ${stakingDenom}:`, hash);

    // 3. Find a remoteChain validator to delegate to
    const remoteQueryClient = makeQueryClient(
      useChain(chainName).getRestEndpoint(),
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
        localDenom: `ibc/${hash}`,
      },
      proposal: {},
    });

    // FIXME https://github.com/Agoric/agoric-sdk/issues/9643
    const vstorageClient = makeQueryTool();
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
    if (chainName === 'cosmoshub') {
      // FIXME: delegations are not visible on cosmoshub
      return t.pass('skipping verifying delegations on cosmoshub');
    }
    const { delegation_responses } = await retryUntilCondition(
      () => remoteQueryClient.queryDelegations(icaAddress),
      ({ delegation_responses }) => !!delegation_responses.length,
      `delegations visible on ${chainName}`,
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
