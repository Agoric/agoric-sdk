import fs from 'fs';

import djson from 'deterministic-json';
import readlines from 'n-readlines';
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

  console.log(
    `launch: checking for saved mailbox state`,
    mailboxStorage.has('mailbox'),
  );
  const mailboxState = mailboxStorage.has('mailbox')
    ? JSON.parse(mailboxStorage.get('mailbox'))
    : {};

  const { storage, commit } = openSwingStore(kernelStateDBDir);

  console.log(`buildSwingset`);
  const { controller, mb, mbs, timer } = await buildSwingset(
    withSES,
    mailboxState,
    storage,
    vatsDir,
    argv,
  );

  let mailboxLastData = djson.stringify(mbs.exportToData());
  // save the initial state immediately
  commit();

  // then arrange for inbound messages to be processed, after which we save
  async function turnCrank() {
    let start = Date.now();
    await controller.run();
    const runTime = Date.now() - start;
    // now check mbs
    start = Date.now();
    const newState = mbs.exportToData();
    const newData = djson.stringify(newState);
    if (newData !== mailboxLastData) {
      console.log(`outbox changed`);
      for (const peer of Object.getOwnPropertyNames(newState)) {
        const data = {
          outbox: newState[peer].outbox,
          ack: newState[peer].inboundAck,
        };
        mailboxStorage.set(`mailbox.${peer}`, djson.stringify(data));
      }
      mailboxStorage.set(`mailbox`, newData);
      mailboxLastData = newData;
    }
    const mbTime = Date.now() - start;
    start = Date.now();
    const mailboxSize = mailboxLastData.length;
    const saveTime = Date.now() - start;
    console.log(
      `wrote SwingSet checkpoint (mailbox=${mailboxSize}), [run=${runTime}ms, mb=${mbTime}ms, save=${saveTime}ms]`,
    );
  }

  async function deliverInbound(sender, messages, ack) {
    if (!(messages instanceof Array)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    if (mb.deliverInbound(sender, messages, ack)) {
      console.log(`mboxDeliver:   ADDED messages`);
      await turnCrank();
    }
  }

  async function deliverStartBlock(blockHeight, blockTime) {
    const addedToQueue = timer.poll(blockTime);
    console.log(
      `polled; blockTime:${blockTime}, h:${blockHeight} ADDED: ${addedToQueue}`,
    );
    if (addedToQueue) {
      await turnCrank();
    }
  }

  return { deliverInbound, deliverStartBlock };
}
