import fs from 'fs';
import path from 'path';
import temp from 'temp';
import { promisify } from 'util';
// import { createHash } from 'crypto';

// import connect from 'lotion-connect';
// import harden from '@agoric/harden';
// import djson from 'deterministic-json';
// import maybeExtendPromise from '@agoric/transform-bang';

import {
  loadBasedir,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  getVatTPSourcePath,
  getCommsSourcePath,
} from '@agoric/swingset-vat';
import { buildStorageInMemory } from '@agoric/swingset-vat/src/hostStorage';
import buildCommand from '@agoric/swingset-vat/src/devices/command';

import { deliver, addDeliveryTarget } from './outbound';
import { makeHTTPListener } from './web';

import { connectToChain } from './chain-cosmos-sdk';

// import { makeChainFollower } from './follower';
// import { makeDeliverator } from './deliver-with-ag-cosmos-helper';

const fsWrite = promisify(fs.write);
const fsClose = promisify(fs.close);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

async function atomicReplaceFile(filename, contents) {
  const info = await new Promise((resolve, reject) => {
    temp.open(
      {
        dir: path.dirname(filename),
        prefix: `${path.basename(filename)}.`,
      },
      (err, inf) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(inf);
      },
    );
  });
  try {
    // Write the contents, close, and rename.
    await fsWrite(info.fd, contents);
    await fsClose(info.fd);
    await rename(info.path, filename);
  } catch (e) {
    // Unlink on error.
    try {
      await unlink(info.path);
    } catch (e2) {
      // do nothing, we're already failing
    }
    throw e;
  }
}

async function buildSwingset(stateFile, withSES, vatsDir, argv) {
  const initialState = JSON.parse(fs.readFileSync(stateFile));

  const mbs = buildMailboxStateMap();
  mbs.populateFromData(initialState.mailbox);
  const mb = buildMailbox(mbs);
  const cm = buildCommand();

  const config = await loadBasedir(vatsDir);
  config.devices = [
    ['mailbox', mb.srcPath, mb.endowments],
    ['command', cm.srcPath, cm.endowments],
  ];
  config.vats.set('vattp', { sourcepath: getVatTPSourcePath() });
  config.vats.set('comms', {
    sourcepath: getCommsSourcePath(),
    options: { enablePipelining: true },
  });
  // 'storage' will be modified in-place as the kernel runs
  const storage = buildStorageInMemory(initialState.kernel);
  config.hostStorage = storage.storage;

  const controller = await buildVatController(config, withSES, argv);

  async function saveState() {
    const s = {
      mailbox: mbs.exportToData(),
      kernel: storage.getState(),
    };
    await atomicReplaceFile(stateFile, JSON.stringify(s));
  }

  async function processKernel() {
    await controller.run();
    await saveState();
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

  await Promise.all(
    connections.map(async c => {
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
    }),
  );

  const vatsDir = path.join(basedir, 'vats');
  const d = await buildSwingset(stateFile, withSES, vatsDir, argv);
  ({ deliverInbound, deliverInboundCommand } = d);
  if (broadcastJSON) {
    d.registerBroadcastCallback(broadcast);
  }

  console.log(`swingset running`);
}
