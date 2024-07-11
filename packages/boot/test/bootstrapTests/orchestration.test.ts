import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { documentStorageSchema } from '@agoric/internal/src/storage-test-utils.js';
import type { CosmosValidatorAddress } from '@agoric/orchestration';
import type { start as startStakeIca } from '@agoric/orchestration/src/examples/stakeIca.contract.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

/**
 * Test the config itself. Part of this suite so we don't have to start up another swingset.
 */
test.serial('config', async t => {
  const {
    storage,
    readLatest,
    runUtils: { EV },
  } = t.context;

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');

  {
    const cosmosChainInfo = await EV(agoricNames).lookup('chain', 'cosmoshub');
    t.like(cosmosChainInfo, {
      chainId: 'cosmoshub-4',
      stakingTokens: [{ denom: 'uatom' }],
    });
    t.deepEqual(
      readLatest(`published.agoricNames.chain.cosmoshub`),
      cosmosChainInfo,
    );
    await documentStorageSchema(t, storage, {
      note: 'Chain info for Orchestration',
      node: 'agoricNames.chain',
    });
  }

  {
    const connection = await EV(agoricNames).lookup(
      'chainConnection',
      'cosmoshub-4_juno-1',
    );
    t.like(connection, {
      state: 3,
      transferChannel: { portId: 'transfer', state: 3 },
    });

    t.deepEqual(
      readLatest(`published.agoricNames.chainConnection.cosmoshub-4_juno-1`),
      connection,
    );

    await documentStorageSchema(t, storage, {
      note: 'Chain connections for Orchestration',
      node: 'agoricNames.chainConnection',
    });
  }
});

test.skip('stakeOsmo - queries', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeOsmo.js'),
  );

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const instance: Instance<typeof startStakeIca> = await EV(agoricNames).lookup(
    'instance',
    'stakeOsmo',
  );
  t.truthy(instance, 'stakeOsmo instance is available');

  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const publicFacet = await EV(zoe).getPublicFacet(instance);
  t.truthy(publicFacet, 'stakeOsmo publicFacet is available');

  const account = await EV(publicFacet).makeAccount();
  t.log('account', account);
  t.truthy(account, 'makeAccount returns an account on OSMO connection');

  const queryRes = await EV(account).getBalance('uatom');
  t.deepEqual(queryRes, { value: 0n, denom: 'uatom' });

  const queryUnknownDenom = await EV(account).getBalance('some-invalid-denom');
  t.deepEqual(
    queryUnknownDenom,
    { value: 0n, denom: 'some-invalid-denom' },
    'getBalance for unknown denom returns value: 0n',
  );
});

test.serial('stakeAtom - smart wallet', async t => {
  const { buildProposal, evalProposal, agoricNamesRemotes, readLatest } =
    t.context;

  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js'),
  );

  const wd = await t.context.walletFactoryDriver.provideSmartWallet(
    'agoric1testStakAtom',
  );

  await wd.executeOffer({
    id: 'request-account',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeAtom'],
      callPipe: [['makeAccountInvitationMaker']],
    },
    proposal: {},
  });
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-account',
        {
          account: 'published.stakeAtom.accounts.cosmos1test',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-account', numWantsSatisfied: 1 },
  });
  t.is(readLatest('published.stakeAtom.accounts.cosmos1test'), '');

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;
  const validatorAddress: CosmosValidatorAddress = {
    value: 'cosmosvaloper1test',
    chainId: 'gaiatest',
    encoding: 'bech32',
  };

  await t.notThrowsAsync(
    wd.executeOffer({
      id: 'request-delegate-success',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [validatorAddress, { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
  );
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-delegate-success', numWantsSatisfied: 1 },
  });

  const validatorAddressFail: CosmosValidatorAddress = {
    value: 'cosmosvaloper1fail',
    chainId: 'gaiatest',
    encoding: 'bech32',
  };

  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-fail',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [validatorAddressFail, { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
    'delegate fails with invalid validator',
  );
});

test.todo('undelegate wallet offer');
test.todo('undelegate with multiple undelegations wallet offer');
test.todo('redelegate wallet offer');
test.todo('withdraw reward wallet offer');

// XXX rely on .serial to be in sequence, and keep this one last
test.serial('revise chain info', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');

  await t.throwsAsync(EV(agoricNames).lookup('chain', 'hot'), {
    message: '"nameKey" not found: "hot"',
  });

  // Revise chain info in agoricNames with the fixture in this script
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/append-chain-info.js'),
  );

  const hotchain = await EV(agoricNames).lookup('chain', 'hot');
  t.deepEqual(hotchain, { allegedName: 'Hot New Chain', chainId: 'hot-1' });

  const connection = await EV(agoricNames).lookup(
    'chainConnection',
    'cosmoshub-4_hot-1',
  );
  t.like(connection, {
    id: 'connection-99',
    client_id: '07-tendermint-3',
  });
});

test('basic-flows', async t => {
  const { buildProposal, evalProposal, agoricNamesRemotes, readLatest } =
    t.context;

  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-basic-flows.js'),
  );

  const wd =
    await t.context.walletFactoryDriver.provideSmartWallet('agoric1test');

  // create a cosmos orchestration account
  await wd.executeOffer({
    id: 'request-coa',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: {
      chainName: 'cosmoshub',
    },
    proposal: {},
  });
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-coa',
        {
          account: 'published.basicFlows.cosmos1test',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-coa', numWantsSatisfied: 1 },
  });
  t.is(readLatest('published.basicFlows.cosmos1test'), '');

  // create a local orchestration account
  await wd.executeOffer({
    id: 'request-loa',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: {
      chainName: 'agoric',
    },
    proposal: {},
  });

  const publicSubscriberPaths = Object.fromEntries(
    wd.getCurrentWalletRecord().offerToPublicSubscriberPaths,
  );
  t.deepEqual(publicSubscriberPaths['request-loa'], {
    account: 'published.basicFlows.agoric1mockVlocalchainAddress',
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-loa', numWantsSatisfied: 1 },
  });
  t.is(readLatest('published.basicFlows.agoric1mockVlocalchainAddress'), '');
});
