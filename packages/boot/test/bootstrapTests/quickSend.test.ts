import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { CallDetails } from '@agoric/orchestration/src/examples/quickSend.flows.js';
import { makePromiseKit } from '@endo/promise-kit';
import type { TestFn } from 'ava';
import type { OfferId } from '@agoric/smart-wallet/src/offers.js';
import {
  AgoricCalc,
  NobleCalc,
} from '@agoric/orchestration/src/utils/address.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { BridgeId } from '@agoric/internal';
import { computronCounter } from '../../tools/computron-counter.js';
import { type WalletFactoryDriver } from '../../tools/drivers.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';

const makeMeter = () => {
  const beansPer = 100n;
  // see https://cosgov.org/agoric?msgType=parameterChangeProposal&network=main
  const mainParams = {
    blockComputeLimit: 65_000_000n * beansPer,
    vatCreation: 300_000n * beansPer,
    xsnapComputron: beansPer,
  };

  let metering = false;
  let policy;

  const meter = harden({
    provideRunPolicy: () => {
      if (metering && !policy) {
        policy = computronCounter(mainParams);
      }
      return policy;
    },
    setMetering: x => (metering = x),
    getValue: () => (policy?.totalBeans() || 0) / mainParams.xsnapComputron,
    resetPolicy: () => (policy = undefined),
  });
  return meter;
};

const test: TestFn<
  WalletFactoryTestContext & { meter: ReturnType<typeof makeMeter> }
> = anyTest;

test.before('bootstrap', async t => {
  const meter = makeMeter();
  const { SLOGFILE: slogFile } = process.env;
  const ctx = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
    { defaultManagerType: 'xsnap', meter, slogFile }, // for perf testing
    // { defaultManagerType: 'local' }, // 3x faster, node debugger
  );
  t.context = { ...ctx, meter };

  // TODO: handle creating watcher smart wallet _after_ deploying contract
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');
});
test.after.always(t => t.context.shutdown?.());

test.serial('deploy contract', async t => {
  await t.context.walletFactoryDriver.provideSmartWallet('agoric1watcher');

  const {
    agoricNamesRemotes,
    evalProposal,
    buildProposal,
    refreshAgoricNamesRemotes,
  } = t.context;
  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-quickSend.js'),
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

    report: async (callDetails: CallDetails) => {
      await sw.sendOffer({
        id: `report-${(seq += 1)}`,
        invitationSpec: {
          source: 'continuing',
          invitationMakerName: 'ReportCCTPCall',
          previousOffer: await accepted.promise,
        },
        proposal: {},
        offerArgs: callDetails,
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
  const { agoricNamesRemotes, meter, walletFactoryDriver } = t.context;
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
    meter.setMetering(true);
    const update = await william.accept();
    t.log('accept cost (Mc)', mc(meter.getValue()));
    t.like(update, { status: { id: 'accept-1', numWantsSatisfied: 1 } });
  }

  {
    meter.resetPolicy();
    const settlementBase = 'agoric1fakeLCAAddress'; // TODO: read from vstorage

    const encoding = 'bech32' as const;
    const dest = { chainId: 'osmosis-1', encoding, value: 'osmo1333' };
    const vAddr = AgoricCalc.virtualAddressFor(settlementBase, dest.value);
    const nobleFwd = NobleCalc.fwdAddressFor(vAddr);
    const status = await william.report({ amount: 1234n, dest, nobleFwd });
    t.log('advance cost (Mc)', mc(meter.getValue()));

    t.like(status, {
      status: {
        id: 'report-2',
        invitationSpec: { previousOffer: 'accept-1' },
        offerArgs: {
          amount: 1234n,
          dest: { value: 'osmo1333' },
          nobleFwd: 'noble1301333',
        },
        result: 'advance 1104 uusdc sent to osmo1333',
      },
    });
  }
});
