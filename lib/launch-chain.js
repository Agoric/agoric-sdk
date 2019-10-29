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
import { buildStorageInMemory } from '@agoric/swingset-vat/src/hostStorage';

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

export async function launch(mailboxStorage, stateFile, vatsDir, argv) {
  const withSES = true;

  console.log(
    `launch: checking for saved mailbox state`,
    mailboxStorage.has('mailbox'),
  );
  const mailboxState = mailboxStorage.has('mailbox')
    ? JSON.parse(mailboxStorage.get('mailbox'))
    : {};

  const storage = buildStorageInMemory();

  let l;
  try {
    // stateFile will be missing the first time we launch
    l = new readlines(stateFile);
  } catch(e) {
    console.log(`initializing empty swingset state`);
  }
  if (l) {
    let line;
    while ((line = l.next())) {
      const [key, value] = JSON.parse(line);
      storage.storage.set(key, value);
    }
  }

  console.log(`buildSwingset`);
  const { controller, mb, mbs, timer } = await buildSwingset(
    withSES,
    mailboxState,
    storage.storage,
    vatsDir,
    argv,
  );

  function saveKernelState() {
    const tmpfn = `${stateFile}.tmp`;
    const fd = fs.openSync(tmpfn, 'w');
    let size = 0;

    for (let [key, value] of storage.map.entries()) {
      const line = JSON.stringify([key, value]);
      fs.writeSync(fd, line);
      fs.writeSync(fd, '\n');
      size += line.length + 1;
    }
    fs.closeSync(fd);
    fs.renameSync(tmpfn, stateFile);
    return size;
  }

  function saveState() {
    // save kernel state to the stateFile, and the mailbox state to a cosmos
    // kvstore where it can be queried externally
    const kernelStateSize = saveKernelState();
    const mailboxStateData = djson.stringify(mbs.exportToData());
    mailboxStorage.set(`mailbox`, mailboxStateData);
    return [kernelStateSize, mailboxStateData.length];
  }

  // save the initial state immediately
  saveState();

  // then arrange for inbound messages to be processed, after which we save
  async function turnCrank() {
    const oldData = djson.stringify(mbs.exportToData());
    let start = Date.now();
    await controller.run();
    const runTime = Date.now() - start;
    // now check mbs
    start = Date.now();
    const newState = mbs.exportToData();
    const newData = djson.stringify(newState);
    if (newData !== oldData) {
      console.log(`outbox changed`);
      for (const peer of Object.getOwnPropertyNames(newState)) {
        const data = {
          outbox: newState[peer].outbox,
          ack: newState[peer].inboundAck,
        };
        mailboxStorage.set(`mailbox.${peer}`, djson.stringify(data));
      }
    }
    const mbTime = Date.now() - start;
    start = Date.now();
    const [kernelSize, mailboxSize] = saveState();
    const saveTime = Date.now() - start;
    console.log(
      `wrote SwingSet checkpoint (kernel=${kernelSize}, mailbox=${mailboxSize}), [run=${runTime}ms, mb=${mbTime}ms, save=${saveTime}ms]`,
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
    await turnCrank();
  }

  return { deliverInbound, deliverStartBlock };
}
