import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { BridgeId } from '@agoric/internal';
import {
  withChainCapabilities,
  type CosmosValidatorAddress,
} from '@agoric/orchestration';
import type { start as startStakeIca } from '@agoric/orchestration/src/examples/stake-ica.contract.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { SIMULATED_ERRORS } from '@agoric/vats/tools/fake-bridge.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { Fail } from '@endo/errors';
import type { TestFn } from 'ava';
import {
  insistManagerType,
  makeSwingsetHarness,
} from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

const test: TestFn<
  WalletFactoryTestContext & {
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

const validatorAddress: CosmosValidatorAddress = {
  value: 'cosmosvaloper1test',
  chainId: 'gaiatest',
  encoding: 'bech32',
};

const ATOM_DENOM = 'uatom';

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before(async t => {
  insistManagerType(defaultManagerType);
  const harness =
    defaultManagerType === 'xsnap' ? makeSwingsetHarness() : undefined;
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
    { slogFile, defaultManagerType, harness },
  );
  t.context = { ...ctx, harness };
});
test.after.always(t => t.context.shutdown?.());

test.skip('stakeOsmo - queries', async t => {
  const {
    buildProposal,
    evalProposal,
    runUtils: { EV },
    harness,
  } = t.context;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeOsmo.js', [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
    ]),
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

  const queryRes = await EV(account).getBalance(ATOM_DENOM);
  t.deepEqual(queryRes, { value: 0n, denom: ATOM_DENOM });

  const queryUnknownDenom = await EV(account).getBalance('some-invalid-denom');
  t.deepEqual(
    queryUnknownDenom,
    { value: 0n, denom: 'some-invalid-denom' },
    'getBalance for unknown denom returns value: 0n',
  );
});

test.serial('stakeAtom - smart wallet', async t => {
  const {
    buildProposal,
    evalProposal,
    agoricNamesRemotes,
    bridgeUtils: { flushInboundQueue },
    readPublished,
    harness,
  } = t.context;

  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js', [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
    ]),
  );

  const wd = await t.context.walletFactoryDriver.provideSmartWallet(
    'agoric1testStakAtom',
  );

  harness?.useRunPolicy(true);
  await wd.sendOffer({
    id: 'request-account',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeAtom'],
      callPipe: [['makeAccountInvitationMaker']],
    },
    proposal: {},
  });
  harness && t.log('makeAccount computrons', harness.totalComputronCount());
  harness?.useRunPolicy(false);

  await flushInboundQueue();
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
  t.deepEqual(readPublished('stakeAtom.accounts.cosmos1test'), {
    localAddress:
      '/ibc-port/icacontroller-1/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-1',
    remoteAddress:
      '/ibc-hop/connection-8/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-1',
  });

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;

  // Cannot await executeOffer because the offer won't resolve until after the bridge's inbound queue is flushed.
  // But this test doesn't require that.
  await wd.sendOffer({
    id: 'request-delegate-success',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-account',
      invitationMakerName: 'Delegate',
      invitationArgs: [validatorAddress, { denom: ATOM_DENOM, value: 10n }],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-delegate-success', numWantsSatisfied: 1 },
  });

  const validatorAddressFail: CosmosValidatorAddress = {
    value: 'cosmosvaloper1fail',
    chainId: 'gaiatest',
    encoding: 'bech32',
  };

  // This will trigger the immediate ack of the mock bridge
  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-fail',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [
          validatorAddressFail,
          { denom: ATOM_DENOM, value: 10n },
        ],
      },
      proposal: {},
    }),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
    'delegate fails with invalid validator',
  );

  // This will trigger the immediate ack of the mock bridge
  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-brand',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [validatorAddress, { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
    {
      // TODO #10449
      message:
        "'amountToCoin' not working for \"[Alleged: ATOM brand]\" until #10449; use 'DenomAmount' for now",
    },
  );
});

test.todo('undelegate wallet offer');
test.todo('undelegate with multiple undelegations wallet offer');
test.todo('redelegate wallet offer');
test.todo('withdraw reward wallet offer');

test.serial('basic-flows', async t => {
  const {
    buildProposal,
    evalProposal,
    agoricNamesRemotes,
    readPublished,
    bridgeUtils: { flushInboundQueue, runInbound },
  } = t.context;

  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/orchestration/init-basic-flows.js',
      [
        '--chainInfo',
        JSON.stringify(withChainCapabilities(minimalChainInfos)),
        '--assetInfo',
        JSON.stringify([
          [
            'ibc/uusdconagoric',
            {
              chainName: 'agoric',
              baseName: 'noble',
              baseDenom: 'uusdc',
            },
          ],
          // not tested until #10006. consider renaming to ibc/uusdconcosmos
          // and updating boot/tools/ibc/mocks.ts
          [
            'ibc/uusdchash',
            {
              chainName: 'cosmoshub',
              baseName: 'noble',
              baseDenom: 'uusdc',
            },
          ],
        ]),
      ],
    ),
  );

  const wd =
    await t.context.walletFactoryDriver.provideSmartWallet('agoric1test');

  // create a cosmos orchestration account
  await wd.sendOffer({
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
  await flushInboundQueue();
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-coa',
        {
          account: 'published.basicFlows.cosmos1test1',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-coa', numWantsSatisfied: 1 },
  });
  t.deepEqual(readPublished('basicFlows.cosmos1test1'), {
    localAddress:
      '/ibc-port/icacontroller-2/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test1","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-2',
    remoteAddress:
      '/ibc-hop/connection-8/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test1","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-2',
  });

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
  const expectedAddress = makeTestAddress();
  t.deepEqual(publicSubscriberPaths['request-loa'], {
    account: `published.basicFlows.${expectedAddress}`,
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-loa', numWantsSatisfied: 1 },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-cosmos',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-coa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdchash', value: 10n },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: {
      id: 'transfer-to-noble-from-cosmos',
      error: undefined,
    },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-cosmos-timeout',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-coa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdchash', value: SIMULATED_ERRORS.TIMEOUT },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: {
      id: 'transfer-to-noble-from-cosmos-timeout',
      error:
        'Error: ABCI code: 5: error handling packet: see events for details',
    },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-agoric',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-loa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdconagoric', value: 10n },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });

  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: expectedAddress,
      target: expectedAddress,
      sourceChannel: 'channel-62',
      sequence: '1',
    }),
  );

  const latestOfferStatus = () => {
    const curr = wd.getLatestUpdateRecord();
    if (curr.updated === 'offerStatus') {
      return curr.status;
    }
    throw new Error('expected updated to be "offerStatus"');
  };

  const offerResult = latestOfferStatus();
  t.like(offerResult, {
    id: 'transfer-to-noble-from-agoric',
    error: undefined,
  });
  t.true('result' in offerResult, 'transfer vow settled');

  await t.throwsAsync(
    wd.executeOffer({
      id: 'transfer-to-noble-from-agoric-timeout',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-loa',
        invitationMakerName: 'Transfer',
      },
      proposal: {},
      offerArgs: {
        amount: { denom: 'ibc/uusdconagoric', value: SIMULATED_ERRORS.TIMEOUT },
        destination: {
          chainId: 'noble-1',
          value: 'noble1test',
          encoding: 'bech32',
        },
      },
    }),
  );
});

test.serial('auto-stake-it - proposal', async t => {
  const { buildProposal, evalProposal } = t.context;

  await t.notThrowsAsync(
    evalProposal(
      buildProposal('@agoric/builders/scripts/testing/init-auto-stake-it.js', [
        '--chainInfo',
        JSON.stringify(withChainCapabilities(minimalChainInfos)),
      ]),
    ),
  );
});

test.serial('basic-flows - portfolio holder', async t => {
  const {
    buildProposal,
    evalProposal,
    readPublished,
    agoricNamesRemotes,
    bridgeUtils: { flushInboundQueue },
  } = t.context;

  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/orchestration/init-basic-flows.js',
      [
        '--chainInfo',
        JSON.stringify(withChainCapabilities(minimalChainInfos)),
        '--assetInfo',
        JSON.stringify([
          [
            'ubld',
            {
              baseDenom: 'ubld',
              baseName: 'agoric',
              chainName: 'agoric',
              brandKey: 'BLD',
            },
          ],
        ]),
      ],
    ),
  );

  const wd =
    await t.context.walletFactoryDriver.provideSmartWallet('agoric1test2');

  // create a cosmos orchestration account
  await wd.sendOffer({
    id: 'request-portfolio-acct',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makePortfolioAccountInvitation']],
    },
    offerArgs: {
      chainNames: ['agoric', 'cosmoshub', 'osmosis'],
    },
    proposal: {},
  });
  t.like(
    wd.getLatestUpdateRecord(),
    {
      status: { id: 'request-portfolio-acct', numWantsSatisfied: 1 },
    },
    'trivially satisfied',
  );
  await flushInboundQueue();
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-portfolio-acct',
        {
          agoric:
            'published.basicFlows.agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
          cosmoshub: 'published.basicFlows.cosmos1test2',
          osmosis: 'published.basicFlows.cosmos1test3',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-portfolio-acct', numWantsSatisfied: 1 },
  });

  t.deepEqual(readPublished('basicFlows.cosmos1test3'), {
    localAddress:
      '/ibc-port/icacontroller-4/ordered/{"version":"ics27-1","controllerConnectionId":"connection-1","hostConnectionId":"connection-1649","address":"cosmos1test3","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-4',
    remoteAddress:
      '/ibc-hop/connection-1/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-1","hostConnectionId":"connection-1649","address":"cosmos1test3","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-4',
  });
  t.is(
    readPublished('basicFlows.agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g'),
    '',
  );

  const { BLD } = agoricNamesRemotes.brand;
  BLD || Fail`BLD missing from agoricNames`;

  await wd.sendOffer({
    id: 'delegate-cosmoshub',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-portfolio-acct',
      invitationMakerName: 'Proxying',
      invitationArgs: [
        'cosmoshub',
        'Delegate',
        [validatorAddress, { denom: ATOM_DENOM, value: 10n }],
      ],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'delegate-cosmoshub', numWantsSatisfied: 1 },
  });

  await wd.sendOffer({
    id: 'delegate-agoric',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-portfolio-acct',
      invitationMakerName: 'Proxying',
      invitationArgs: [
        'agoric',
        'Delegate',
        // XXX use ChainAddress for LocalOrchAccount
        ['agoric1validator1', { brand: BLD, value: 10n }],
      ],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'delegate-agoric', numWantsSatisfied: 1 },
  });

  await t.throwsAsync(
    wd.executeOffer({
      id: 'delegate-2-cosmoshub',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-portfolio-acct',
        invitationMakerName: 'Proxying',
        invitationArgs: [
          'cosmoshub',
          'Delegate',
          [
            validatorAddress,
            { denom: ATOM_DENOM, value: SIMULATED_ERRORS.TIMEOUT },
          ],
        ],
      },
      proposal: {},
    }),
  );

  await t.throwsAsync(
    wd.executeOffer({
      id: 'delegate-2-agoric',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-portfolio-acct',
        invitationMakerName: 'Proxying',
        invitationArgs: [
          'agoric',
          'Delegate',
          [
            'agoric1validator1',
            { brand: BLD, value: SIMULATED_ERRORS.TIMEOUT },
          ],
        ],
      },
      proposal: {},
    }),
  );
});
