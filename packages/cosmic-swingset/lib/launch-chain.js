import fs from 'fs';
import anylogger from 'anylogger';

import djson from 'deterministic-json';
import {
  buildMailbox,
  buildMailboxStateMap,
  buildTimer,
  buildVatController,
  getCommsSourcePath,
  getTimerWrapperSourcePath,
  getVatTPSourcePath,
} from '@agoric/swingset-vat';
import { openSwingStore } from '@agoric/swing-store-simple';

const log = anylogger('launch-chain');

const SWING_STORE_META_KEY = 'cosmos/meta';

async function buildSwingset(withSES, mailboxState, storage, vatsDir, argv) {
  const config = {};
  const mbs = buildMailboxStateMap();
  mbs.populateFromData(mailboxState);
  const timer = buildTimer();
  const mb = buildMailbox(mbs);
  config.devices = [
    ['mailbox', mb.srcPath, mb.endowments],
    ['timer', timer.srcPath, timer.endowments],
  ];
  config.vats = new Map();
  for (const fname of fs.readdirSync(vatsDir)) {
    const match = fname.match(/^vat-(.*)\.js$/);
    if (match) {
      config.vats.set(match[1], {
        sourcepath: require.resolve(`${vatsDir}/${fname}`),
      });
    }
  }
  config.vats.set('vattp', { sourcepath: getVatTPSourcePath() });
  config.vats.set('comms', {
    sourcepath: getCommsSourcePath(),
    options: { enablePipelining: true },
  });
  config.vats.set('timer', { sourcepath: getTimerWrapperSourcePath() });
  config.bootstrapIndexJS = require.resolve(`${vatsDir}/bootstrap.js`);
  config.hostStorage = storage;

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();

  return { controller, mb, mbs, timer };
}

export async function launch(kernelStateDBDir, mailboxStorage, vatsDir, argv) {
  const withSES = true;

  log(`checking for saved mailbox state`, mailboxStorage.has('mailbox'));
  const mailboxState = mailboxStorage.has('mailbox')
    ? JSON.parse(mailboxStorage.get('mailbox'))
    : {};

  const { storage, commit } = openSwingStore(kernelStateDBDir);

  log.debug(`buildSwingset`);
  const { controller, mb, mbs, timer } = await buildSwingset(
    withSES,
    mailboxState,
    storage,
    vatsDir,
    argv,
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
    if (!(messages instanceof Array)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    if (!mb.deliverInbound(sender, messages, ack)) {
      return;
    }
    log(`mboxDeliver:   ADDED messages`);
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
    beginBlock,
    saveChainState,
    saveOutsideState,
    savedHeight,
    savedActions,
  };
}
