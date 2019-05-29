import fs from 'fs';
import path from 'path';
import process from 'process';
import { createHash } from 'crypto';

import connect from 'lotion-connect';
import harden from '@agoric/harden';
import djson from 'deterministic-json';

import { loadBasedir, buildVatController,
         buildMailboxStateMap, buildMailbox,
         getVatTPSourcePath } from '@agoric/swingset-vat';

import { deliver, addDeliveryTarget } from './outbound';

import { makeChainFollower } from './follower';
import { makeDeliverator } from './deliver-with-sscli';

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

async function buildSwingset(stateFile, withSES, basedir) {
  let state = loadState(stateFile);
  const config = await loadBasedir(basedir);
  const mbs = buildMailboxStateMap();
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
  async function inbound(sender, messages, ack) {
    if (!messages instanceof Array) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    if (mb.deliverInbound(sender, messages, ack)) {
      await processKernel();
    }
  }

  // now let the bootstrap functions run
  await processKernel();
  
  return { controller, inbound, mbs };
}

export default async function start(basedir, withSES) {
  
  const stateFile = path.resolve(basedir, 'swingstate.json');
  const connections = JSON.parse(fs.readFileSync(path.join(basedir, 'connections.json')));

  connections.forEach(async c => {
    if (c.type === 'chain-cosmos-sdk') {
      console.log(`adding follower/sender for GCI ${c.GCI}`);
      // c.rpcAddresses are strings of host:port for the RPC port
      const connection = await connect(GCI, { nodes: [`ws://localhost:${rpcPort}`]});
      const deliverator = makeDeliverator('chain', MYNAME);
      makeChainFollower(connection, MYNAME, 'chain', inbound);
      addDeliveryTarget(GCI, deliverator);
    } else if (c.type === 'http') {
      console.log(`adding HTTP/WS listener on port ${c.port}`);
      const deliverator = makeHTTPDeliverator();
      addDeliveryTarget('http', deliverator);
    }
  });

  const { controller, inbound, mbs } = await buildSwingset(stateFile, withSES, basedir);
  console.log(`running`);

}
