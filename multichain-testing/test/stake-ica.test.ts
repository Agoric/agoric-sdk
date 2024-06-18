import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup, SetupContextWithWallets } from './support.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { makeQueryClient } from '../tools/query.js';
import { installStakeContracts } from './install-contracts.js';

const test = anyTest as TestFn<SetupContextWithWallets>;

test.before(async t => {
  const { deleteTestKeys, setupTestKeys, ...rest } = await commonSetup(t);
  // deleteTestKeys().catch();
  const wallets = await setupTestKeys();
  t.context = { ...rest, wallets, deleteTestKeys };
  installStakeContracts(t.context);
});

test.after(async t => {
  const { deleteTestKeys } = t.context;
  try {
    await deleteTestKeys();
  } catch (_e) {
    // ignore
  }
});

interface Scenario {
  chain: string;
  chainId: string;
  contractName: string;
  denom: string;
  expectedAddressPrefix: string;
}

const stakeScenario = test.macro(async (t, scenario: Scenario) => {
  // TODO, bundle and install contract

  const {
    wallets,
    provisionSmartWallet,
    makeQueryTool,
    retryUntilCondition,
    useChain,
  } = t.context;

  const wdUser1 = await provisionSmartWallet(wallets.user1, {
    BLD: 100n,
    IST: 100n,
  });
  t.log(`provisioning agoric smart wallet for ${wallets.user1}`);

  const vstorageClient = makeQueryTool();

  const doOffer = makeDoOffer(wdUser1);
  t.log(`${scenario.contractName} makeAccountInvitationMaker offer`);
  const makeAccountofferId = `makeAccount-${Date.now()}`;

  // FIXME we get payouts but not an offer result; it times out
  // chain logs shows an UNPUBLISHED result
  const _offerResult = await doOffer({
    id: makeAccountofferId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [scenario.contractName],
      callPipe: [['makeAccountInvitationMaker']],
    },
    proposal: {},
  });
  t.true(_offerResult);
  // t.is(await _offerResult, 'UNPUBLISHED', 'representation of continuing offer');

  // XXX fix above so we don't have to wait for the offer result to be published
  const { offerToPublicSubscriberPaths: makeAccountPublicSubscriberPaths } =
    await retryUntilCondition(
      () =>
        vstorageClient.queryData(`published.wallet.${wallets.user1}.current`),
      ({ offerToPublicSubscriberPaths }) =>
        !!offerToPublicSubscriberPaths.length,
      'makeAccount offer result is in vstorage',
    );

  t.log(makeAccountPublicSubscriberPaths[0]);
  t.regex(makeAccountPublicSubscriberPaths[0][0], /makeAccount/);

  const address = makeAccountPublicSubscriberPaths?.[0]?.[1]?.account
    .split('.')
    .pop();
  t.log('Got address:', address);
  t.regex(
    address,
    new RegExp(`^${scenario.expectedAddressPrefix}1`),
    `address for ${scenario.chain} is valid`,
  );

  if (scenario.chain === 'cosmoshub') {
    // see https://github.com/cosmos/cosmjs/pull/1593 for upstream fix
    t.pass(
      `SKIP ${scenario.chain}. @cosmjs/faucet does not support ICA address length.`,
    );
    return;
  }
  const { creditFromFaucet, getRestEndpoint } = useChain(scenario.chain);
  const queryClient = makeQueryClient(getRestEndpoint());

  t.log('Requesting faucet funds');
  await creditFromFaucet(address);

  const { balances } = await retryUntilCondition(
    () => queryClient.queryBalances(address),
    ({ balances }) => !!balances.length,
    'faucet funds available',
  );
  t.log('Updated balances:', balances);
  t.like(
    balances,
    [{ denom: scenario.denom, amount: '10000000000' }],
    'faucet balances available',
  );

  t.log('Delegate offer with continuing inv');
  const delegateOfferId = `delegate-${Date.now()}`;
  const { validators } = await queryClient.queryValidators();
  // @ts-expect-error using snake_case, not camelCase
  const validatorAddress = validators[0]?.operator_address;
  t.truthy(validatorAddress, 'found a validator to delegate to');
  t.log({ validatorAddress }, 'found a validator to delegate to');
  const _delegateOfferResult = await doOffer({
    id: delegateOfferId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: makeAccountofferId,
      invitationMakerName: 'Delegate',
      invitationArgs: [
        {
          address: validatorAddress,
          chainId: scenario.chainId,
          addressEncoding: 'bech32',
        },
        { denom: scenario.denom, value: 100n },
      ],
    },
    proposal: {},
  });
  t.log('@@@_delegateOfferResult', _delegateOfferResult);
  t.true(_delegateOfferResult, 'delegate payouts returned');

  const { delegation_responses } = await retryUntilCondition(
    () => queryClient.queryDelegations(address),
    ({ delegation_responses }) => !!delegation_responses.length,
    `delegations visible on ${scenario.chain}`,
  );
  t.log('delegation_responses:', delegation_responses);
  t.log('delegation balance', delegation_responses[0]?.balance);
  t.like(
    delegation_responses[0].balance,
    { denom: scenario.denom, amount: '100' },
    'delegations balance',
  );

  t.log('Undelegate offer with continuing inv');
  const undelegateOfferId = `undelegate-${Date.now()}`;
  const _undelegateOfferResult = await doOffer({
    id: undelegateOfferId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: makeAccountofferId,
      invitationMakerName: 'Undelegate',
      invitationArgs: [
        [
          {
            delegatorAddress: address,
            validatorAddress,
            shares: '50',
          },
        ],
      ],
    },
    proposal: {},
  });
  t.log('@@@_undelegateOfferResult', _undelegateOfferResult);
  t.true(_undelegateOfferResult, 'undelegate payouts returned');

  const { unbonding_responses } = await retryUntilCondition(
    () => queryClient.queryUnbonding(address),
    ({ unbonding_responses }) => !!unbonding_responses.length,
    `unbonding_responses visible on ${scenario.chain}`,
  );
  t.log('unbonding_responses:', unbonding_responses[0].entries);
  t.is(
    unbonding_responses[0].entries[0].balance,
    '50',
    'undelegating 50 shares in progress',
  );

  // TO DO CLAIM REWARDS
  // 1.a. query available
  // 2.a. claim them
});

test.serial('send wallet offers to stakeOsmo contract', stakeScenario, {
  chain: 'osmosis',
  chainId: 'osmosislocal',
  contractName: 'stakeOsmo',
  denom: 'uosmo',
  expectedAddressPrefix: 'osmo',
});

// TODO - stakeOsmo install override stakeAtom install?
// test.serial('send wallet offers stakeAtom contract', stakeScenario, {
//   chain: 'cosmoshub',
//   contractName: 'stakeAtom',
//   denom: 'uatom',
//   expectedAddressPrefix: 'cosmos',
// });
