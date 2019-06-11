import { readdirSync } from 'fs';

const djson = require('deterministic-json');
const {
  loadBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  getVatTPSourcePath,
} = require('@agoric/swingset-vat');

const VATS_DIR = './ag-solo/vats';
const CHAIN_VAT_BLACKLIST = ['provisioning', 'http'];

async function buildSwingset(withSES, oldState, vatsDir) {
  const config = {};
  const mbs = buildMailboxStateMap();
  if (oldState) {
    config.state = oldState.kernel;
    mbs.populateFromData(oldState.mailbox);
  }
  const mb = buildMailbox(mbs);
  config.devices = [['mailbox', mb.srcPath, mb.endowments]];
  config.vatSources = new Map();
  for (const fname of readdirSync(vatsDir)) {
    const match = fname.match(/^vat-(.*)\.js$/);
    if (match && !CHAIN_VAT_BLACKLIST.includes(match[1])) {
      config.vatSources.set(match[1], require.resolve(`${vatsDir}/${fname}`));
    }
  }
  config.vatSources.set('vattp', getVatTPSourcePath());
  config.bootstrapIndexJS = require.resolve(`${vatsDir}/bootstrap.js`);

  const controller = await buildVatController(config, withSES);
  await controller.run();

  async function inbound(sender, messages, ack) {
    /*
    console.log(`about to c.run()`);
    while (controller.dump().runQueue.length) {
      console.log(`-- step`);
      console.log(controller.dump().runQueue);
      await controller.step();
    } */
    await controller.run();
  }

  return { controller, mb, mbs };
}

export async function launch() {
  const withSES = false;
  let storage;
  let deliverInbound;

  async function sdkReady(action) {
    let oldState;
    console.log(`sdkReady: checking for saved kernel state`);
    if (storage.has('kernel')) {
      console.log(` loading saved kernel state`);
      const kernelState = storage.get('kernel');
      const mailboxState = storage.get('mailbox');
      console.log(` k: ${kernelState.length}, m: ${mailboxState.length}`);
      oldState = {
        kernel: JSON.parse(kernelState),
        mailbox: JSON.parse(mailboxState),
      };
    }

    console.log(`buildSwingset`);
    const { controller, inbound, mb, mbs } = await buildSwingset(
      withSES,
      oldState,
      VATS_DIR,
    );

    function saveState() {
      // checkpoint kernel and whole-mailbox state
      const kernelStateData = djson.stringify(controller.getState());
      const mailboxStateData = djson.stringify(mbs.exportToData());
      storage.set(`kernel`, kernelStateData);
      storage.set(`mailbox`, mailboxStateData);
      console.log(
        `checkpointed kernel state: k: ${kernelStateData.length}, m: ${mailboxStateData.length}`,
      );
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
          console.log(`new outbound messages!`);
          for (const peer of Object.getOwnPropertyNames(newState)) {
            const data = {
              outbox: newState[peer].outbox,
              ack: newState[peer].inboundAck,
            };
            const r = storage.set(`mailbox.${peer}`, djson.stringify(data));
            console.log(`set ${peer} said`, r);
          }
        }
        saveState();
      }
    };
  }

  async function handler(action) {
    console.log(`handler got`, action);
    try {
      if (action.type === 'SDK_READY') {
        return await sdkReady(action);
      }
      if (action.type === 'DELIVER_INBOUND') {
        return await deliverInbound(action.peer, action.messages, action.ack);
      }
    } catch (e) {
      console.log(`error in handler:`, e);
      throw e;
    }
    return JSON.stringify({
      type: 'ERROR',
      value: `Unknown action.type ${action.type}`,
    });
  }

  function setStorage(s) {
    storage = s;
  }

  return { handler, setStorage };
}
