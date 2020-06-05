import process from 'process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import temp from 'temp';

import { initSwingStore, openSwingStore } from '@agoric/swing-store-lmdb';
import { producePromise } from '@agoric/produce-promise';
import {
  loadBasedir,
  buildBridge,
  buildCommand,
  buildVatController,
  buildMailboxStateMap,
  buildMailbox,
  buildTimer,
  getVatTPSourcePath,
  getCommsSourcePath,
  getTimerWrapperSourcePath,
} from '@agoric/swingset-vat';

import { connectToChain } from '../../cosmic-swingset/lib/ag-solo/chain-cosmos-sdk';
import { deliver, addDeliveryTarget } from '../../cosmic-swingset/lib/ag-solo/outbound';

import { makeWithQueue } from './queue';
import { startAPIServer } from './web';
import { runWrappedProgram } from './relayer';

// as this is a quick demo, we run a solo node (with relaying superpowers)
// from this here directory, rather than creating a new working directory and
// copying runtime files into it

process.on('SIGINT', () => process.exit(99));

const connectionsFile = 'state/connections.json';
const stateDirectory = 'state/relay-swingset'; // delete this to reset
const mailboxStateFile = 'state/relay-swingset/mailbox-state.json';
const kernelStateDBDir = 'state/relay-swingset/kernel-state';
const vatsDir = 'vats';

function initBasedir() {
  if (!fs.existsSync(connectionsFile)) {
    console.error(`${connectionsFile} missing: make register-relay-with-ibc0`);
  }
  if (fs.existsSync(stateDirectory)) {
    console.error(`'state/relay-swingset/' directory already exists, resuming`);
    return;
  }
  console.error(`${stateDirectory} directory does not exist, initializing`);
  fs.mkdirSync(stateDirectory);
  const { commit, close } = initSwingStore(kernelStateDBDir);
  commit();
  close();
  fs.writeFileSync(mailboxStateFile, `{}\n`);
}

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

async function buildSwingset(relayerDowncall, swingsetArgv) {
  const initialMailboxState = JSON.parse(fs.readFileSync(mailboxStateFile));

  const mbs = buildMailboxStateMap();
  mbs.populateFromData(initialMailboxState);
  const mb = buildMailbox(mbs);
  const cm = buildCommand(_obj => {
    console.log(`broadcast not implemented`);
  });
  const timer = buildTimer();

  const bridge = buildBridge(obj => {
    // send 'obj' to the IBC/relayer sender
    //console.log(`bridge to somewhere`, obj);
    return relayerDowncall(obj);
  });

  const config = await loadBasedir(vatsDir);
  config.devices = [
    ['mailbox', mb.srcPath, mb.endowments],
    ['command', cm.srcPath, cm.endowments],
    ['timer', timer.srcPath, timer.endowments],
    ['bridge', bridge.srcPath, bridge.endowments],
  ];
  config.vats.set('vattp', { sourcepath: getVatTPSourcePath() });
  config.vats.set('comms', {
    sourcepath: getCommsSourcePath(),
    options: { enablePipelining: true },
  });
  config.vats.set('timer', { sourcepath: getTimerWrapperSourcePath() });

  const { storage, commit } = openSwingStore(kernelStateDBDir);
  config.hostStorage = storage;

  const controller = await buildVatController(config, true, swingsetArgv);

  async function saveState() {
    const ms = JSON.stringify(mbs.exportToData());
    await atomicReplaceFile(mailboxStateFile, ms);
    commit();
  }

  const withInputQueue = makeWithQueue();
  function queueInbound(thunk) {
    // the kernel executes one thunk at a time, and processes outbound events
    // afterwards
    async function outerCrank() {
      thunk(); // device invocation
      await controller.run();
      await saveState();
      // console.log(`deliverOutbound not yet implemented`);
      // deliver new outbound mailbox messages
      deliver(mbs);
    }
    const p = withInputQueue(outerCrank)();
    p.catch(err => {
      console.log(`error during kernel invocation`, err);
      process.exit(1);
    });
    return p;
  }

  function queueInboundMailbox(sender, messages, ack) {
    if (!Array.isArray(messages)) {
      throw new Error(`inbound given non-Array: ${messages}`);
    }
    // console.debug(`deliverInboundToMbx`, messages, ack);
    queueInbound(() => mb.deliverInbound(sender, messages, ack, true));
  }

  // this should be called when IBC packets arrive
  function queueInboundBridge(...args) {
    return queueInbound(() => bridge.deliverInbound(...args));
  }

  function queueInboundCommand(obj) {
    // unlike queueInboundMailbox, this returns a result promise, which might
    // be fired during some future crank, or maybe never at all
    const pr = producePromise();

    // console.debug(`deliverInboundToMbx`, messages, ack);
    queueInbound(() => {
      cm.inboundCommand(obj).then(
        ok => pr.resolve(ok),
        err => pr.reject(err),
      );
    });
    return pr.promise;
  }

  let intervalMillis;
  function queueTimerEvent() {
    const p = queueInbound(() => {
      const now = Math.floor(Date.now() / 1000);
      timer.poll(now); // timer device gets seconds
    });
    p.then(() => {
      setTimeout(queueTimerEvent, intervalMillis);
    });
  }
  function startTimer(rate) {
    intervalMillis = rate;
    setTimeout(queueTimerEvent, intervalMillis);
  }

  function queueBootstrap() {
    // crank the kernel for the first time, to allow bootstrap functions to
    // execute and the post-bootstrap state to be saved
    console.log(`-- running bootstrap crank`);
    function emptyThunk() {}
    return queueInbound(emptyThunk);
  }

  return {
    queueInboundMailbox,
    queueInboundCommand,
    queueInboundBridge,
    queueBootstrap,
    startTimer,
  };
}

const SECOND = 1000;

function makePausedForwarder(output) {
  let paused = true;
  const queued = [];
  function input(...args) {
    if (paused) {
      queued.push(args);
    } else {
      output(...args);
    }
  }
  function unpause() {
    if (paused) {
      console.log(`pausedForwarder unpausing`);
      paused = false;
      for (const args of queued) {
        console.log(` pausedForwarder delivering queued message`);
        output(...args);
      }
    }
  }
  return { input, unpause };
}

async function main(args) {

  async function initSwingSet(relayerDowncall) {
    initBasedir();

    let connections = [];
    if (fs.existsSync(connectionsFile)) {
      connections = JSON.parse(fs.readFileSync(connectionsFile));
    }
    const chainsToFollow = [];
    for (const c of connections) {
      if (c.type === 'chain-cosmos-sdk') {
        chainsToFollow.push(c.GCI);
      }
    }

    // we first prepare the kernel (but don't let it run yet)

    const swingsetArgv = [chainsToFollow];
    const {
      queueInboundMailbox,
      queueInboundCommand,
      queueInboundBridge,
      queueBootstrap,
      startTimer,
    } = await buildSwingset(relayerDowncall, swingsetArgv);

    // prepare this for later

    function inboundHTTPRequest(request) {
      console.log(`HTTP request path=${request.path}`);
      // return { response: 'ok' };

      // TODO: This is a hack for testing, remove when IBC is wired to the
      // bridge. Do 'make poke-...' to pretend that
      // the IBC/relayer golang code just received something.
      if (request.path.startsWith('/sendIntoBridge/')) {
        console.log(`http said to send something into the bridge device`);
        queueInboundBridge(request.path);
        return 'queued for input into bridge';
      }
      // this is the general HTTP input path. TODO: collect and pass the
      // request body in too, we'll use it for handler installation. Don't go
      // too crazy with options, keep it simple. Exercise with:
      //  curl --data-binary @./handler.js http://localhost:8000/install
      return queueInboundCommand({
        path: request.path,
        body: request.body.toString(),
      });
    }

    // next we enable the outbound channels. TODO rewrite connectToChain to
    // add pause() or something that lets us defer polling for inbound
    // messages until after the kernel is ready, but still allows outbound
    // message to go as soon as we let bootstrap() run. For now we queue
    // inbound messages ourselves.

    const inMB = makePausedForwarder(queueInboundMailbox);

    await Promise.all(
      connections.map(async c => {
        switch (c.type) {
        case 'chain-cosmos-sdk':
          console.log(`adding follower/sender for GCI ${c.GCI}`);
          // c.rpcAddresses are strings of host:port for the RPC ports of several
          // chain nodes
          const deliverator = await connectToChain(
            c.helperBasedir,
            c.GCI,
            c.rpcAddresses,
            c.myAddr,
            inMB.input,
            c.chainID,
          );
          addDeliveryTarget(c.GCI, deliverator);
          break;
        default:
          throw new Error(`unknown connection type in ${c}`);
        }
      }),
    );

    // Now that it can send messages, we start the kernel by letting it run
    // the bootstrap function.
    await queueBootstrap();
    console.log(` queueBootstrap() done`);

    // And finally, now that the kernel is ready for inbound messages, we can
    // create/enable the inbound channels.
    inMB.unpause();
    startTimer(1.0 * SECOND);
    startAPIServer(8008, inboundHTTPRequest);

    console.log(`swingset running`);
    return { queueInboundBridge };
  }

  await runWrappedProgram(initSwingSet, args);
}

main(process.argv.slice(1)).then(
  _ok => {},
  err => {
    console.error(`error in smart-relay main`, err);
    process.exit(1);
  },
);
