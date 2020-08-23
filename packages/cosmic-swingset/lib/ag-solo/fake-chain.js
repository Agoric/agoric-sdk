/* eslint-disable no-await-in-loop */
import path from 'path';
import fs from 'fs';
import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify';
import anylogger from 'anylogger';

import { launch } from '../launch-chain';
import makeBlockManager from '../block-manager';
import { makeWithQueue } from './vats/queue';

const log = anylogger('fake-chain');

const PRETEND_BLOCK_DELAY = 5;
const scaleBlockTime = ms => Math.floor(ms / 1000);

async function readMap(file) {
  let content;
  const map = new Map();
  try {
    content = await fs.promises.readFile(file);
  } catch (e) {
    return map;
  }
  const obj = JSON.parse(content);
  Object.entries(obj).forEach(([k, v]) => map.set(k, v));
  return map;
}

async function writeMap(file, map) {
  const obj = {};
  [...map.entries()].forEach(([k, v]) => (obj[k] = v));
  const json = stringify(obj);
  await fs.promises.writeFile(file, json);
}

export async function connectToFakeChain(basedir, GCI, delay, inbound) {
  const mailboxFile = path.join(basedir, `fake-chain-${GCI}-mailbox.json`);
  const bootAddress = `${GCI}-client`;

  const mailboxStorage = await readMap(mailboxFile);

  const vatsdir = path.join(basedir, 'vats');
  const argv = [
    `--role=sim-chain`,
    `--give-me-all-the-agoric-powers`,
    bootAddress,
  ];
  const stateDBdir = path.join(basedir, `fake-chain-${GCI}-state`);
  function doOutboundBridge(dstID, _obj) {
    // console.error('received', dstID, obj);
    return `Bridge device (${dstID}) not implemented for fake-chain`;
  }
  function flushChainSends(replay) {
    if (replay) {
      throw Error(`Replay not implemented`);
    }
  }
  const s = await launch(
    stateDBdir,
    mailboxStorage,
    doOutboundBridge,
    flushChainSends,
    vatsdir,
    argv,
    GCI, // debugName
  );

  const blockManager = makeBlockManager(s);
  const { savedHeight, savedActions } = s;

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
  const simulateBlock = withBlockQueue(async function unqueuedSimulateBlock() {
    const actualStart = Date.now();
    // Gather up the new messages into the latest block.
    thisBlock.push(...intoChain);
    intoChain = [];

    try {
      blockTime += PRETEND_BLOCK_DELAY;
      blockHeight += 1;

      await blockManager({ type: 'BEGIN_BLOCK', blockHeight, blockTime });
      for (let i = 0; i < thisBlock.length; i += 1) {
        const [newMessages, acknum] = thisBlock[i];
        await blockManager({
          type: 'DELIVER_INBOUND',
          peer: bootAddress,
          messages: newMessages,
          ack: acknum,
          blockHeight,
          blockTime,
        });
      }
      await blockManager({ type: 'END_BLOCK', blockHeight, blockTime });

      // Done processing, "commit the block".
      await blockManager({ type: 'COMMIT_BLOCK', blockHeight, blockTime });
      await writeMap(mailboxFile, mailboxStorage);
      thisBlock = [];
      blockTime += scaleBlockTime(Date.now() - actualStart);
    } catch (e) {
      log.error(`error fake processing`, e);
    }

    nextBlockTimeout = setTimeout(simulateBlock, maximumDelay);

    // TODO: maybe add latency to the inbound messages.
    const mailboxJSON = mailboxStorage.get(`mailbox.${bootAddress}`);
    const mailbox = mailboxJSON && JSON.parse(mailboxJSON);
    const { outbox = [], ack = 0 } = mailbox || {};
    inbound(GCI, outbox, ack);
  });

  async function deliver(newMessages, acknum) {
    intoChain.push([newMessages, acknum]);
    if (!delay) {
      clearTimeout(nextBlockTimeout);
      await simulateBlock();
    }
  }

  // Start the first pretend block.
  nextBlockTimeout = setTimeout(simulateBlock, maximumDelay);
  return deliver;
}
