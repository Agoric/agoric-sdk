import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';

import {
  encodeAddressHook,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import type { CoreEvalSDKType } from '@agoric/cosmic-proto/agoric/swingset/swingset.js';
import { BridgeId } from '@agoric/internal';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { SnapStoreDebug } from '@agoric/swing-store';
import { makeArchiveSnapshot } from '@agoric/swing-store';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import type { BridgeHandler, IBCChannelID } from '@agoric/vats';
import { makePromiseKit } from '@endo/promise-kit';
import { keyEQ } from '@endo/patterns';
import { readFile, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import tmp from 'tmp';
import { AckBehavior, makeSwingsetHarness } from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const nodeRequire = createRequire(import.meta.url);

// Define types for Elys contract
interface ElysContractRecord {
  settlementAccount: string;
  poolAccount: string;
  // Add other Elys-specific fields
}

interface ElysPoolMetrics {
  shareWorth: {
    numerator: { value: bigint };
  };
  encumberedBalance: { value: bigint };
  // Add other Elys-specific metrics
}

interface ElysStakeInfo {
  amount: bigint;
  validator: string;
  delegator: string;
  status: string;
}

interface ElysTransactionInfo {
  txHash: string;
  status: string;
  amount: bigint;
  sender: string;
  recipient: string;
}

const test: TestFn<
  WalletFactoryTestContext & {
    harness: ReturnType<typeof makeSwingsetHarness>;
    validators: ElysValidator[];
    toElys: MockChannel;
    fromElys: IBCChannelID;
    observations: Array<{ id: unknown } & Record<string, unknown>>;
    writeStats?: (txt: string) => Promise<void>;
    doCoreEval: (specifier: string) => Promise<void>;
  }
> = anyTest;

type SmartWallet = Awaited<
  ReturnType<
    WalletFactoryTestContext['walletFactoryDriver']['provideSmartWallet']
  >
>;

const config = '@agoric/vm-config/decentral-itest-elys-config.json';
const elysAgoricChannelId = 'channel-42';

const range = (n: Number) => Array.from(Array(n).keys());
const prefixedRange = (n: Number, pfx: string) =>
  range(n).map(ix => `${pfx}${ix}`);

test.before(async t => {
  const { env } = globalThis.process;
  const fsPowers = { fs, path, tmp };
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'xs-worker', // or 'local',
    STATS_FILE,
    SNAPSHOT_DIR: snapshotDir,
  } = env;
  const harness = makeSwingsetHarness();
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
    harness,
    configOverrides: {
      defaultReapInterval: 'never',
      defaultReapGCKrefs: 'never',
      snapshotInterval: 100000,
    },
    ...(snapshotDir
      ? { archiveSnapshot: makeArchiveSnapshot(snapshotDir, fsPowers) }
      : {}),
  });
  
  // Create validators for Elys staking
  const validators = range(5).map(ix => 
    makeElysValidator(ctx, `validator-${ix}`, encodeBech32('elys', [100, ix]))
  );

  const writeStats = STATS_FILE
    ? (txt: string) => writeFile(STATS_FILE, txt)
    : undefined;
  const toElys = makeIBCChannel(ctx.bridgeUtils, 'channel-43');
  const fromElys = 'channel-42';

  const { log } = console;
  const doCoreEval = async (specifier: string) => {
    const { EV } = ctx.runUtils;
    const script = await readFile(nodeRequire.resolve(specifier), 'utf-8');
    const eval0: CoreEvalSDKType = { js_code: script, json_permits: 'true' };
    log('executing proposal');
    const bridgeMessage = { type: 'CORE_EVAL', evals: [eval0] };
    const coreEvalBridgeHandler: BridgeHandler = await EV.vat(
      'bootstrap',
    ).consumeItem('coreEvalBridgeHandler');
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
    log(`proposal executed`);
  };

  t.context = {
    ...ctx,
    harness,
    validators,
    observations: [],
    writeStats,
    fromElys,
    toElys,
    doCoreEval,
  };
});
test.after.always(t => t.context.shutdown?.());

const makeElysValidator = (
  ctx: WalletFactoryTestContext,
  name: string,
  addr: string,
) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const walletSync = makePromiseKit<SmartWallet>();

  return harden({
    async provision() {
      walletSync.resolve(wfd.provideSmartWallet(addr));
      return walletSync.promise;
    },
    async claim() {
      const wallet = await walletSync.promise;
      await wallet.sendOffer({
        id: 'claim-validator-invitation',
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.elys,
          description: 'validator operator invitation',
        },
        proposal: {},
      });
    },
    async updateStatus(status: string, nonce: Number) {
      const wallet = await walletSync.promise;
      const it: OfferSpec = {
        id: `update-status-${nonce}`,
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-validator-invitation',
          invitationMakerName: 'UpdateStatus',
          invitationArgs: [status],
        },
        proposal: {},
      };
      await wallet.sendOffer(it);
      return it;
    },
  });
};
type ElysValidator = ReturnType<typeof makeElysValidator>;

const makeElysQuery = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;
  return harden({
    metrics: () => {
      const metrics: ElysPoolMetrics = defaultMarshaller.fromCapData(
        JSON.parse(storage.getValues('published.elys.poolMetrics').at(-1)!),
      );
      return metrics;
    },
    contractRecord: () => {
      const { storage } = ctx;
      const values = storage.getValues('published.elys');
      const it: ElysContractRecord = JSON.parse(values.at(-1)!);
      return it;
    },
    stakeStatus: (txHash: string) =>
      storage
        .getValues(`published.elys.stakes.${txHash}`)
        .map(txt => defaultMarshaller.fromCapData(JSON.parse(txt))),
  });
};

const makeStaker = (ctx: WalletFactoryTestContext, addr: string) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const stakerP = wfd.provideSmartWallet(addr);

  const pollOffer = async (staker: SmartWallet, id: string) => {
    for (;;) {
      const info = staker.getLatestUpdateRecord();
      if (info.updated !== 'offerStatus') continue;
      if (info.status.id !== id) continue;
      if (info.status.error) throw Error(info.status.error);
      if (info.status.payouts) return info.status;
      await eventLoopIteration();
    }
  };

  return harden({
    async stake(value: bigint, validator: string, nonce: number) {
      const offerId = `staker-stake-${nonce}`;
      const offerSpec = {
        id: offerId,
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.elys,
          description: 'stake tokens',
        },
        proposal: {
          give: { Tokens: { value } },
          want: { Receipt: { validator } },
        },
      };
      const staker = await stakerP;
      await staker.sendOffer(offerSpec);
      await pollOffer(staker, offerId);
      return offerSpec;
    },
    async unstake(value: bigint, validator: string, nonce: number) {
      const offerId = `staker-unstake-${nonce}`;
      const offerSpec = {
        id: offerId,
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.elys,
          description: 'unstake tokens',
        },
        proposal: {
          give: { Receipt: { validator, value } },
          want: { Tokens: { value } },
        },
      };
      const staker = await stakerP;
      await staker.sendOffer(offerSpec);
      await pollOffer(staker, offerId);
      return offerSpec;
    },
  });
};

const makeElysIBC = (
  ctx: WalletFactoryTestContext,
  forwardingChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { runInbound } = ctx.bridgeUtils;

  return harden({
    async transferTokens(
      amount: bigint,
      sender: string,
      target: string,
      receiver: string,
    ) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sequence: '1', // arbitrary; not used
          amount,
          denom: 'uelys',
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

const makeUser = (
  address: string,
  settlementAccount: string,
  elysAgoricChannelId: IBCChannelID,
  elysQ: ReturnType<typeof makeElysQuery>,
  elysIBC: ReturnType<typeof makeElysIBC>,
  validators: ElysValidator[],
) => {
  return harden({
    async stakeTokens(
      t: ExecutionContext,
      amount: bigint,
      validatorIndex: number,
      nonce: number,
    ) {
      const validator = validators[validatorIndex % validators.length];
      const recipientAddress = encodeAddressHook(settlementAccount, { validator: validator.name });
      
      // Simulate IBC transfer of tokens to be staked
      await elysIBC.transferTokens(
        amount,
        address,
        settlementAccount,
        recipientAddress,
      );
      
      // Check stake status
      const txHash = `tx-${nonce}-${address}`;
      t.like(elysQ.stakeStatus(txHash), [
        { status: 'PENDING' },
        { status: 'STAKED' },
      ]);

      return { recipientAddress, txHash };
    },
  });
};

const makeIBCChannel = (
  bridgeUtils: WalletFactoryTestContext['bridgeUtils'],
  sourceChannel: IBCChannelID,
) => {
  const { runInbound } = bridgeUtils;
  let sequence = 0;
  return harden({
    async ack(sender: string) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          target: sender,
          sourceChannel,
          sequence: `${(sequence += 1)}`,
        }),
      );
    },
  });
};
type MockChannel = ReturnType<typeof makeIBCChannel>;

const makeSimulation = async (
  ctx: WalletFactoryTestContext,
  toElys: MockChannel,
  validators: ElysValidator[],
) => {
  const elysIBC = makeElysIBC(ctx, elysAgoricChannelId, 'channel-43');

  const elysQ = makeElysQuery(ctx);
  const stakers = range(5).map(ix =>
    makeStaker(ctx, encodeBech32('agoric', [100, ix])),
  );
  const { settlementAccount, poolAccount } = elysQ.contractRecord();
  const users = prefixedRange(10, `user-`).map(addr =>
    makeUser(
      addr,
      settlementAccount,
      elysAgoricChannelId,
      elysQ,
      elysIBC,
      validators,
    ),
  );

  return harden({
    validators,
    stakers,
    users,
    async iteration(t: ExecutionContext, iter: number) {
      // Stake tokens
      const stakerIx = iter % stakers.length;
      const staker = stakers[stakerIx];
      const validatorIx = iter % validators.length;
      const validator = validators[validatorIx];
      
      // Stake amount increases with each iteration to simulate growing network
      const stakeAmount = BigInt((stakerIx + 1) * 1000) * 1_000_000n * BigInt(iter + 1);
      await staker.stake(stakeAmount, validator.name, iter);

      // Update validator status periodically
      if (iter % 3 === 0) {
        await validator.updateStatus('active', iter);
      }

      // Simulate user interactions
      const {
        shareWorth: { numerator: poolBeforeStake },
      } = await elysQ.metrics();
      const part = Number(poolBeforeStake.value) / users.length;

      const who = iter % users.length;
      const user = users[who];
      const amount = BigInt(Math.round(part * (1 - who * 0.05)));

      // User stakes tokens
      const { txHash } = await user.stakeTokens(
        t, 
        amount, 
        validatorIx,
        iter * users.length + who
      );

      await toElys.ack(poolAccount);
      await eventLoopIteration();

      // Periodically unstake tokens to test that flow
      if (iter > 5 && iter % 4 === 0) {
        const unstakeAmount = BigInt(Math.round(Number(stakeAmount) * 0.3));
        await staker.unstake(unstakeAmount, validator.name, iter);
      }

      await eventLoopIteration();

      // Verify no encumbered balance remains
      const afterOperations = await elysQ.metrics();
      if (afterOperations.encumberedBalance.value > 0n) {
        throw t.fail(`still encumbered: ${afterOperations.encumberedBalance}`);
      }
    },
  });
};

const getResourceUsageStats = (
  controller: SwingsetController,
  data: Map<string, string>,
) => {
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;

  const { size: vstorageEntries } = data;
  const { length: vstorageTotalSize } = JSON.stringify([...data.entries()]);
  const { length: vstorageElysSize } = JSON.stringify(
    [...data.entries()].filter(e => e[0].startsWith('published.elys')),
  );
  const { length: vstorageWalletSize } = JSON.stringify(
    [...data.entries()].filter(e => e[0].startsWith('published.wallet')),
  );

  return harden({
    promiseQueuesLength,
    kernelPromises,
    kernelObjects,
    clistEntries,
    vstorageEntries,
    vstorageTotalSize,
    vstorageElysSize,
    vstorageWalletSize,
  });
};

test.serial('access relevant kernel stats after bootstrap', async t => {
  const { controller, observations, storage } = t.context;
  const relevant = getResourceUsageStats(controller, storage.data);
  t.log('relevant kernel stats', relevant);
  t.truthy(relevant);
  observations.push({ id: 'post-boot', ...relevant });
});

test.serial('validators provision before contract deployment', async t => {
  const { validators } = t.context;
  const [validator0] = await Promise.all(validators.map(v => v.provision()));
  t.truthy(validator0);

  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'post-validator-provision',
    ...getResourceUsageStats(controller, storage.data),
  });
});

test.serial('start-elys', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  bridgeUtils.setBech32Prefix('elys');

  const materials = buildProposal(
    '@agoric/orchestration/scripts/elys/start-elys.build.js',
    ['--net', 'MAINNET'],
  );
  await evalProposal(materials);
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.elys);

  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'post-start-elys',
    ...getResourceUsageStats(controller, storage.data),
  });
});

test.serial('validators accept invitations', async t => {
  const { validators } = t.context;
  await t.notThrowsAsync(Promise.all(validators.map(v => v.claim())));

  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'post-validators-claim-invitations',
    ...getResourceUsageStats(controller, storage.data),
  });
});

test.serial('iterate simulation several times', async t => {
  const { controller, observations, validators, storage, toElys } = t.context;
  const { doCoreEval, harness, swingStore, slogSender } = t.context;
  const { updateNewCellBlockHeight } = storage;
  const sim = await makeSimulation(t.context, toElys, validators);

  await writeFile('kernel-0.json', JSON.stringify(controller.dump(), null, 2));

  harness.useRunPolicy(true); // start tracking computrons
  harness.resetRunPolicy(); // never mind computrons from bootstrap
  const snapStore = swingStore.internal.snapStore as unknown as SnapStoreDebug;

  /** @type {Record<string, number>} */
  let previousReapPos = harden({});

  async function doCleanupAndSnapshot(id) {
    slogSender?.({ type: 'cleanup-begin', id });
    await doCoreEval('@agoric/orchestration/scripts/elys/delete-completed-stakes.js');
    while (true) {
      const beforeReapPos = previousReapPos;
      previousReapPos = controller.reapAllVats(beforeReapPos);
      await controller.run(); // clear any reactions
      if (keyEQ(beforeReapPos, previousReapPos)) {
        break;
      }
    }
    const snapshotted = new Set(await controller.snapshotAllVats());
    await controller.run(); // clear any reactions
    const { kernelTable } = controller.dump();
    const snapshots = [...snapStore.listAllSnapshots()].filter(
      s => s.inUse && snapshotted.has(s.vatID),
    );

    const observation = {
      id: `post-prune-${id}`,
      time: Date.now(),
      kernelTable,
      snapshots,
      ...getResourceUsageStats(controller, storage.data),
    };
    observations.push(observation);
    slogSender?.({ type: 'cleanup-finish', id, observation });
    await slogSender?.forceFlush?.();
  }

  for (const ix of range(50)) {
    // force GC and prune vstorage at regular intervals
    if (ix % 4 === 0) {
      await doCleanupAndSnapshot(ix);
    }

    slogSender?.({ type: 'iteration-begin', ix });

    updateNewCellBlockHeight(); // look at only the latest value written
    await sim.iteration(t, ix);

    const computrons = harness.totalComputronCount();
    const observation = {
      id: `iter-${ix}`,
      time: Date.now(),
      computrons,
      ...getResourceUsageStats(controller, storage.data),
    };
    observations.push(observation);
    slogSender?.({ type: 'iteration-finish', ix, observation });

    harness.resetRunPolicy(); // stay under block budget
  }

  await doCleanupAndSnapshot('final');

  await writeFile('kernel-1.json', JSON.stringify(controller.dump(), null, 2));
});

const stringifyBigint = (_p, v) => (typeof v === 'bigint' ? `${v}` : v);

test.serial('analyze observations', async t => {
  const { observations, writeStats } = t.context;
  if (writeStats) {
    const lines = observations.map(
      (o, ix) => JSON.stringify({ ix, ...o }, stringifyBigint) + '\n',
    );
    await writeStats(lines.join(''));
  }
  t.pass();
});
