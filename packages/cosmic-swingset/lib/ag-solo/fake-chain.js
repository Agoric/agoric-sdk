/* global process setTimeout clearTimeout */
/* eslint-disable no-await-in-loop */
import path from 'path';
import fs from 'fs';
import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify';
import {
  importMailbox,
  exportMailbox,
} from '@agoric/swingset-vat/src/devices/mailbox';

import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';
import { launch } from '../launch-chain';
import makeBlockManager from '../block-manager';
import { makeWithQueue } from './vats/queue';
import { makeBatchedDeliver } from './batched-deliver';
import { getMeterProvider } from '../kernel-stats';

const console = anylogger('fake-chain');

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
  const mailboxFile = path.join(basedir, `fake-chain-${GCI}-mailbox.json`);
  const bootAddress = `${GCI}-client`;

  const mailboxStorage = await makeMapStorage(mailboxFile);

  const vatsdir = path.join(basedir, 'vats');
  const argv = {
    ROLE: 'sim-chain',
    giveMeAllTheAgoricPowers: true,
    hardcodedClientAddresses: [bootAddress],
    noFakeCurrencies: process.env.NO_FAKE_CURRENCIES,
  };
  const stateDBdir = path.join(basedir, `fake-chain-${GCI}-state`);
  function doOutboundBridge(dstID, _obj) {
    // console.error('received', dstID, obj);
    return `Bridge device (${dstID}) not implemented for fake-chain`;
  }
  function flushChainSends(replay) {
    assert(!replay, X`Replay not implemented`);
  }

  const meterProvider = getMeterProvider(console, process.env);
  const s = await launch(
    stateDBdir,
    mailboxStorage,
    doOutboundBridge,
    vatsdir,
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
      const actualStart = Date.now();
      // Gather up the new messages into the latest block.
      thisBlock.push(...intoChain);
      intoChain = [];

      blockTime += PRETEND_BLOCK_DELAY;
      blockHeight += 1;

      await blockManager(
        { type: 'BEGIN_BLOCK', blockHeight, blockTime },
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
          },
          savedChainSends,
        );
      }
      await blockManager(
        { type: 'END_BLOCK', blockHeight, blockTime },
        savedChainSends,
      );

      // Done processing, "commit the block".
      await blockManager(
        { type: 'COMMIT_BLOCK', blockHeight, blockTime },
        savedChainSends,
      );
      thisBlock = [];
      blockTime += scaleBlockTime(Date.now() - actualStart);

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
    if (!delay) {
      clearTimeout(nextBlockTimeout);
      await simulateBlock();
    }
  }

  // Start the first pretend block.
  nextBlockTimeout = setTimeout(simulateBlock, maximumDelay);

  // Only use 100ms batches for no specified inter-block delay.
  // This makes for more deliveries but less overall waiting time.
  const batchDelayMs = delay ? delay * 1000 : 100;
  return makeBatchedDeliver(deliver, batchDelayMs);
}
