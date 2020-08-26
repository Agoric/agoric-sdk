import path from 'path';
import anylogger from 'anylogger';

import djson from 'deterministic-json';
import {
  buildMailbox,
  buildMailboxStateMap,
  buildTimer,
  buildBridge,
  buildVatController,
  loadBasedir,
  loadSwingsetConfigFile,
} from '@agoric/swingset-vat';
import { getBestSwingStore } from './check-lmdb';

const log = anylogger('launch-chain');

const SWING_STORE_META_KEY = 'cosmos/meta';

async function buildSwingset(
  mailboxState,
  bridgeOutbound,
  storage,
  vatsDir,
  argv,
  debugName = undefined,
) {
  const debugPrefix = debugName === undefined ? '' : `${debugName}:`;
  let config = loadSwingsetConfigFile(`${vatsDir}/chain-config.json`);
  if (config === null) {
    config = loadBasedir(vatsDir);
  }
  const mbs = buildMailboxStateMap();
  mbs.populateFromData(mailboxState);
  const timer = buildTimer();
  const mb = buildMailbox(mbs);
  const bd = buildBridge(bridgeOutbound);
  config.devices = [
    ['bridge', bd.srcPath, bd.endowments],
    ['mailbox', mb.srcPath, mb.endowments],
    ['timer', timer.srcPath, timer.endowments],
  ];

  const controller = await buildVatController(config, argv, {
    hostStorage: storage,
    debugPrefix,
  });
  await controller.run();

  const bridgeInbound = bd.deliverInbound;
  return { controller, mb, mbs, bridgeInbound, timer };
}

export async function launch(
  kernelStateDBDir,
  mailboxStorage,
  doOutboundBridge,
  flushChainSends,
  vatsDir,
  argv,
  debugName = undefined,
) {
  log.info('Launching SwingSet kernel');

  log(`checking for saved mailbox state`, mailboxStorage.has('mailbox'));
  const mailboxState = mailboxStorage.has('mailbox')
    ? JSON.parse(mailboxStorage.get('mailbox'))
    : {};

  const tempdir = path.resolve(kernelStateDBDir, 'check-lmdb-tempdir');
  const { openSwingStore } = getBestSwingStore(tempdir);
  const { storage, commit } = openSwingStore(kernelStateDBDir);

  function bridgeOutbound(dstID, obj) {
    // console.error('would outbound bridge', dstID, obj);
    return doOutboundBridge(dstID, obj);
  }
  log.debug(`buildSwingset`);
  const { controller, mb, mbs, bridgeInbound, timer } = await buildSwingset(
    mailboxState,
    bridgeOutbound,
    storage,
    vatsDir,
    argv,
    debugName,
  );

  function saveChainState() {
    // now check mbs
    const newState = mbs.exportToData();
    const newData = djson.stringify(newState);

    // Save the mailbox state.
    for (const peer of Object.getOwnPropertyNames(newState)) {
      const data = {
        outbox: newState[peer].outbox,
        ack: newState[peer].inboundAck,
      };
      mailboxStorage.set(`mailbox.${peer}`, djson.stringify(data));
    }
    mailboxStorage.set('mailbox', newData);
    return { mailboxSize: newData.length };
  }

  function saveOutsideState(savedHeight, savedActions) {
    storage.set(
      SWING_STORE_META_KEY,
      JSON.stringify([savedHeight, savedActions]),
    );
    commit();
  }

  async function deliverInbound(sender, messages, ack) {
    if (!Array.isArray(messages)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    if (!mb.deliverInbound(sender, messages, ack)) {
      return;
    }
    log.debug(`mboxDeliver:   ADDED messages`);
    await controller.run();
  }

  async function doBridgeInbound(source, body) {
    // console.log(`doBridgeInbound`);
    // the inbound bridge will push messages onto the kernel run-queue for
    // delivery+dispatch to some handler vat
    bridgeInbound(source, body);
    await controller.run();
  }

  async function beginBlock(blockHeight, blockTime) {
    const addedToQueue = timer.poll(blockTime);
    log.debug(
      `polled; blockTime:${blockTime}, h:${blockHeight}; ADDED =`,
      addedToQueue,
    );
    if (!addedToQueue) {
      return;
    }
    await controller.run();
  }

  const [savedHeight, savedActions] = JSON.parse(
    storage.get(SWING_STORE_META_KEY) || '[0, []]',
  );
  return {
    deliverInbound,
    doBridgeInbound,
    // bridgeOutbound,
    flushChainSends,
    beginBlock,
    saveChainState,
    saveOutsideState,
    savedHeight,
    savedActions,
  };
}
