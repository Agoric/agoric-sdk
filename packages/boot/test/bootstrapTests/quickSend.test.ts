import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { CCTPTxEvidence } from 'fast-usdc/contract/client-types.js';
import { makePromiseKit } from '@endo/promise-kit';
import type { TestFn } from 'ava';
import type { OfferId } from '@agoric/smart-wallet/src/offers.js';
import {
  AgoricCalc,
  NobleCalc,
} from '@agoric/orchestration/src/utils/address.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { BridgeId } from '@agoric/internal';
import { type WalletFactoryDriver } from '../../tools/drivers.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';
import { makePolicyProvider } from '../../tools/supports.js';

const test: TestFn<
  WalletFactoryTestContext & { perfTool: ReturnType<typeof makePolicyProvider> }
> = anyTest;

test.before('bootstrap', async t => {
  const perfTool = makePolicyProvider();
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'xsnap',
  } = process.env;
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
    { defaultManagerType, perfTool, slogFile }, // for perf testing
  );
  t.context = { ...ctx, perfTool };

  // TODO: handle creating watcher smart wallet _after_ deploying contract
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');
});
test.after.always(t => t.context.shutdown?.());

test.serial('add USDC work-alike', async t => {
  const { EV } = t.context.runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const agoricNamesAdmin =
    await EV.vat('bootstrap').consumeItem('agoricNamesAdmin');
  for (const kind of ['brand', 'issuer']) {
    const it = await EV(agoricNames).lookup(kind, 'IST');
    t.log(kind, it);
    t.truthy(it);
    const admin = await EV(agoricNamesAdmin).lookupAdmin(kind);
    await EV(admin).update('USDC', it);
  }
});

test.serial('deploy contract', async t => {
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');

  const {
    agoricNamesRemotes,
    evalProposal,
    buildProposal,
    refreshAgoricNamesRemotes,
  } = t.context;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/fast-usdc/init-quickSend.js'),
  );
  // update now that quickSend is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.quickSend);
});

type SmartWallet = Awaited<
  ReturnType<WalletFactoryDriver['provideSmartWallet']>
>;

const makeWatcher = (sw: SmartWallet, instance, runInbound) => {
  let seq = 0;
  const accepted: PromiseKit<OfferId> = makePromiseKit();

  return harden({
    accept: async () => {
      const id = `accept-${(seq += 1)}`;
      accepted.resolve(id);
      await sw.executeOffer({
        id,
        invitationSpec: {
          source: 'purse',
          instance,
          description: 'initAccounts',
        },
        proposal: {},
      });
      return sw.getLatestUpdateRecord();
    },

    report: async (evidence: CCTPTxEvidence) => {
      await sw.sendOffer({
        id: `report-${(seq += 1)}`,
        invitationSpec: {
          source: 'continuing',
          invitationMakerName: 'ReportCCTPCall',
          previousOffer: await accepted.promise,
        },
        proposal: {},
        offerArgs: evidence,
      });

      // simulate ibc/MsgTransfer ack from remote chain,
      // enabling `.transfer()` promise to resolve
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sourceChannel: 'channel-1', // agoric->osmosis
          sequence: '1', // NOTE: only works once
        }),
      );

      return sw.getLatestUpdateRecord();
    },
  });
};

test.serial('watcher: accept, report', async t => {
  const { agoricNamesRemotes, perfTool, walletFactoryDriver } = t.context;
  const { runInbound } = t.context.bridgeUtils;
  const mc = qty => Number(qty) / 1_000_000;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1watcher');
  const william = makeWatcher(
    wd,
    agoricNamesRemotes.instance.quickSend,
    runInbound,
  );

  {
    t.log('start metering');
    perfTool.usePolicy(true);
    const update = await william.accept();
    t.log('accept cost (Mc)', mc(perfTool.totalCount()));
    t.like(update, { status: { id: 'accept-1', numWantsSatisfied: 1 } });
  }

  const modern = new Date('2024-10-29T20:00:00');
  {
    perfTool.resetPolicy();
    const settlementBase = 'agoric1fakeLCAAddress'; // TODO: read from vstorage

    const encoding = 'bech32' as const;
    const dest = { chainId: 'osmosis-1', encoding, value: 'osmo1333' };
    const vAddr = AgoricCalc.virtualAddressFor(settlementBase, dest.value);
    const nobleFwd = NobleCalc.fwdAddressFor(vAddr);
    const status = await william.report({
      tx: { amount: 1234n, forwardingAddress: nobleFwd },
      txHash: '0xABCD1234',
      blockHash: '0xDEADBEEF',
      blockNumber: 1234n,
      blockTimestamp: BigInt(modern.getTime() / 1000),
      aux: { forwardingChannel: 'channel-123', recipientAddress: dest.value },
    });
    t.log('advance cost (Mc)', mc(perfTool.totalCount()));

    t.like(status, {
      status: {
        id: 'report-2',
        invitationSpec: { previousOffer: 'accept-1' },
        offerArgs: {
          tx: { amount: 1234n, forwardingAddress: 'noble1301333' },
          aux: { recipientAddress: 'osmo1333' },
        },
        result: 'advance 1104 uusdc sent to osmo1333',
      },
    });
  }
});
