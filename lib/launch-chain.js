const djson = require('deterministic-json');
const { loadBasedir, buildVatController,
        buildMailboxStateMap, buildMailbox,
        getVatTPSourcePath } = require('@agoric/swingset-vat');

async function buildSwingset(withSES, oldState) {
  const config = {};
  const mbs = buildMailboxStateMap();
  if (oldState) {
    config.state = oldState.kernel;
    mbs.populateFromData(oldState.mailbox);
  }
  const mb = buildMailbox(mbs);
  config.devices = [['mailbox', mb.srcPath, mb.endowments]];
  config.vatSources = new Map();
  config.vatSources.set('mint', require.resolve('../demo1/vat-mint.js'));
  config.vatSources.set('comms', require.resolve('../demo1/vat-comms.js'));
  config.vatSources.set('vattp', getVatTPSourcePath());
  config.bootstrapIndexJS = require.resolve('../demo1/bootstrap.js');

  const controller = await buildVatController(config, withSES);
  await controller.run();

  async function inbound(sender, messages, ack) {
    /*
    console.log(`about to c.run()`);
    while (controller.dump().runQueue.length) {
      console.log(`-- step`);
      console.log(controller.dump().runQueue);
      await controller.step();
    }*/
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
      oldState = {
        kernel: JSON.parse(storage.get('kernel')),
        mailbox: JSON.parse(storage.get('mailbox')),
      };
    }

    console.log(`buildSwingset`);
    const { controller, inbound, mb, mbs } = await buildSwingset(withSES, oldState);

    deliverInbound = async function(sender, messages, ack) {
      if (!messages instanceof Array) {
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
            const data = { outbox: newState[peer].outbox,
                           ack: newState[peer].inboundAck };
            const r = storage.set(`mailbox.${peer}`, djson.stringify(data));
            console.log(`set ${peer} said`, r);
          }
        }
        // checkpoint kernel and whole-mailbox state
        const kernelState = controller.getState();
        storage.set(`kernel`, djson.stringify(kernelState));
        storage.set(`mailbox`, djson.stringify(newData));
      }
    };
  }

  async function handler(action) {
    console.log(`handler got`, action);
    try {
      if (action.type === 'SDK_READY') {
        await sdkReady(action);
      }
      if (action.type === 'DELIVER_INBOUND') {
        await deliverInbound(action.peer, action.messages, action.ack);
      }
    } catch (e) {
      console.log(`error in handler:`, e);
      throw e;
    }
    return JSON.stringify({type: "ERROR", value: `Unknown action.type ${action.type}`});
  }

  function setStorage(s) {
    storage = s;
  }

  return { handler, setStorage };
}
