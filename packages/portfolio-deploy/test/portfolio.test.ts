import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { protoMsgMockMap } from '@aglocal/boot/tools/ibc/mocks.ts';
import { AckBehavior } from '@aglocal/boot/tools/supports.ts';
import { makeProposalShapes } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makeUSDNIBCTraffic } from '@aglocal/portfolio-contract/test/mocks.ts';
import { makeClientMarshaller } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import { BridgeId } from '@agoric/internal';
import {
  defaultMarshaller,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import type { ChainInfo } from '@agoric/orchestration';
import type { CopyRecord } from '@endo/pass-style';
import { mustMatch } from '@endo/patterns';
import type { TestFn } from 'ava';
import type { PortfolioBootPowers } from '../src/portfolio-start.type.ts';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;

const beneficiary = 'agoric126sd64qkuag2fva3vy3syavggvw44ca2zfrzyy';

/** maps between on-chain identites and boardIDs */
const showValue = (v: string) => defaultMarshaller.fromCapData(JSON.parse(v));

type ConsumeBootstrapItem = <N extends string>(
  name: N,
) => N extends keyof PortfolioBootPowers['consume']
  ? PortfolioBootPowers['consume'][N]
  : unknown;

/**
 * To facilitate deployment to environments other than devnet,
 * ../src/chain-info.build.js fetches chainInfo dynamically
 * using --net and --peer.
 *
 * This is an example of the sort of chain info that results.
 * Here we're testing that things work without using the static
 * fetched-chain-info.js.
 */
const exampleDynamicChainInfo = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoriclocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'agoriclocal',
    stakingTokens: [{ denom: 'ubld' }],
    connections: {
      noblelocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  noble: {
    bech32Prefix: 'noble',
    chainId: 'noblelocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'noblelocal',
    stakingTokens: [{ denom: 'uusdc' }],
    connections: {
      agoriclocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  Avalanche: {
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  Optimism: {
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  Arbitrum: {
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
  Polygon: {
    namespace: 'eip155',
    reference: '137',
    cctpDestinationDomain: 7,
  },
} satisfies Record<string, ChainInfo>;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  // TODO: impact testing
  const ctx = await makeWalletFactoryContext(t, config);

  t.context = ctx;
});
test.after.always(t => t.context.shutdown?.());

test.serial('publish chainInfo etc.', async t => {
  const { buildProposal, evalProposal, runUtils } = t.context;
  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/chain-info.build.js',
    ['--chainInfo', JSON.stringify(exampleDynamicChainInfo)],
  );
  await evalProposal(materials);
  const { EV } = runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  for (const chain of [
    'agoric',
    'noble',
    'Avalanche',
    'Optimism',
    'Arbitrum',
    'Polygon',
  ]) {
    const info = await EV(agoricNames).lookup('chain', chain);
    t.log(info);
    t.truthy(info);
  }

  const { storage } = t.context;
  await documentStorageSchema(t, storage, {
    node: 'agoricNames.chain',
    owner: 'chain governance',
    showValue,
  });
  await documentStorageSchema(t, storage, {
    node: 'agoricNames.chainConnection',
    owner: 'chain governance',
    showValue,
  });
});

test.serial('access token setup', async t => {
  const { buildProposal, evalProposal, runUtils } = t.context;
  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/access-token-setup.build.js',
    ['--beneficiary', beneficiary],
  );

  const { walletFactoryDriver: wfd } = t.context;
  await wfd.provideSmartWallet(beneficiary);

  await evalProposal(materials);
  const { EV } = runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const brand = await EV(agoricNames).lookup('brand', 'PoC26');
  t.log(brand);
  t.truthy(brand);
  const issuer = await EV(agoricNames).lookup('issuer', 'PoC26');
  t.log(issuer);
  t.truthy(issuer);

  const { agoricNamesRemotes, refreshAgoricNamesRemotes } = t.context;
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.brand.PoC26);

  const { storage } = t.context;
  await documentStorageSchema(t, storage, {
    node: 'agoricNames.brand',
    owner: 'chain governance',
    showValue,
  });
  await documentStorageSchema(t, storage, {
    node: 'agoricNames.vbankAsset',
    owner: 'chain governance',
    showValue,
  });
});

test.serial('resolve USDC issuer', async t => {
  const { buildProposal, evalProposal } = t.context;
  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/usdc-resolve.build.js',
  );

  await evalProposal(materials);
  t.pass('not straightforward to test promise space contents');
});

test.serial('contract starts; appears in agoricNames', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
    storage,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  // needed since the portfolio creation relies on an ICA being created
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  // TODO:  bridgeUtils.setBech32Prefix('noble');

  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/portfolio.build.js',
    ['--net', 'mainnet'],
  );
  await evalProposal(materials);

  // update now that contract is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.ymax0);

  await documentStorageSchema(t, storage, {
    node: 'agoricNames.instance',
    owner: 'chain governance',
    showValue,
  });
  await documentStorageSchema(t, storage, {
    node: 'ymax0',
    owner: 'ymax0',
    showValue,
  });
});

test.serial('remove old contract; start new contract', async t => {
  const {
    agoricNamesRemotes,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
    storage,
  } = t.context;

  const instancePre = agoricNamesRemotes.instance.ymax0;
  const oldBoardId = (instancePre as any).getBoardId();
  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/portfolio.build.js',
    ['--replace', oldBoardId],
  );
  await evalProposal(materials);

  refreshAgoricNamesRemotes();
  const instancePost = agoricNamesRemotes.instance.ymax0;
  t.truthy(instancePost);
  t.not(instancePre, instancePost);

  await documentStorageSchema(t, storage, {
    node: 'agoricNames.instance',
    owner: 'chain governance',
    showValue,
  });
  await documentStorageSchema(t, storage, {
    node: 'ymax0',
    owner: 'ymax0',
    showValue,
  });
});

const { make } = AmountMath;

// give: ...rest: {"Access":{"brand":"[Alleged: BoardRemotePoC26 brand]","value":"[1n]"}} - Must be: {}
test.skip('open a USDN position', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;

  for (const { msg, ack } of Object.values(
    makeUSDNIBCTraffic('agoric1trader1', `${3_333 * 1_000_000}`),
  )) {
    protoMsgMockMap[msg] = ack; // XXX static mutable state
  }

  const myMarshaller = makeClientMarshaller(v => (v as any).getBoardId());
  // XXX: should have 10K USDC
  const wallet = await wfd.provideSmartWallet(beneficiary, myMarshaller);

  const { USDC, PoC26 } = agoricNamesRemotes.brand as unknown as Record<
    string,
    Brand<'nat'>
  >;
  t.log({ USDC, PoC26 });
  t.truthy(PoC26);
  const give = harden({
    USDN: make(USDC, 3_333n * 1_000_000n),
    Access: make(PoC26, 1n),
  });

  const ps = makeProposalShapes(USDC, PoC26);
  mustMatch(harden({ give, want: {} }), ps.openPortfolio);

  t.log('opening portfolio', myMarshaller.toCapData(give));
  await wallet.sendOffer({
    id: `open-1`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: { give },
    offerArgs: {},
  });
  const update = wallet.getLatestUpdateRecord(); // XXX remote should be async
  t.log('update', update);
  const current = wallet.getCurrentWalletRecord(); // XXX remote should be async
  t.log('trader1 current', current);
  t.truthy(current);
  t.snapshot(myMarshaller.toCapData(current as CopyRecord), 'wallet.current');

  const { storage } = t.context;
  await documentStorageSchema(t, storage, {
    node: 'wallet',
    owner: 'walletFactory',
    showValue,
  });
  await documentStorageSchema(t, storage, {
    node: 'ymax0',
    owner: 'ymax0',
    showValue,
  });
});

// Expect it fail when run independently
test.serial('restart contract', async t => {
  const {
    runUtils: { EV },
    agoricNamesRemotes,
    walletFactoryDriver: wfd,
  } = t.context;

  t.truthy(agoricNamesRemotes.instance.ymax0);

  const kit = await (EV.vat('bootstrap').consumeItem as ConsumeBootstrapItem)(
    'ymax0Kit',
  );
  const actual = await EV(kit.adminFacet).restartContract(kit.privateArgs);

  // Expect incarnation 1: first restart from initial deployment
  // (The "remove old contract; start new contract" test creates a new contract
  // instance, not an incarnation)
  t.deepEqual(actual, { incarnationNumber: 1 });

  // Test opening a portfolio after restart
  for (const { msg, ack } of Object.values(
    makeUSDNIBCTraffic('agoric1trader1', `${3_333 * 1_000_000}`),
  )) {
    protoMsgMockMap[msg] = ack;
  }

  const myMarshaller = makeClientMarshaller(v => (v as any).getBoardId());
  const wallet = await wfd.provideSmartWallet(beneficiary, myMarshaller);

  const { USDC, PoC26, BLD } = agoricNamesRemotes.brand as unknown as Record<
    string,
    Brand<'nat'>
  >;
  const give = harden({
    Deposit: make(USDC, 3_333n * 1_000_000n),
    Access: make(PoC26, 1n),
    GmpFee: make(BLD, 1000n),
  });

  const ps = makeProposalShapes(USDC, BLD, PoC26);
  mustMatch(harden({ give, want: {} }), ps.openPortfolio);

  // XXX There is got to be a cleaner way to do this
  const getPortfolioCount = () => {
    try {
      const portfolioData = t.context.readPublished('ymax0.portfolios');
      const match = portfolioData.addPortfolio.match(/^portfolio(\d+)$/);
      return parseInt(match![1], 10) + 1;
    } catch (e) {
      // If no portfolios exist yet, return 0
      t.log(e);
      return 0;
    }
  };

  const portfolioCountBefore = getPortfolioCount();
  t.log('Portfolios before offer:', portfolioCountBefore);

  await wallet.sendOffer({
    id: `open-after-restart`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: { give },
    offerArgs: {},
  });

  const portfolioCountAfter = getPortfolioCount();
  t.log('Portfolios after offer:', portfolioCountAfter);

  t.is(
    portfolioCountAfter,
    portfolioCountBefore + 1,
    'Should have exactly one additional portfolio after opening',
  );
});

test.todo("won't a contract upgrade override the older positions in vstorage?");
