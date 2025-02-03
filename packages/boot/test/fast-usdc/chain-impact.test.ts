import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';

import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type {
  CctpTxEvidence,
  ContractRecord,
  EvmAddress,
  NobleAddress,
  PoolMetrics,
} from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import { BridgeId } from '@agoric/internal';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { SnapStoreDebug } from '@agoric/swing-store';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import type { IBCChannelID } from '@agoric/vats';
import { makePromiseKit } from '@endo/promise-kit';
import { writeFile } from 'fs/promises';
import { AckBehavior } from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const test: TestFn<
  WalletFactoryTestContext & {
    oracles: TxOracle[];
    observations: Array<{ id: unknown } & Record<string, unknown>>;
    writeStats?: (txt: string) => Promise<void>;
  }
> = anyTest;

type SmartWallet = Awaited<
  ReturnType<
    WalletFactoryTestContext['walletFactoryDriver']['provideSmartWallet']
  >
>;

const config = '@agoric/vm-config/decentral-itest-fast-usdc-config.json';
const nobleAgoricChannelId = 'channel-21';

const range = (n: Number) => Array.from(Array(n).keys());
const prefixedRange = (n: Number, pfx: string) =>
  range(n).map(ix => `${pfx}${ix}`);

const makeTxOracle = (
  ctx: WalletFactoryTestContext,
  name: string,
  addr: string,
) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const walletSync = makePromiseKit<SmartWallet>();

  let nonce = 0;

  return harden({
    async provision() {
      walletSync.resolve(wfd.provideSmartWallet(addr));
      return walletSync.promise;
    },
    async claim() {
      const wallet = await walletSync.promise;
      await wallet.sendOffer({
        id: 'claim-oracle-invitation',
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.fastUsdc,
          description: 'oracle operator invitation',
        },
        proposal: {},
      });
    },
    async submit(evidence: CctpTxEvidence) {
      const wallet = await walletSync.promise;
      const it: OfferSpec = {
        id: `submit-evidence-${(nonce += 1)}`,
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-oracle-invitation',
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence],
        },
        proposal: {},
      };
      await wallet.sendOffer(it);
      return it;
    },
  });
};
type TxOracle = ReturnType<typeof makeTxOracle>;

const makeFastUsdcQuery = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;
  return harden({
    metrics: () => {
      const metrics: PoolMetrics = defaultMarshaller.fromCapData(
        JSON.parse(storage.getValues('published.fastUsdc.poolMetrics').at(-1)!),
      );
      return metrics;
    },
    contractRecord: () => {
      const { storage } = ctx;
      const values = storage.getValues('published.fastUsdc');
      const it: ContractRecord = JSON.parse(values.at(-1)!);
      return it;
    },
    txStatus: (txHash: string) =>
      storage
        .getValues(`published.fastUsdc.txns.${txHash}`)
        .map(txt => defaultMarshaller.fromCapData(JSON.parse(txt))),
  });
};

const makeLP = (ctx: WalletFactoryTestContext, addr: string) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const lpP = wfd.provideSmartWallet(addr);

  let nonce = 0;

  const pollOffer = async (lp: SmartWallet, id: string) => {
    for (;;) {
      const info = lp.getLatestUpdateRecord();
      if (info.updated !== 'offerStatus') continue;
      if (info.status.id !== id) continue;
      if (info.status.error) throw Error(info.status.error);
      if (info.status.payouts) return info.status.payouts;
      await eventLoopIteration();
    }
  };

  return harden({
    async deposit(value: bigint) {
      const offerId = `lp-deposit-${(nonce += 1)}`;
      const offerSpec = Offers.fastUsdc.Deposit(agoricNamesRemotes, {
        offerId,
        fastLPAmount: BigInt(Math.round(Number(value) * 0.6)), // XXX use poolMetrics?,
        usdcAmount: value,
      });
      const lp = await lpP;
      await lp.sendOffer(offerSpec);
      await pollOffer(lp, offerId);
      return offerSpec;
    },
    async withdraw(value: bigint) {
      const offerId = `lp-withdraw-${(nonce += 1)}`;
      const offerSpec = Offers.fastUsdc.Withdraw(agoricNamesRemotes, {
        offerId,
        fastLPAmount: value,
        usdcAmount: BigInt(Math.round(Number(value) * 0.9)), // XXX use poolMetrics?
      });
      const lp = await lpP;
      await lp.sendOffer(offerSpec);
      await pollOffer(lp, offerId);
      return offerSpec;
    },
  });
};

const makeCctp = (
  ctx: WalletFactoryTestContext,
  forwardingChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { runInbound } = ctx.bridgeUtils;
  let nonce = 0;

  return harden({
    depositForBurn(
      amount: bigint,
      sender: EvmAddress,
      forwardingAddress: NobleAddress,
    ) {
      nonce += 1;
      const hex1 = (nonce * 51).toString(16);
      const hex2 = (nonce * 73).toString(16);
      const txInfo: Omit<CctpTxEvidence, 'aux'> = harden({
        blockHash: `0x${hex2.repeat(64 / hex2.length)}`,
        blockNumber: 21037663n + BigInt(nonce),
        txHash: `0x${hex1.repeat(64 / hex1.length)}`,
        tx: { amount, forwardingAddress, sender },
        chainId: 42161,
      });
      return txInfo;
    },
    async mint(
      amount: bigint,
      sender: string,
      target: string,
      receiver: string,
    ) {
      // in due course, minted USDC arrives
      await runInbound(
        BridgeId.VTRANSFER,

        buildVTransferEvent({
          sequence: '1', // arbitrary; not used
          amount,
          denom: 'uusdc',
          sender,
          target,
          receiver,
          sourceChannel: forwardingChannel,
          destinationChannel,
        }),
      );
    },
  });
};

/**
 * https://github.com/noble-assets/forwarding/blob/main/types/account.go#L19
 *
 * @param channel
 * @param recipient
 * @param fallback
 */
const deriveNobleForwardingAddress = (
  channel: IBCChannelID,
  recipient: string,
  fallback: string,
) => {
  if (fallback) throw Error('not supported');
  const out: NobleAddress = `noble1${channel}${recipient.slice(-30)}`;
  return out;
};

const makeUA = (
  address: EvmAddress,
  settlementAccount: string,
  nobleAgoricChannelId: IBCChannelID,
  fastQ: ReturnType<typeof makeFastUsdcQuery>,
  cctp: ReturnType<typeof makeCctp>,
  oracles: TxOracle[],
) => {
  return harden({
    async advance(t: ExecutionContext, amount: bigint, EUD: string) {
      const recipientAddress = encodeAddressHook(settlementAccount, { EUD });
      const forwardingAddress = deriveNobleForwardingAddress(
        nobleAgoricChannelId,
        recipientAddress,
        '',
      );
      const txInfo = cctp.depositForBurn(amount, address, forwardingAddress);
      const evidence: CctpTxEvidence = {
        ...txInfo,
        aux: { forwardingChannel: nobleAgoricChannelId, recipientAddress },
      };

      // TODO: connect this to the CCTP contract?
      await Promise.all(oracles.map(o => o.submit(evidence)));

      t.like(fastQ.txStatus(evidence.txHash), [
        { status: 'OBSERVED' },
        { status: 'ADVANCING' },
      ]);

      return { recipientAddress, forwardingAddress, evidence };
    },
  });
};

const makeDestAcct = (
  ctx: WalletFactoryTestContext,
  address: string,
  sourceChannel: IBCChannelID,
) => {
  const { runInbound } = ctx.bridgeUtils;
  let sequence = 0;
  return harden({
    address,
    async ack(sender: string) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          target: sender,
          sourceChannel,
          sequence: `1`, // XXX `${(sequence += 1)}`,
        }),
      );
    },
  });
};

const makeSimulation = async (
  ctx: WalletFactoryTestContext,
  oracles: TxOracle[],
) => {
  const cctp = makeCctp(ctx, nobleAgoricChannelId, 'channel-62');

  const fastQ = makeFastUsdcQuery(ctx);
  const lps = prefixedRange(3, 'agoric1lp').map(a => makeLP(ctx, a));
  const { settlementAccount, poolAccount } = fastQ.contractRecord();
  const users = prefixedRange(5, `0xFEED`).map(addr =>
    makeUA(
      addr as EvmAddress,
      settlementAccount,
      nobleAgoricChannelId,
      fastQ,
      cctp,
      oracles,
    ),
  );

  return harden({
    oracles,
    lps,
    users,
    async iteration(t: ExecutionContext, iter: number) {
      await Promise.all(
        lps.map(async (lp, ix) => {
          await lp.deposit(BigInt((ix + 1) * 2000) * 1_000_000n);
        }),
      );
      const {
        shareWorth: { numerator: poolBeforeAdvance },
      } = await fastQ.metrics();
      const part = Number(poolBeforeAdvance.value) / users.length;

      await Promise.all(
        users.map(async (webUI, who) => {
          const dest = makeDestAcct(
            ctx,
            `dydx1anything${who}${iter}`,
            'channel-62',
          );
          const amount = BigInt(Math.round(part * (1 - who * 0.1)));

          const { recipientAddress, forwardingAddress, evidence } =
            await webUI.advance(t, amount, dest.address);

          await dest.ack(poolAccount);
          await eventLoopIteration();

          // in due course, minted USDC arrives
          await cctp.mint(
            amount,
            forwardingAddress,
            settlementAccount,
            recipientAddress,
          );
          await eventLoopIteration();
          t.like(fastQ.txStatus(evidence.txHash), [
            { status: 'OBSERVED' },
            { status: 'ADVANCING' },
            { status: 'ADVANCED' },
            { status: 'DISBURSED' },
          ]);
        }),
      );
      await eventLoopIteration();

      const {
        shareWorth: { numerator: poolBeforeWithdraw },
      } = await fastQ.metrics();
      const partWd = Number(poolBeforeWithdraw.value) / lps.length;
      await Promise.all(
        lps.map(async (lp, ix) => {
          const amount = BigInt(Math.round(partWd * (1 - ix * 0.1)));
          // XXX simulate failed withrawals?
          await lp.withdraw(amount);
        }),
      );
    },
  });
};

test.before(async t => {
  const { env } = globalThis.process;
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'local', // or 'xs-worker',
    STATS_FILE,
  } = env;
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
  });
  const oracles = Object.entries(configurations.MAINNET.oracles).map(
    ([name, addr]) => makeTxOracle(ctx, name, addr),
  );

  const writeStats = STATS_FILE
    ? (txt: string) => writeFile(STATS_FILE, txt)
    : undefined;
  t.context = { ...ctx, oracles, observations: [], writeStats };
});
test.after.always(t => t.context.shutdown?.());

const getResourceUsageStats = (
  controller: SwingsetController,
  data?: Map<unknown, unknown>,
) => {
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;
  const exportedObjects = { clistEntries, kernelObjects };
  const pendingWork = { promiseQueuesLength, kernelPromises };

  data ||= new Map();
  const { size: vstorageEntries } = data;
  const { length: vstorageTotalSize } = JSON.stringify([...data.entries()]);

  return harden({
    promiseQueuesLength,
    kernelPromises,
    kernelObjects,
    clistEntries,
    vstorageEntries,
    vstorageTotalSize,
  });
};

test.serial('access relevant kernel stats after bootstrap', async t => {
  const { controller, observations } = t.context;
  const relevant = getResourceUsageStats(controller);
  t.log('relevant kernel stats', relevant);
  t.truthy(relevant);
  observations.push({ id: 'post-boot', ...relevant });
});

test.serial(
  'access uncompressedSize of heap snapshots of vats (WIP)',
  async t => {
    const { controller, swingStore } = t.context;

    const snapStore = swingStore.internal
      .snapStore as unknown as SnapStoreDebug;

    await controller.reapAllVats(); // force GC
    await controller.run(); // clear any reactions
    const active: string[] = [];
    for (const snapshot of snapStore.listAllSnapshots()) {
      const { vatID, uncompressedSize } = snapshot;
      t.log({ vatID, uncompressedSize });
      t.log('TODO: filter by active', snapshot);
      active.push(vatID);
    }
    t.log('active vats', active);
    t.pass();
  },
);

test.serial('oracles provision before contract deployment', async t => {
  const { oracles } = t.context;
  const [watcher0] = await Promise.all(oracles.map(o => o.provision()));
  t.truthy(watcher0);

  const { controller, observations } = t.context;
  observations.push({
    id: 'post-ocw-provision',
    ...getResourceUsageStats(controller),
  });
});

test.serial('start-fast-usdc', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  // needed since the Fusdc StartFn relies on an ICA being created
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  bridgeUtils.setBech32Prefix('noble');

  const materials = buildProposal(
    '@agoric/builders/scripts/fast-usdc/start-fast-usdc.build.js',
    ['--net', 'MAINNET'],
  );
  await evalProposal(materials);
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.fastUsdc);

  const { controller, observations } = t.context;
  observations.push({
    id: 'post-start-fast-usdc',
    ...getResourceUsageStats(controller),
  });
});

test.serial('oracles accept invitations', async t => {
  const { oracles } = t.context;
  await t.notThrowsAsync(Promise.all(oracles.map(o => o.claim())));

  const { controller, observations } = t.context;
  observations.push({
    id: 'post-ocws-claim-invitations',
    ...getResourceUsageStats(controller),
  });
});

test.skip('LP deposits', async t => {
  const fastQ = makeFastUsdcQuery(t.context);
  const lp = makeLP(t.context, 'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8');
  const { proposal, id } = await lp.deposit(150_000_000n);

  const {
    shareWorth: { numerator: poolBalance },
  } = fastQ.metrics();
  t.true(poolBalance.value >= proposal.give.USDC.value);

  const { controller, observations } = t.context;
  observations.push({ id, kernel: getResourceUsageStats(controller) });
});

test.skip('makes usdc advance, mint', async t => {
  const nobleAgoricChannelId = 'channel-21';
  const { oracles } = t.context;
  const fastQ = makeFastUsdcQuery(t.context);
  const cctp = makeCctp(t.context, nobleAgoricChannelId, 'channel-62');

  const { settlementAccount, poolAccount } = fastQ.contractRecord();
  const webUI = makeUA(
    '0xDEADBEEF' as EvmAddress,
    settlementAccount,
    nobleAgoricChannelId,
    fastQ,
    cctp,
    oracles,
  );

  const dest = makeDestAcct(t.context, 'dydx1anything', 'channel-62');
  const { recipientAddress, forwardingAddress, evidence } = await webUI.advance(
    t,
    15_000_000n,
    dest.address,
  );
  const amount = 15_000_000n;

  await dest.ack(poolAccount);
  await eventLoopIteration();

  const { controller, observations } = t.context;
  observations.push({
    id: `post-advance`,
    ...getResourceUsageStats(controller),
  });

  // in due course, minted USDC arrives
  await cctp.mint(
    amount,
    forwardingAddress,
    settlementAccount,
    recipientAddress,
  );
  await eventLoopIteration();
  t.like(fastQ.txStatus(evidence.txHash), [
    { status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { status: 'DISBURSED' },
  ]);
  observations.push({
    id: `post-mint`,
    ...getResourceUsageStats(controller),
  });
});

test.serial('iterate simulation several times', async t => {
  const { controller, observations, oracles, storage } = t.context;
  const sim = await makeSimulation(t.context, oracles);

  for (const ix of range(32)) {
    await sim.iteration(t, ix);
    observations.push({
      id: `iter-${ix}`,
      //   computrons: 'TODO: xs-worker',
      //   heap: 'TODO: xs-worker',
      ...getResourceUsageStats(controller, storage.data),
    });
  }
});

test.serial('analyze observations', async t => {
  const { observations, writeStats } = t.context;
  for (const obs of observations) {
    t.log(obs);
  }
  if (writeStats) {
    const lines = observations.map(
      (o, ix) => JSON.stringify({ ix, ...o }) + '\n',
    );
    await writeStats(lines.join(''));
  }
  t.pass();
});
