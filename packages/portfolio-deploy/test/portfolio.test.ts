import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { protoMsgMockMap } from '@aglocal/boot/tools/ibc/mocks.js';
import {
  insistManagerType,
  makeSwingsetHarness,
} from '@aglocal/boot/tools/supports.js';
import { makeProposalShapes } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makeUSDNIBCTraffic } from '@aglocal/portfolio-contract/test/mocks.ts';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeClientMarshaller } from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import {
  defaultMarshaller,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { passStyleOf, type CopyRecord } from '@endo/pass-style';
import { mustMatch } from '@endo/patterns';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  getPermitWitnessTransferFromData,
  type TokenPermissions,
} from '@agoric/orchestration/src/utils/permit2.ts';
import {
  getYmaxWitness,
  type TargetAllocation,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.ts';
import type { TestFn } from 'ava';
import type { PortfolioBootPowers } from '../src/portfolio-start.type.ts';
import { axelarConfig } from '../src/axelar-configs.js';
import {
  beneficiary,
  controllerAddr,
  CURRENT_TIME,
} from './portfolio-snapshot-setup.ts';
import { loadOrCreatePortfolioSnapshot } from './portfolio-snapshots.ts';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<
  WalletFactoryTestContext & {
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

/** maps between on-chain identites and boardIDs */
const showValue = (v: string) => defaultMarshaller.fromCapData(JSON.parse(v));

type ConsumeBootstrapItem = <N extends string>(
  name: N,
) => N extends keyof PortfolioBootPowers['consume']
  ? PortfolioBootPowers['consume'][N]
  : unknown;

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  // TODO: impact testing
  insistManagerType(defaultManagerType);
  const harness = ['xs-worker', 'xsnap'].includes(defaultManagerType)
    ? makeSwingsetHarness()
    : undefined;
  const snapshot = await loadOrCreatePortfolioSnapshot(
    'portfolio-ready',
    t.log,
  );
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
    harness,
    snapshot,
  });

  t.context = { ...ctx, harness };
});
test.after.always(t => t.context.shutdown?.());

test.serial('publish chainInfo etc.', async t => {
  const {
    runUtils: { EV },
  } = t.context;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  for (const chain of [
    'agoric',
    'noble',
    'Avalanche',
    'Optimism',
    'Arbitrum',
    'Ethereum',
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
  const {
    runUtils: { EV },
  } = t.context;
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
  const { agoricNamesRemotes } = t.context;
  t.truthy(agoricNamesRemotes.brand.USDC);
  t.truthy(agoricNamesRemotes.issuer.USDC);
});

test.serial('contract starts; appears in agoricNames', async t => {
  const { agoricNamesRemotes, storage } = t.context;
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

test.serial('delegate control', async t => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = t.context;

  const wallet = await wfd.provideSmartWallet(controllerAddr);
  assert(agoricNamesRemotes.instance.postalService);

  await wallet.invokeEntry({
    targetName: 'ymaxControl',
    method: 'pruneChainStorage',
    args: [{}],
  });
  t.pass('ymaxControl is invocable');
});

// XXX this needs a CCTP tx setup to work which is not available atm
test.skip('CCTP settlement works', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
  const marshaller = makeClientMarshaller(v => (v as any).getBoardId());

  const wallet = await wfd.provideSmartWallet(beneficiary, marshaller);
  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);

  t.log('Getting creator facet of ymax0');
  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet' },
  });

  const postalService = agoricNamesRemotes.instance.postalService;
  const inviteId = Date.now().toString();

  t.log('Delivering resolver invitation');
  await controllerWallet.invokeEntry({
    id: inviteId,
    targetName: 'ymax0.creatorFacet',
    method: 'deliverResolverInvitation',
    args: [beneficiary, postalService],
  });

  const currentWalletRecord = await wallet.getCurrentWalletRecord();

  t.log('Using resolver invitation to get invitationMaker');
  await wallet.executeOffer({
    id: 'settle-cctp',
    invitationSpec: {
      source: 'purse',
      instance: currentWalletRecord.purses[0].balance.value[0].instance,
      description: 'resolver',
    },
    proposal: { give: {}, want: {} },
  });

  await eventLoopIteration();

  t.log('Executing CCTP settlement offer');
  await wallet.executeOffer({
    id: '123',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'settle-cctp',
      invitationMakerName: 'SettleTransaction',
    },
    proposal: { give: {}, want: {} },
    offerArgs: {
      txDetails: {
        amount: 10_000n,
        remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
        status: 'success',
      },
      remoteAxelarChain: 'eip155:42161',
      txId: 'tx0',
    },
  });
  const latestWalletRecord = wallet.getLatestUpdateRecord();

  t.like(latestWalletRecord, {
    status: {
      id: '123',
      invitationSpec: {
        invitationMakerName: 'SettleTransaction',
        source: 'continuing',
        previousOffer: 'settle-cctp',
      },
      numWantsSatisfied: 1,
      offerArgs: {
        remoteAxelarChain: 'eip155:42161',
        txDetails: {
          amount: 10000n,
          remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
          status: 'success',
        },
        txId: 'tx0',
      },
    },
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

  // Ensure we're no longer overriding the defaultFlowConfig.
  const { defaultFlowConfig: _, ...noDefaultFlowConfigArgs } = kit.privateArgs;
  const actual = await EV(kit.adminFacet).restartContract(
    noDefaultFlowConfigArgs,
  );

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

  const { USDC, PoC26 } = agoricNamesRemotes.brand as unknown as Record<
    string,
    Brand<'nat'>
  >;
  const give = harden({
    Deposit: make(USDC, 3_333n * 1_000_000n),
    Access: make(PoC26, 1n),
  });

  const ps = makeProposalShapes(USDC, PoC26);
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

// XXX this needs a CCTP tx setup to work which is not available atm
test.skip('CCTP settlement works across contract restarts', async t => {
  const { walletFactoryDriver: wfd } = t.context;

  const myMarshaller = makeClientMarshaller(v => (v as any).getBoardId());
  const wallet = await wfd.provideSmartWallet(beneficiary, myMarshaller);

  await wallet.executeOffer({
    id: '456',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'settle-cctp',
      invitationMakerName: 'SettleTransaction',
    },
    proposal: { give: {}, want: {} },
    offerArgs: {
      txDetails: {
        amount: 40_000n,
        remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
        status: 'success',
      },
      remoteAxelarChain: 'eip155:42161',
      txId: 'tx0',
    },
  });

  const finalUpdate = wallet.getLatestUpdateRecord();
  t.log('Final wallet update:', finalUpdate);

  t.like(finalUpdate, {
    status: {
      id: '456',
      invitationSpec: {
        invitationMakerName: 'SettleTransaction',
        source: 'continuing',
        previousOffer: 'settle-cctp',
      },
      numWantsSatisfied: 1,
      offerArgs: {
        remoteAxelarChain: 'eip155:42161',
        txDetails: {
          amount: 40000n,
          remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
          status: 'success',
        },
        txId: 'tx0',
      },
    },
  });

  t.log('Test completed: CCTP settlement works across contract restarts');
});

test.serial('remove old contract; start new contract', async t => {
  const {
    runUtils: { EV },
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver: wfd,
    storage,
  } = t.context;

  const instancePre = agoricNamesRemotes.instance.ymax0;
  const installation = agoricNamesRemotes.installation.ymax0;
  const issuers = {
    Access: agoricNamesRemotes.issuer.PoC26,
    USDC: agoricNamesRemotes.issuer.USDC,
    BLD: agoricNamesRemotes.issuer.BLD,
    Fee: agoricNamesRemotes.issuer.BLD,
  };

  const { privateArgs } = await (
    EV.vat('bootstrap').consumeItem as ConsumeBootstrapItem
  )('ymax0Kit');

  const oldBoardId = (instancePre as any).getBoardId();
  const wallet = await wfd.provideSmartWallet(controllerAddr);

  t.log('Invoking ymaxControl to remove old contract');
  await wallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'terminate',
    args: [{ message: 'restarting contract', target: oldBoardId }],
  });

  const privateArgsOverrides = harden({
    assetInfo: privateArgs.assetInfo,
    axelarIds: privateArgs.axelarIds,
    chainInfo: privateArgs.chainInfo,
    contracts: privateArgs.contracts,
    gmpAddresses: privateArgs.gmpAddresses,
    walletBytecode: privateArgs.walletBytecode,
  }) satisfies CopyRecord;
  t.is(passStyleOf(privateArgsOverrides), 'copyRecord');

  t.log('Invoking ymaxControl to start new contract');
  await wallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'start',
    // use privateArgsOverrides as portfolio-control no longer copies those from the kit
    // @ts-expect-error chainInfo incompatible with Passable?
    args: [{ installation, issuers, privateArgsOverrides }],
  });

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

test.serial('invite planner', async t => {
  const {
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver: wfd,
  } = t.context;

  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);

  t.log('Getting new creator facet of ymax0');
  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new', overwrite: true },
  });

  t.log('invite planner');
  const plannerAddr = 'agoric1planner';
  const plannerWallet = await wfd.provideSmartWallet(plannerAddr);
  refreshAgoricNamesRemotes();
  const postalService = agoricNamesRemotes.instance.postalService;

  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymax0.creatorFacet-new',
    method: 'deliverPlannerInvitation',
    args: [plannerAddr, postalService],
  });

  t.log('redeem planner invitation');
  const yInst = agoricNamesRemotes.instance.ymax0;
  await plannerWallet.executeOffer({
    id: Date.now().toString(),
    invitationSpec: {
      source: 'purse',
      description: 'planner',
      instance: yInst,
    },
    proposal: {},
    saveResult: { name: 'planner' },
  });

  t.pass();
});

test.serial('invite evm handler', async t => {
  const {
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver: wfd,
  } = t.context;

  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);

  t.log('Getting new creator facet of ymax0');
  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new', overwrite: true },
  });

  t.log('invite evm handler');
  const evmHandlerAddr = 'agoric1evmhandler';
  const evmHandlerWallet = await wfd.provideSmartWallet(evmHandlerAddr);
  refreshAgoricNamesRemotes();
  const postalService = agoricNamesRemotes.instance.postalService;

  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymax0.creatorFacet-new',
    method: 'deliverEVMWalletHandlerInvitation',
    args: [evmHandlerAddr, postalService],
  });

  t.log('redeem evm handler invitation');
  const yInst = agoricNamesRemotes.instance.ymax0;
  await evmHandlerWallet.executeOffer({
    id: Date.now().toString(),
    invitationSpec: {
      source: 'purse',
      description: 'evmWalletHandler',
      instance: yInst,
    },
    proposal: {},
    saveResult: { name: 'evmWalletHandler' },
  });

  t.pass();
});

const evmOpen = test.macro(
  async (t, spender: 'remoteAccountRouter' | 'depositFactory') => {
    const wfd = t.context.walletFactoryDriver;

    const evmHandlerAddr = 'agoric1evmhandler';
    const evmHandlerWallet = await wfd.provideSmartWallet(evmHandlerAddr);

    t.log('open portfolio', { spender });
    // TODO: get from context, ambient random
    const userPrivateKey = generatePrivateKey();
    const userAccount = privateKeyToAccount(userPrivateKey);

    const deadline = CURRENT_TIME + 3600n;
    // not a secure nonce, but sufficient for test purposes
    const nonce = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

    const deposit: TokenPermissions = {
      token: axelarConfig.Arbitrum.contracts.usdc,
      amount: 1_000n * 1_000_000n,
    };

    const allocations: TargetAllocation[] = [
      { instrument: 'Aave_Arbitrum', portion: 6000n },
      { instrument: 'Compound_Arbitrum', portion: 4000n },
    ];

    const witness = getYmaxWitness('OpenPortfolio', { allocations });

    const spenderAddress = axelarConfig.Arbitrum.contracts[spender];
    if (!spenderAddress || spenderAddress.length <= 2) {
      t.log(`No address configured for spender ${spender}`);
      t.pass();
      return;
    }

    const openPortfolioMessage = getPermitWitnessTransferFromData(
      {
        permitted: deposit,
        spender: spenderAddress,
        nonce,
        deadline,
      },
      axelarConfig.Arbitrum.contracts.permit2,
      BigInt(axelarConfig.Arbitrum.chainInfo.reference),
      witness,
    );

    const signature = await userAccount.signTypedData(openPortfolioMessage);

    t.log('signed message', { ...openPortfolioMessage, signature });

    await evmHandlerWallet.invokeEntry({
      id: Date.now().toString(),
      targetName: 'evmWalletHandler',
      method: 'handleMessage',
      args: [{ ...openPortfolioMessage, signature } as CopyRecord],
    });

    const walletUpdate = t.context.readPublished(
      `ymax0.evmWallets.${userAccount.address}`,
    );
    t.like(walletUpdate, {
      updated: 'messageUpdate',
      nonce,
      deadline,
      status: 'ok',
    });

    // @ts-expect-error t.like doesn't narrow sufficiently
    const portfolio = walletUpdate.result as `portfolio${number}`;

    const portfolios = t.context.readPublished(
      `ymax0.evmWallets.${userAccount.address}.portfolio`,
    );

    t.true(portfolios.some(p => p.endsWith(portfolio)));
  },
);

test.serial(
  'open portfolio from evm with depositFactory',
  evmOpen,
  'depositFactory',
);
test.serial(
  'open portfolio from evm with remoteAccountRouter',
  evmOpen,
  'remoteAccountRouter',
);

test.serial(
  'CCTP settlement with old invitation doesnt work with new contract instance',
  async t => {
    const { walletFactoryDriver: wfd } = t.context;
    const marshaller = makeClientMarshaller(v => (v as any).getBoardId());

    const wallet = await wfd.provideSmartWallet(beneficiary, marshaller);

    const id = Date.now().toString();
    await t.throwsAsync(
      wallet.executeOffer({
        id,
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'settle-cctp',
          invitationMakerName: 'SettleTransaction',
        },
        proposal: { give: {}, want: {} },
        offerArgs: {
          txDetails: {
            amount: 10_000n,
            remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
            status: 'success',
          },
          txId: 'tx0',
          remoteAxelarChain: 'eip155:42161',
        },
      }),
    );
  },
);

// XXX this needs a CCTP tx setup to work which is not available atm
test.skip('CCTP settlement works with new invitation after contract remove and start', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
  const marshaller = makeClientMarshaller(v => (v as any).getBoardId());

  const wallet = await wfd.provideSmartWallet(beneficiary, marshaller);
  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);
  const postalService = agoricNamesRemotes.instance.postalService;
  const inviteId = Date.now().toString();

  t.log('Getting new creator facet of ymax0');
  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new' },
  });

  t.log('Delivering resolver invitation for new contract');
  await controllerWallet.invokeEntry({
    id: inviteId,
    targetName: 'ymax0.creatorFacet-new',
    method: 'deliverResolverInvitation',
    args: [beneficiary, postalService],
  });

  const currentWalletRecord = await wallet.getCurrentWalletRecord();

  await wallet.executeOffer({
    id: 'settle-cctp-new',
    invitationSpec: {
      source: 'purse',
      instance: currentWalletRecord.purses[0].balance.value[0].instance,
      description: 'resolver',
    },
    proposal: { give: {}, want: {} },
  });

  await eventLoopIteration();

  const id = Date.now().toString();
  await wallet.executeOffer({
    id,
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'settle-cctp-new',
      invitationMakerName: 'SettleTransaction',
    },
    proposal: { give: {}, want: {} },
    offerArgs: {
      txDetails: {
        amount: 10_000n,
        remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
        status: 'success',
      },
      remoteAxelarChain: 'eip155:42161',
    },
  });
  const latestWalletRecord = wallet.getLatestUpdateRecord();

  t.like(latestWalletRecord, {
    status: {
      id,
      invitationSpec: {
        invitationMakerName: 'SettleTransaction',
        source: 'continuing',
        previousOffer: 'settle-cctp-new',
      },
      numWantsSatisfied: 1,
      offerArgs: {
        remoteAxelarChain: 'eip155:42161',
        txDetails: {
          amount: 10000n,
          remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
          status: 'success',
        },
        txId: 'tx0',
      },
    },
  });

  t.like(latestWalletRecord, {
    status: {
      id,
      invitationSpec: {
        invitationMakerName: 'SettleTransaction',
        source: 'continuing',
        previousOffer: 'settle-cctp-new',
      },
      numWantsSatisfied: 1,
      offerArgs: {
        remoteAxelarChain: 'eip155:42161',
        txDetails: {
          amount: 10000n,
          remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
          status: 'success',
        },
        txId: 'tx0',
      },
    },
  });
});

test.serial(
  'upgrade contract preserves portfolios and allows opening without Access',
  async t => {
    const {
      runUtils: { EV },
      agoricNamesRemotes,
      walletFactoryDriver: wfd,
    } = t.context;

    t.truthy(agoricNamesRemotes.instance.ymax0);

    const controllerWallet = await wfd.provideSmartWallet(controllerAddr);
    const wallet = await wfd.provideSmartWallet(beneficiary);

    const getPortfolioCount = () => {
      try {
        const portfolioData = t.context.readPublished('ymax0.portfolios');
        const match = portfolioData.addPortfolio.match(/^portfolio(\d+)$/);
        return parseInt(match![1], 10) + 1;
      } catch {
        return 0;
      }
    };

    const portfolioCountBefore = getPortfolioCount();
    t.log('Portfolios before upgrade:', portfolioCountBefore);

    const zoe = await EV.vat('bootstrap').consumeItem('zoe');
    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    // Scope choice for this test: upgrade-to-current-installation is intentional.
    // This validates upgrade plumbing + state preservation + post-upgrade behavior,
    // but does not attempt to prove an old-bundle -> new-bundle migration.
    const installation = await EV(agoricNames).lookup('installation', 'ymax0');
    const bundleId = await EV(zoe).getBundleIDFromInstallation(installation);
    t.true(typeof bundleId === 'string' && bundleId.length > 0);

    await controllerWallet.invokeEntry({
      id: `upgrade-${Date.now()}`,
      targetName: 'ymaxControl',
      method: 'upgrade',
      args: [{ bundleId }],
    });

    const portfolioCountAfterUpgrade = getPortfolioCount();
    t.is(
      portfolioCountAfterUpgrade,
      portfolioCountBefore,
      'Upgrade should preserve existing portfolios',
    );

    await wallet.sendOffer({
      id: `open-after-upgrade-no-access`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal: { give: {} },
      offerArgs: {},
    });
    await eventLoopIteration();

    const portfolioCountAfterOpen = getPortfolioCount();
    t.is(
      portfolioCountAfterOpen,
      portfolioCountBefore + 1,
      'Should open one additional portfolio after upgrade without Access',
    );
  },
);

const { make } = AmountMath;

// give: ...rest: {"Access":{"brand":"[Alleged: BoardRemotePoC26 brand]","value":"[1n]"}} - Must be: {}
test.failing('open a USDN position', async t => {
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

test.todo("won't a contract upgrade override the older positions in vstorage?");
