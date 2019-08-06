import { readdirSync } from 'fs';

import djson from 'deterministic-json';
import {
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  getVatTPSourcePath,
} from '@agoric/swingset-vat';
import buildExternalForFile from '@agoric/swingset-vat/src/stateOnDisk';

async function buildSwingset(withSES, mailboxState, externalStorage, vatsDir, argv) {
  const config = {};
  const mbs = buildMailboxStateMap();
  mbs.populateFromData(mailboxState);
  const mb = buildMailbox(mbs);
  config.devices = [['mailbox', mb.srcPath, mb.endowments]];
  config.vatSources = new Map();
  for (const fname of readdirSync(vatsDir)) {
    const match = fname.match(/^vat-(.*)\.js$/);
    if (match) {
      config.vatSources.set(match[1], require.resolve(`${vatsDir}/${fname}`));
    }
  }
  config.vatSources.set('vattp', getVatTPSourcePath());
  config.bootstrapIndexJS = require.resolve(`${vatsDir}/bootstrap.js`);
  config.externalStorage = externalStorage;

  const controller = await buildVatController(config, withSES, argv);
  await controller.run();

  return { controller, mb, mbs };
}

export async function launch(mailboxStorage, stateFile, vatsDir, argv) {
  const withSES = false;
  let deliverInbound;

  console.log(`launch: checking for saved mailbox state`, mailboxStorage.has('mailbox'));
  const mailboxState = mailboxStorage.has('mailbox') ? JSON.parse(mailboxStorage.get('mailbox')) : {};

  const { externalStorage, save } = buildExternalForFile(stateFile);

  console.log(`buildSwingset`);
  const { controller, inbound, mb, mbs } =
        await buildSwingset(withSES, mailboxState,
                            externalStorage, vatsDir, argv);
  function saveState() {
    // save kernel state to the stateFile, and the mailbox state to a cosmos
    // kvstore where it can be queried externally
    save();
    const mailboxStateData = djson.stringify(mbs.exportToData());
    mailboxStorage.set(`mailbox`, mailboxStateData);
    console.log(`checkpointed mailbox state: ${mailboxStateData.length} bytes`);
  }

  // save the initial state immediately
  saveState();

  // then arrange for inbound messages to be processed, after which we save
  // the new state (if anything changed)
  deliverInbound = async function(sender, messages, ack) {
    if (!(messages instanceof Array)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    const oldData = djson.stringify(mbs.exportToData());
    if (mb.deliverInbound(sender, messages, ack)) {
      await controller.run();
      // now check mbs
      const newState = mbs.exportToData();
      const newData = djson.stringify(newState);
      if (newData !== oldData) {
        console.log(`outbox changed`);
        for (const peer of Object.getOwnPropertyNames(newState)) {
          const data = {
            outbox: newState[peer].outbox,
            ack: newState[peer].inboundAck,
          };
          const r = mailboxStorage.set(`mailbox.${peer}`, djson.stringify(data));
          //console.log(`set ${peer} said`, r);
        }
      }
      saveState();
    }
  };

  return { deliverInbound };
}
