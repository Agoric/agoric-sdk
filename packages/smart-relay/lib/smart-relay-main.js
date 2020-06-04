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

import { makeWithQueue } from './queue';
import { startAPIServer } from './web';

// as this is a quick demo, we run a solo node (with relaying superpowers)
// from this here directory, rather than creating a new working directory and
// copying runtime files into it

const stateDirectory = 'state'; // delete this to reset
const mailboxStateFile = 'state/mailbox-state.json';
const kernelStateDBDir = 'state/kernel-state';
const vatsDir = 'vats';

function initBasedir() {
  if (fs.existsSync(stateDirectory)) {
    console.log(`'state/' directory already exists, resuming`);
    return;
  }
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

async function buildSwingset() {
  const initialMailboxState = JSON.parse(fs.readFileSync(mailboxStateFile));

  const mbs = buildMailboxStateMap();
  mbs.populateFromData(initialMailboxState);
  const mb = buildMailbox(mbs);
  const cm = buildCommand(obj => { console.log(`broadcast not implemented`); });
  const timer = buildTimer();
  // todo: wire bridge output to IBC sender
  const bridge = buildBridge(obj => { console.log(`bridge to nowhere`, obj); });

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

  const controller = await buildVatController(config, true, []);

  async function saveState() {
    const ms = JSON.stringify(mbs.exportToData());
    await atomicReplaceFile(mailboxStateFile, ms);
    commit();
  }

  function deliverOutbound() {
  }

  const withInputQueue = makeWithQueue();
  function _queueInbound(thunk) {
    // the kernel executes one thunk at a time, and processes outbound events
    // afterwards
    async function outerCrank() {
      thunk(); // device invocation
      await controller.run();
      await saveState();
      console.log(`deliverOutbound not yet implemented`);
      //deliver(mbs);
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
    _queueInbound(() => mb.deliverInbound(sender, messages, ack, true));
  }

  // this should be called when IBC packets arrive
  function queueInboundBridge(arg) {
    _queueInbound(() => bridge.deliverInbound(arg));
  }

  function queueInboundCommand(obj) {
    // unlike queueInboundMailbox, this returns a result promise, which might
    // be fired during some future crank, or maybe never at all
    const pr = producePromise();

    // console.debug(`deliverInboundToMbx`, messages, ack);
    _queueInbound(() => {
      cm.inboundCommand(obj).then(ok => pr.resolve(ok), err => pr.reject(err));
    });
    return pr.promise;
  }

  let intervalMillis;
  function queueTimerEvent() {
    const p = _queueInbound(() => {
      const now = Math.floor(Date.now() / intervalMillis);
      timer.poll(now);
    });
    p.then(() => {
      setTimeout(queueTimerEvent, intervalMillis);
    });
  }
  function startTimer(rate) {
    intervalMillis = rate;
    setTimeout(queueTimerEvent, intervalMillis);
  }

  // crank the kernel for the first time, to allow bootstrap functions to
  // execute and the post-bootstrap state to be saved
  console.log(`-- running bootstrap crank`);
  function emptyThunk() {}
  await _queueInbound(emptyThunk);

  return {
    queueInboundMailbox, queueInboundCommand, queueInboundBridge, startTimer,
  };
}

async function main() {
  initBasedir();
  const { queueInboundMailbox, queueInboundCommand, queueInboundBridge, startTimer } = await buildSwingset();
  startTimer(1200);
  console.log(`swingset running`);

  function inboundHTTPRequest(request) {
    console.log(`HTTP request path=${request.path}`);
    //return { response: 'ok' };

    // hack for testing, remove when IBC is wired to the bridge
    if (request.path === '/sendIntoBridge') {
      console.log(`http said to send something into the bridge device`);
      queueInboundBridge('input arg');
      return 'queued for input into bridge';
    }
    return queueInboundCommand({ path: request.path });
  }
  startAPIServer(8000, inboundHTTPRequest);

  // now we wait for events
}

main().then(
  _ok => {},
  err => {
    console.log(`error in smart-relay main`, err);
    process.exit(1);
  },
);

