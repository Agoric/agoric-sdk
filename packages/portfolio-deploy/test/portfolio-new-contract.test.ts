import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  insistManagerType,
  makeSwingsetHarness,
} from '@aglocal/boot/tools/supports.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeClientMarshaller } from '@agoric/client-utils';
import { type CopyRecord } from '@endo/pass-style';
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

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

const getPortfolioCount = (t: {
  context: Pick<WalletFactoryTestContext, 'readPublished'>;
  log: (...args: unknown[]) => void;
}) => {
  try {
    const portfolioData = t.context.readPublished('ymax0.portfolios');
    const match = portfolioData.addPortfolio.match(/^portfolio(\d+)$/);
    return parseInt(match![1], 10) + 1;
  } catch (e) {
    t.log(e);
    return 0;
  }
};

test.before('bootstrap new-contract snapshot', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  insistManagerType(defaultManagerType);
  const harness = ['xs-worker', 'xsnap'].includes(defaultManagerType)
    ? makeSwingsetHarness()
    : undefined;
  const snapshot = await loadOrCreatePortfolioSnapshot(
    'portfolio-new-contract-ready',
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

test.serial('invite planner', async t => {
  const {
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver: wfd,
  } = t.context;

  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);

  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new', overwrite: true },
  });

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

test.serial('invite evm handler; test open portfolio', async t => {
  const {
    agoricNamesRemotes,
    refreshAgoricNamesRemotes,
    walletFactoryDriver: wfd,
  } = t.context;

  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);

  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new', overwrite: true },
  });

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

  const userPrivateKey = generatePrivateKey();
  const userAccount = privateKeyToAccount(userPrivateKey);
  const deadline = CURRENT_TIME + 3600n;
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
  const openPortfolioMessage = getPermitWitnessTransferFromData(
    {
      permitted: deposit,
      spender: axelarConfig.Arbitrum.contracts.depositFactory,
      nonce,
      deadline,
    },
    axelarConfig.Arbitrum.contracts.permit2,
    BigInt(axelarConfig.Arbitrum.chainInfo.reference),
    witness,
  );
  const signature = await userAccount.signTypedData(openPortfolioMessage);

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
});

test.serial(
  'CCTP settlement with old invitation doesnt work with new contract instance',
  async t => {
    const { walletFactoryDriver: wfd } = t.context;
    const marshaller = makeClientMarshaller(v => (v as any).getBoardId());
    const wallet = await wfd.provideSmartWallet(beneficiary, marshaller);

    await t.throwsAsync(
      wallet.executeOffer({
        id: Date.now().toString(),
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

test.skip('CCTP settlement works with new invitation after contract remove and start', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
  const marshaller = makeClientMarshaller(v => (v as any).getBoardId());
  const wallet = await wfd.provideSmartWallet(beneficiary, marshaller);
  const controllerWallet = await wfd.provideSmartWallet(controllerAddr);
  const postalService = agoricNamesRemotes.instance.postalService;
  const inviteId = Date.now().toString();

  await controllerWallet.invokeEntry({
    id: Date.now().toString(),
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet-new' },
  });

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
    const portfolioCountBefore = getPortfolioCount(t);

    const zoe = await EV.vat('bootstrap').consumeItem('zoe');
    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    const installation = await EV(agoricNames).lookup('installation', 'ymax0');
    const bundleId = await EV(zoe).getBundleIDFromInstallation(installation);
    t.true(typeof bundleId === 'string' && bundleId.length > 0);

    await controllerWallet.invokeEntry({
      id: `upgrade-${Date.now()}`,
      targetName: 'ymaxControl',
      method: 'upgrade',
      args: [{ bundleId }],
    });

    const portfolioCountAfterUpgrade = getPortfolioCount(t);
    t.is(portfolioCountAfterUpgrade, portfolioCountBefore);

    await wallet.sendOffer({
      id: 'open-after-upgrade-no-access',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal: { give: {} },
      offerArgs: {},
    });
    await eventLoopIteration();

    const portfolioCountAfterOpen = getPortfolioCount(t);
    t.is(portfolioCountAfterOpen, portfolioCountBefore + 1);
  },
);
