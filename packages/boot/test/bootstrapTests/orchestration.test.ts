import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import { Fail } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { M, matches } from '@endo/patterns';
import type { CosmosValidatorAddress } from '@agoric/orchestration';
import type { start as startStakeAtom } from '@agoric/orchestration/src/examples/stakeAtom.contract.js';
import { makeWalletFactoryContext } from './walletFactory.ts';

type DefaultTestContext = Awaited<ReturnType<typeof makeWalletFactoryContext>>;

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeWalletFactoryContext(t)));
test.after.always(t => t.context.shutdown?.());

test.serial('stakeAtom - repl-style', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
  } = t.context;
  // TODO move into a vm-config
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-network.js'),
  );
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-orchestration.js'),
  );
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js'),
  );

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const instance: Instance<typeof startStakeAtom> = await EV(
    agoricNames,
  ).lookup('instance', 'stakeAtom');
  t.truthy(instance, 'stakeAtom instance is available');

  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const publicFacet = await EV(zoe).getPublicFacet(instance);
  t.truthy(publicFacet, 'stakeAtom publicFacet is available');

  const account = await EV(publicFacet).makeAccount();
  t.log('account', account);
  t.truthy(account, 'makeAccount returns an account on ATOM connection');
  t.truthy(
    matches(account, M.remotable('ChainAccount')),
    'account is a remotable',
  );

  const atomBrand: Brand = await EV(agoricNames).lookup('brand', 'ATOM');
  const atomAmount = AmountMath.make(atomBrand, 10n);

  const validatorAddress: CosmosValidatorAddress = {
    address: 'cosmosvaloper1test',
    chainId: 'gaiatest',
    addressEncoding: 'bech32',
  };
  await t.notThrowsAsync(EV(account).delegate(validatorAddress, atomAmount));

  const queryRes = await EV(account).getBalance();
  t.deepEqual(queryRes, { value: 0n, denom: 'uatom' });

  const queryUnknownDenom = await EV(account).getBalance('some-invalid-denom');
  t.deepEqual(
    queryUnknownDenom,
    { value: 0n, denom: 'some-invalid-denom' },
    'getBalance for unknown denom returns value: 0n',
  );
});

test.serial('stakeAtom - smart wallet', async t => {
  const { agoricNamesRemotes } = t.context;

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
      ['request-account', { account: 'published.stakeAtom' }],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-account', numWantsSatisfied: 1 },
  });

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;
  const validatorAddress: CosmosValidatorAddress = {
    address: 'cosmosvaloper1test',
    chainId: 'gaiatest',
    addressEncoding: 'bech32',
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
    address: 'cosmosvaloper1fail',
    chainId: 'gaiatest',
    addressEncoding: 'bech32',
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
