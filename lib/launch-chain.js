const djson = require('deterministic-json');
const { loadBasedir, buildVatController,
        buildMailboxStateMap, buildMailbox,
        getVatTPSourcePath } = require('@agoric/swingset-vat');

async function buildSwingset(withSES) {
  const config = {};
  const mbs = buildMailboxStateMap();
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
  const { controller, inbound, mb, mbs } = await buildSwingset(withSES);
  let set;

  async function deliverInbound(sender, messages, ack) {
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
          const r = set(`mailbox.${peer}`, JSON.stringify(data));
          console.log(`set ${peer} said`, r);
        }
      }
    }
  }

  async function handler(action) {
    console.log(`handler got`, action);
    try {
      if (action.type === 'DELIVER_INBOUND') {
        await deliverInbound(action.peer, action.messages, action.ack);
      }
    } catch (e) {
      console.log(`error in handler:`, e);
      throw e;
    }
    return JSON.stringify({type: "ERROR", value: `Unknown action.type ${action.type}`});
  }

  function setSet(s) {
    set = s;
  }

  return { handler, setSet };
}
