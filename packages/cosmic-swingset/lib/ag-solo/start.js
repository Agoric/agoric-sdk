import fs from 'fs';
import path from 'path';
import temp from 'temp';
import { promisify } from 'util';
import readlines from 'n-readlines';
// import { createHash } from 'crypto';

// import connect from 'lotion-connect';
// import harden from '@agoric/harden';
// import djson from 'deterministic-json';

import { openSwingStore } from '@agoric/swing-store-simple';
import {
  loadBasedir,
  buildCommand,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  buildTimer,
  getVatTPSourcePath,
  getCommsSourcePath,
  getTimerWrapperSourcePath,
} from '@agoric/swingset-vat';

import { deliver, addDeliveryTarget } from './outbound';
import { makeHTTPListener } from './web';

import { connectToChain } from './chain-cosmos-sdk';
import { connectToFakeChain } from './fake-chain';
import bundle from './bundle';

// import { makeChainFollower } from './follower';
// import { makeDeliverator } from './deliver-with-ag-cosmos-helper';

let swingSetRunning = false;

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

async function buildSwingset(
  kernelStateDBDir,
  mailboxStateFile,
  withSES,
  vatsDir,
  argv,
  broadcast,
) {
  const initialMailboxState = JSON.parse(fs.readFileSync(mailboxStateFile));

  const mbs = buildMailboxStateMap();
  mbs.populateFromData(initialMailboxState);
  const mb = buildMailbox(mbs);
  const cm = buildCommand(broadcast);
  const timer = buildTimer();

  const config = await loadBasedir(vatsDir);
  config.devices = [
    ['mailbox', mb.srcPath, mb.endowments],
    ['command', cm.srcPath, cm.endowments],
    ['timer', timer.srcPath, timer.endowments],
  ];
  config.vats.set('vattp', { sourcepath: getVatTPSourcePath() });
  config.vats.set('comms', {
    sourcepath: getCommsSourcePath(),
    options: { enablePipelining: true },
  });
  config.vats.set('timer', { sourcepath: getTimerWrapperSourcePath() });

  const { storage, commit } = openSwingStore(kernelStateDBDir);
  config.hostStorage = storage;

  const controller = await buildVatController(config, withSES, argv);

  async function saveState() {
    const ms = JSON.stringify(mbs.exportToData());
    await atomicReplaceFile(mailboxStateFile, ms);
    commit();
  }

  function deliverOutbound() {
    deliver(mbs);
  }

  async function processKernel() {
    await controller.run();
    if (swingSetRunning) {
      await saveState();
      deliverOutbound();
    }
  }

  async function deliverInboundToMbx(sender, messages, ack) {
    if (!(messages instanceof Array)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    // console.log(`deliverInboundToMbx`, messages, ack);
    if (mb.deliverInbound(sender, messages, ack, true)) {
      await processKernel();
    }
  }

  async function deliverInboundCommand(obj) {
    // this promise could take an arbitrarily long time to resolve, so don't
    // wait on it
    const p = cm.inboundCommand(obj);

    // Register a handler so that we don't get complaints about
    // asynchronously-handled callbacks.
    p.catch(_ => {});

    // TODO: synchronize this somehow, make sure it doesn't overlap with the
    // processKernel() call in deliverInboundToMbx()
    await processKernel();

    // Rethrow any exception so that our caller must handle it.
    return p.catch(e => {
      throw e;
    });
  }

  const intervalMillis = 1200;
  // TODO(hibbert) protect against kernel turns that take too long
  // drop calls to moveTimeForward if it's fallen behind, to make sure we don't
  // have two copies of controller.run() executing at the same time.
  function moveTimeForward() {
    const now = Math.floor(Date.now() / intervalMillis);
    if (timer.poll(now)) {
      const p = processKernel();
      p.then(
        _ => console.log(`timer-provoked kernel crank complete ${now}`),
        err =>
          console.log(`timer-provoked kernel crank failed at ${now}:`, err),
      );
    }
  }
  setInterval(moveTimeForward, intervalMillis);

  // now let the bootstrap functions run
  await processKernel();

  return {
    deliverInboundToMbx,
    deliverInboundCommand,
    deliverOutbound,
  };
}

export default async function start(basedir, withSES, argv) {
  const mailboxStateFile = path.resolve(
    basedir,
    'swingset-kernel-mailbox.json',
  );
  const connections = JSON.parse(
    fs.readFileSync(path.join(basedir, 'connections.json')),
  );

  let broadcastJSON;
  function broadcast(obj) {
    if (broadcastJSON) {
      broadcastJSON(obj);
    } else {
      console.log(`Called broadcast before HTTP listener connected.`);
    }
  }

  const vatsDir = path.join(basedir, 'vats');
  const stateDBDir = path.join(basedir, 'swingset-kernel-state');
  const d = await buildSwingset(
    stateDBDir,
    mailboxStateFile,
    withSES,
    vatsDir,
    argv,
    broadcast,
  );

  const { deliverInboundToMbx, deliverInboundCommand, deliverOutbound } = d;

  await Promise.all(
    connections.map(async c => {
      switch (c.type) {
        case 'chain-cosmos-sdk':
          {
            console.log(`adding follower/sender for GCI ${c.GCI}`);
            // c.rpcAddresses are strings of host:port for the RPC ports of several
            // chain nodes
            const deliverator = await connectToChain(
              basedir,
              c.GCI,
              c.rpcAddresses,
              c.myAddr,
              deliverInboundToMbx,
              c.chainID,
            );
            addDeliveryTarget(c.GCI, deliverator);
          }
          break;
        case 'fake-chain': {
          console.log(
            `adding follower/sender for fake chain ${c.role} ${c.GCI}`,
          );
          const deliverator = await connectToFakeChain(
            basedir,
            c.GCI,
            c.role,
            c.fakeDelay,
            deliverInboundToMbx,
          );
          addDeliveryTarget(c.GCI, deliverator);
          break;
        }
        case 'http':
          console.log(`adding HTTP/WS listener on ${c.host}:${c.port}`);
          if (broadcastJSON) {
            throw new Error(`duplicate type=http in connections.json`);
          }
          broadcastJSON = makeHTTPListener(
            basedir,
            c.port,
            c.host,
            deliverInboundCommand,
          );
          break;
        default:
          throw new Error(`unknown connection type in ${c}`);
      }
    }),
  );

  console.log(`swingset running`);
  swingSetRunning = true;
  deliverOutbound();

  // Install the bundles as specified.
  const initDir = path.join(basedir, 'init-bundles');
  let list = [];
  try {
    list = await fs.promises.readdir(initDir);
  } catch (e) {}
  for (const initName of list.sort()) {
    console.log('loading init bundle', initName);
    const initFile = path.join(initDir, initName);
    if (
      await bundle(() => '.', ['--evaluate', '--once', '--input', initFile])
    ) {
      return 0;
    }
  }
}
