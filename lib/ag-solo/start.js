import fs from 'fs';
import path from 'path';
import process from 'process';
// import { createHash } from 'crypto';

// import connect from 'lotion-connect';
import harden from '@agoric/harden';
// import djson from 'deterministic-json';

import {
  loadBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  getVatTPSourcePath,
} from '@agoric/swingset-vat';
import { makeStorageInMemory } from '@agoric/swingset-vat/src/stateInMemory';
import buildCommand from '@agoric/swingset-vat/src/devices/command';

import { deliver, addDeliveryTarget } from './outbound';
import { makeHTTPListener } from './web';

import { connectToChain } from './chain-cosmos-sdk';

// import { makeChainFollower } from './follower';
// import { makeDeliverator } from './deliver-with-ag-cosmos-helper';

async function buildSwingset(stateFile, withSES, vatsDir, argv) {
  const state = JSON.parse(fs.readFileSync(stateFile));
  const config = await loadBasedir(vatsDir);
  const mbs = buildMailboxStateMap();
  mbs.populateFromData(state.mailbox);
  const mb = buildMailbox(mbs);
  const cm = buildCommand();
  config.devices = [
    ['mailbox', mb.srcPath, mb.endowments],
    ['command', cm.srcPath, cm.endowments],
  ];
  config.vatSources.set('vattp', getVatTPSourcePath());
  // state.kernel will be modified in-place as the kernel runs
  config.externalStorage = makeStorageInMemory(state.kernel);

  const controller = await buildVatController(config, withSES, argv);

  function saveState() {
    const s = {
      mailbox: mbs.exportToData(),
      kernel: state.kernel,
    };
    fs.writeFileSync(stateFile, JSON.stringify(s));
  }

  async function processKernel() {
    await controller.run();
    saveState();
    deliver(mbs);
  }
  async function deliverInbound(sender, messages, ack) {
    if (!(messages instanceof Array)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    // console.log(`deliverInbound`, messages, ack);
    if (mb.deliverInbound(sender, messages, ack)) {
      await processKernel();
    }
  }

  async function deliverInboundCommand(obj) {
    // this promise could take an arbitrarily long time to resolve, so don't
    // wait on it
    const p = cm.inboundCommand(obj);
    // TODO: synchronize this somehow, make sure it doesn't overlap with the
    // processKernel() call in deliverInbound()
    await processKernel();
    return p;
  }

  // now let the bootstrap functions run
  await processKernel();

  return {
    deliverInbound,
    deliverInboundCommand,
    registerBroadcastCallback: cm.registerBroadcastCallback,
  };
}

export default async function start(basedir, withSES, argv) {
  const stateFile = path.resolve(basedir, 'swingstate.json');
  const connections = JSON.parse(
    fs.readFileSync(path.join(basedir, 'connections.json')),
  );
  let deliverInbound;

  function inbound(sender, messages, ack) {
    deliverInbound(sender, messages, ack);
  }

  let deliverInboundCommand;
  function command(obj) {
    return deliverInboundCommand(obj);
  }

  let broadcastJSON;
  function broadcast(obj) {
    broadcastJSON(obj);
  }

  connections.forEach(async c => {
    if (c.type === 'chain-cosmos-sdk') {
      console.log(`adding follower/sender for GCI ${c.GCI}`);
      // c.rpcAddresses are strings of host:port for the RPC ports of several
      // chain nodes
      const deliverator = await connectToChain(
        basedir,
        c.GCI,
        c.rpcAddresses,
        c.myAddr,
        inbound,
        c.chainID,
      );
      addDeliveryTarget(c.GCI, deliverator);
    } else if (c.type === 'http') {
      console.log(`adding HTTP/WS listener on ${c.host}:${c.port}`);
      if (broadcastJSON) {
        throw new Error(`duplicate type=http in connections.json`);
      }
      broadcastJSON = makeHTTPListener(basedir, c.port, c.host, command);
    } else {
      throw new Error(`unknown connection type in ${c}`);
    }
  });

  const vatsDir = path.join(basedir, 'vats');
  const d = await buildSwingset(stateFile, withSES, vatsDir, argv);
  deliverInbound = d.deliverInbound;
  deliverInboundCommand = d.deliverInboundCommand;
  if (broadcastJSON) {
    d.registerBroadcastCallback(broadcast);
  }

  console.log(`swingset running`);
}
