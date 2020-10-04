import path from 'path';
import anylogger from 'anylogger';

import {
  buildMailbox,
  buildMailboxStateMap,
  buildTimer,
  buildBridge,
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
  loadBasedir,
  loadSwingsetConfigFile,
} from '@agoric/swingset-vat';
import { getBestSwingStore } from './check-lmdb';

const log = anylogger('launch-chain');

const SWING_STORE_META_KEY = 'cosmos/meta';

async function buildSwingset(
  mailboxStorage,
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
  const mbs = buildMailboxStateMap(mailboxStorage);
  const timer = buildTimer();
  const mb = buildMailbox(mbs);
  const bd = buildBridge(bridgeOutbound);
  config.devices = {
    bridge: {
      sourceSpec: bd.srcPath,
    },
    mailbox: {
      sourceSpec: mb.srcPath,
    },
    timer: {
      sourceSpec: timer.srcPath,
    },
  };
  const deviceEndowments = {
    bridge: { ...bd.endowments },
    mailbox: { ...mb.endowments },
    timer: { ...timer.endowments },
  };

  if (!swingsetIsInitialized(storage)) {
    await initializeSwingset(config, argv, storage, { debugPrefix });
  }
  const controller = await makeSwingsetController(storage, deviceEndowments);
  await controller.run();

  const bridgeInbound = bd.deliverInbound;
  return { controller, mb, bridgeInbound, timer };
}

export async function launch(
  kernelStateDBDir,
  mailboxStorage,
  doOutboundBridge,
  vatsDir,
  argv,
  debugName = undefined,
) {
  log.info('Launching SwingSet kernel');

  const tempdir = path.resolve(kernelStateDBDir, 'check-lmdb-tempdir');
  const { openSwingStore } = getBestSwingStore(tempdir);
  const { storage, commit } = openSwingStore(kernelStateDBDir);

  function bridgeOutbound(dstID, obj) {
    // console.error('would outbound bridge', dstID, obj);
    return doOutboundBridge(dstID, obj);
  }
  log.debug(`buildSwingset`);
  const { controller, mb, bridgeInbound, timer } = await buildSwingset(
    mailboxStorage,
    bridgeOutbound,
    storage,
    vatsDir,
    argv,
    debugName,
  );

  async function saveChainState() {
    // Save the mailbox state.
    await mailboxStorage.commit();
  }

  async function saveOutsideState(savedHeight, savedActions, savedChainSends) {
    storage.set(
      SWING_STORE_META_KEY,
      JSON.stringify([savedHeight, savedActions, savedChainSends]),
    );
    await commit();
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

  const [savedHeight, savedActions, savedChainSends] = JSON.parse(
    storage.get(SWING_STORE_META_KEY) || '[0, [], []]',
  );
  return {
    deliverInbound,
    doBridgeInbound,
    // bridgeOutbound,
    beginBlock,
    saveChainState,
    saveOutsideState,
    savedHeight,
    savedActions,
    savedChainSends,
  };
}
