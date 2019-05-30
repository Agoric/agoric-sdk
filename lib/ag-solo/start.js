import fs from 'fs';
import path from 'path';
import process from 'process';
//import { createHash } from 'crypto';

//import connect from 'lotion-connect';
import harden from '@agoric/harden';
//import djson from 'deterministic-json';

import { loadBasedir, buildVatController,
         buildMailboxStateMap, buildMailbox,
         getVatTPSourcePath } from '@agoric/swingset-vat';

import { deliver, addDeliveryTarget } from './outbound';
import { makeHTTPListener, makeHTTPDeliverator } from './web';

//import { makeChainFollower } from './follower';
//import { makeDeliverator } from './deliver-with-ag-cosmos-helper';

function loadState(stateFile) {
  return JSON.parse(fs.readFileSync(stateFile));
}

function saveState(stateFile, controller, mbs) {
  const s = {
      mailbox: mbs.exportToData(),
      kernel: controller.getState(),
  };
  fs.writeFileSync(stateFile, JSON.stringify(s));
}

async function buildSwingset(stateFile, withSES, vatsDir) {
  let state = loadState(stateFile);
  const config = await loadBasedir(vatsDir);
  const mbs = buildMailboxStateMap();
  console.log(`initial state is`, state);
  if (state.kernel) {
    config.state = state.kernel;
    mbs.populateFromData(state.mailbox);
  }
  const mb = buildMailbox(mbs);
  config.devices = [['mailbox', mb.srcPath, mb.endowments]];
  config.vatSources.set('vattp', getVatTPSourcePath());

  const controller = await buildVatController(config, withSES);

  async function processKernel() {
    await controller.run();
    saveState(stateFile, controller, mbs);
    deliver(mbs);
  }
  async function deliverInbound(sender, messages, ack) {
    if (!messages instanceof Array) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    console.log(`deliverInbound`, messages, ack);
    if (mb.deliverInbound(sender, messages, ack)) {
      await processKernel();
    }
  }

  // now let the bootstrap functions run
  await processKernel();
  
  return deliverInbound;
}

export default async function start(basedir, withSES) {
  
  const stateFile = path.resolve(basedir, 'swingstate.json');
  const connections = JSON.parse(fs.readFileSync(path.join(basedir, 'connections.json')));
  let deliverInbound;

  function inbound(sender, messages, ack) {
    deliverInbound(sender, messages, ack);
  }

  connections.forEach(async c => {
    if (c.type === 'chain-cosmos-sdk') {
      return;
      console.log(`adding follower/sender for GCI ${c.GCI}`);
      // c.rpcAddresses are strings of host:port for the RPC port
      const connection = await connect(GCI, { nodes: [`ws://localhost:${rpcPort}`]});
      const deliverator = makeDeliverator('chain', MYNAME);
      makeChainFollower(connection, MYNAME, 'chain', inbound);
      addDeliveryTarget(GCI, deliverator);
    } else if (c.type === 'http') {
      console.log(`adding HTTP/WS listener on port ${c.port}`);
      makeHTTPListener(basedir, c.port, inbound);
      addDeliveryTarget('http', makeHTTPDeliverator());
    } else {
      throw new Error(`unknown connection type in ${c}`);
    }
  });

  const vatsDir = path.join(basedir, 'vats');
  deliverInbound = await buildSwingset(stateFile, withSES, vatsDir);
  console.log(`swingset running`);
}
