/* eslint-disable no-await-in-loop */
import path from 'path';
import fs from 'fs';
import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify';
import { launch } from '../launch-chain';

const PRETEND_BLOCK_DELAY = 5;

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

export async function connectToFakeChain(basedir, GCI, role, delay, inbound) {
  const stateFile = path.join(basedir, `fake-chain-${GCI}-state.json`);
  const mailboxFile = path.join(basedir, `fake-chain-${GCI}-mailbox.json`);
  const bootAddress = `${GCI}-client`;

  const mailboxStorage = await readMap(mailboxFile);

  const vatsdir = path.join(basedir, 'vats');
  const argv = [`--role=${role}`, bootAddress];
  const s = await launch(mailboxStorage, stateFile, vatsdir, argv);
  const { deliverInbound, deliverStartBlock } = s;

  let pretendLast = Date.now();
  let blockHeight = 0;
  let intoChain = [];
  let thisBlock = [];
  async function simulateBlock() {
    const actualStart = Date.now();
    // Gather up the new messages into the latest block.
    thisBlock.push(...intoChain);
    intoChain = [];

    try {
      const commitStamp = pretendLast + PRETEND_BLOCK_DELAY * 1000;
      const blockTime = Math.floor(commitStamp / 1000);
      await deliverStartBlock(blockHeight, blockTime);
      for (let i = 0; i < thisBlock.length; i += 1) {
        const [newMessages, acknum] = thisBlock[i];
        await deliverInbound(
          bootAddress,
          newMessages,
          acknum,
          blockHeight,
          blockTime,
        );
      }

      // Done processing, "commit the block".
      await writeMap(mailboxFile, mailboxStorage);
      thisBlock = [];
      pretendLast = commitStamp + Date.now() - actualStart;
      blockHeight += 1;
    } catch (e) {
      console.log(`error fake processing`, e);
    }

    if (delay) {
      setTimeout(simulateBlock, delay * 1000);
    }

    // TODO: maybe add latency to the inbound messages.
    const mailbox = JSON.parse(mailboxStorage.get(`mailbox.${bootAddress}`));
    const { outbox, ack } = mailbox || {
      outbox: [],
      ack: 0,
    };
    inbound(GCI, outbox, ack);
  }

  async function deliver(newMessages, acknum) {
    intoChain.push([newMessages, acknum]);
    if (!delay) {
      await simulateBlock();
    }
  }
  if (delay) {
    setTimeout(simulateBlock, delay * 1000);
  }
  return deliver;
}
