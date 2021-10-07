/* global process setTimeout clearTimeout */
/* eslint-disable no-await-in-loop */
import path from 'path';
import fs from 'fs';
import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify.js';
import {
  importMailbox,
  exportMailbox,
} from '@agoric/swingset-vat/src/devices/mailbox.js';

import anylogger from 'anylogger';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { assert, details as X } from '@agoric/assert';
import { makeWithQueue } from '@agoric/vats/src/queue.js';
import { makeBatchedDeliver } from '@agoric/vats/src/batched-deliver.js';
import { launch } from './launch-chain.js';
import makeBlockManager from './block-manager.js';
import { getMeterProvider } from './kernel-stats.js';

const console = anylogger('fake-chain');

// This is how many computrons we allow before starting a new block.
// Some analysis (#3459) suggests this leads to about 2/3rds utilization,
// based on 5 sec voting time and up to 10 sec of computation.
const MAX_COMPUTRONS_PER_BLOCK = 8_000_000n;
// observed: 0.385 sec
const ESTIMATED_COMPUTRONS_PER_VAT_CREATION = 300_000n;

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

  const vatconfig = new URL(
    await importMetaResolve(
      '@agoric/vats/decentral-config.json',
      import.meta.url,
    ),
  ).pathname;
  const argv = {
    ROLE: 'sim-chain',
    giveMeAllTheAgoricPowers: true,
    hardcodedClientAddresses: [bootAddress],
    noFakeCurrencies: !process.env.FAKE_CURRENCIES,
    bootMsg: {
      supplyCoins: [
        { denom: 'ubld', amount: `${50_000n * 10n ** 6n}` },
        { denom: 'urun', amount: `${1_000_000n * 10n ** 6n}` },
      ],
    },
  };
  const stateDBdir = path.join(basedir, `fake-chain-${GCI}-state`);
  function flushChainSends(replay) {
    assert(!replay, X`Replay not implemented`);
  }

  const meterProvider = getMeterProvider(console, process.env);
  const s = await launch(
    stateDBdir,
    mailboxStorage,
    undefined,
    undefined,
    vatconfig,
    argv,
    GCI, // debugName
    meterProvider,
  );

  const { savedHeight, savedActions, savedChainSends } = s;
  const blockManager = makeBlockManager({ ...s, flushChainSends });

  let blockHeight = savedHeight;
  let blockTime =
    savedActions.length > 0
      ? savedActions[0].blockTime
      : scaleBlockTime(Date.now());
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

      const params = {
        max_computrons_per_block: `${MAX_COMPUTRONS_PER_BLOCK}`,
        estimated_computrons_per_vat_creation: `${ESTIMATED_COMPUTRONS_PER_VAT_CREATION}`,
      };
      await blockManager(
        { type: 'BEGIN_BLOCK', blockHeight, blockTime, params },
        savedChainSends,
      );
      for (let i = 0; i < thisBlock.length; i += 1) {
        const [newMessages, acknum] = thisBlock[i];
        await blockManager(
          {
            type: 'DELIVER_INBOUND',
            peer: bootAddress,
            messages: newMessages,
            ack: acknum,
            blockHeight,
            blockTime,
            params,
          },
          savedChainSends,
        );
      }
      await blockManager(
        { type: 'END_BLOCK', blockHeight, blockTime, params },
        savedChainSends,
      );

      // Done processing, "commit the block".
      await blockManager(
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
    await blockManager({ type: 'BOOTSTRAP_BLOCK', blockTime }, savedChainSends);
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
