/* global process setTimeout clearTimeout */
/* eslint-disable no-await-in-loop */
import path from 'path';
import fs from 'fs';
import {
  importMailbox,
  exportMailbox,
} from '@agoric/swingset-vat/src/devices/mailbox/mailbox.js';

import anylogger from 'anylogger';

import { makeSlogSenderFromModule } from '@agoric/telemetry';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { assert, details as X } from '@agoric/assert';
import { makeWithQueue } from '@agoric/vats/src/queue.js';
import { makeBatchedDeliver } from '@agoric/vats/src/batched-deliver.js';
import stringify from './json-stable-stringify.js';
import { launch } from './launch-chain.js';
import makeBlockManager from './block-manager.js';
import { getTelemetryProviders } from './kernel-stats.js';
import { DEFAULT_SIM_SWINGSET_PARAMS } from './sim-params.js';

const console = anylogger('fake-chain');

const TELEMETRY_SERVICE_NAME = 'sim-cosmos';

const PRETEND_BLOCK_DELAY = 5;
const scaleBlockTime = ms => Math.floor(ms / 1000);

async function makeMapStorage(file) {
  let content;
  const map = new Map();
  map.commit = async () => {
    const obj = {};
    [...map.entries()].forEach(([k, v]) => (obj[k] = exportMailbox(v)));
    const json = stringify(obj);
    await fs.promises.writeFile(file, json);
  };

  let obj = {};
  try {
    content = await fs.promises.readFile(file);
    obj = JSON.parse(content);
  } catch (e) {
    return map;
  }
  Object.entries(obj).forEach(([k, v]) => map.set(k, importMailbox(v)));

  return map;
}

export async function connectToFakeChain(basedir, GCI, delay, inbound) {
  const initialHeight = 0;
  const mailboxFile = path.join(basedir, `fake-chain-${GCI}-mailbox.json`);
  const bootAddress = `${GCI}-client`;

  const mailboxStorage = await makeMapStorage(mailboxFile);

  const argv = {
    ROLE: 'sim-chain',
    giveMeAllTheAgoricPowers: true,
    hardcodedClientAddresses: [bootAddress],
    bootMsg: {
      supplyCoins: [
        { denom: 'ubld', amount: `${50_000n * 10n ** 6n}` },
        { denom: 'uist', amount: `${1_000_000n * 10n ** 6n}` },
      ],
      params: DEFAULT_SIM_SWINGSET_PARAMS,
    },
  };

  const vatconfig = new URL(
    await importMetaResolve(
      process.env.CHAIN_BOOTSTRAP_VAT_CONFIG ||
        argv.bootMsg.params.bootstrap_vat_config,
      import.meta.url,
    ),
  ).pathname;
  const stateDBdir = path.join(basedir, `fake-chain-${GCI}-state`);
  function flushChainSends(replay) {
    assert(!replay, X`Replay not implemented`);
  }

  const env = process.env;
  const { metricsProvider } = getTelemetryProviders({
    console,
    env,
    serviceName: TELEMETRY_SERVICE_NAME,
  });

  const { SLOGFILE, SLOGSENDER, LMDB_MAP_SIZE } = process.env;
  const mapSize = (LMDB_MAP_SIZE && parseInt(LMDB_MAP_SIZE, 10)) || undefined;
  const slogSender = await makeSlogSenderFromModule(SLOGSENDER, {
    stateDir: stateDBdir,
    serviceName: TELEMETRY_SERVICE_NAME,
    env,
  });

  let aqContents = [];
  const actionQueue = {
    /** @returns {Iterable<unknown>} */
    consumeAll: () => {
      const iterable = aqContents;
      aqContents = [];
      return iterable;
    },
  };

  const s = await launch({
    actionQueue,
    kernelStateDBDir: stateDBdir,
    mailboxStorage,
    vatconfig,
    argv,
    debugName: GCI,
    metricsProvider,
    slogFile: SLOGFILE,
    slogSender,
    mapSize,
  });

  const { savedHeight, savedBlockTime, savedChainSends } = s;
  const blockingSend = makeBlockManager({ ...s, flushChainSends });

  let blockHeight = savedHeight;
  let blockTime = savedBlockTime || scaleBlockTime(Date.now());
  let intoChain = [];
  let thisBlock = [];
  let nextBlockTimeout = 0;

  const maximumDelay = (delay || PRETEND_BLOCK_DELAY) * 1000;

  const withBlockQueue = makeWithQueue();
  const unhandledSimulateBlock = withBlockQueue(
    async function unqueuedSimulateBlock() {
      // Gather up the new messages into the latest block.
      thisBlock.push(...intoChain);
      intoChain = [];

      blockTime = scaleBlockTime(Date.now());
      blockHeight += 1;

      const params = DEFAULT_SIM_SWINGSET_PARAMS;
      const beginAction = {
        type: 'BEGIN_BLOCK',
        blockHeight,
        blockTime,
        params,
      };
      await blockingSend(beginAction, savedChainSends);
      for (let i = 0; i < thisBlock.length; i += 1) {
        const [newMessages, acknum] = thisBlock[i];
        aqContents.push({
          type: 'DELIVER_INBOUND',
          peer: bootAddress,
          messages: newMessages,
          ack: acknum,
          blockHeight,
          blockTime,
        });
      }
      const endAction = { type: 'END_BLOCK', blockHeight, blockTime };
      await blockingSend(endAction, savedChainSends);

      // Done processing, "commit the block".
      await blockingSend(
        { type: 'COMMIT_BLOCK', blockHeight, blockTime },
        savedChainSends,
      );

      // We now advance to the next block.
      thisBlock = [];

      clearTimeout(nextBlockTimeout);
      // eslint-disable-next-line no-use-before-define
      nextBlockTimeout = setTimeout(simulateBlock, maximumDelay);

      // TODO: maybe add latency to the inbound messages.
      const mailbox = mailboxStorage.get(`${bootAddress}`);
      const { outbox = [], ack = 0 } = mailbox ? exportMailbox(mailbox) : {};
      inbound(GCI, outbox, ack);
    },
  );

  const simulateBlock = () =>
    unhandledSimulateBlock().catch(e => {
      console.error(e);
      process.exit(1);
    });

  let totalDeliveries = 0;
  async function deliver(newMessages, acknum) {
    totalDeliveries += 1;
    console.log(`delivering to ${GCI} (trips=${totalDeliveries})`);

    intoChain.push([newMessages, acknum]);
    // Only actually simulate a block if we're not in bootstrap.
    if (blockHeight && !delay) {
      clearTimeout(nextBlockTimeout);
      await simulateBlock();
    }
  }

  const bootSimChain = async () => {
    if (blockHeight) {
      return;
    }
    // The before-first-block is special... do it now.
    // This emulates what x/swingset does to run a BOOTSTRAP_BLOCK
    // before continuing with the real initialHeight.
    await blockingSend({ type: 'BOOTSTRAP_BLOCK', blockTime }, savedChainSends);
    blockHeight = initialHeight;
  };

  const enableDeliveries = () => {
    // Start the first pretend block.
    nextBlockTimeout = setTimeout(simulateBlock, maximumDelay);
  };

  bootSimChain().then(enableDeliveries, e => {
    console.error(`Cannot boot sim chain:`, e);
    process.exit(1);
  });

  const batchDelayMs = delay ? delay * 1000 : undefined;
  return makeBatchedDeliver(deliver, batchDelayMs);
}
