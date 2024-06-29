/* eslint-disable */
import process from 'process';
import fs from 'fs';
import sqlite3 from 'better-sqlite3';
import { performance } from 'perf_hooks';
import microtime from 'microtime';
import '@endo/init';

import { openSwingStore } from '@agoric/swing-store';
import { upgradeSwingset } from '@agoric/swingset-vat';
import { makeSwingsetController } from '@agoric/swingset-vat';
import { kser, kunser, krefOf, kslot } from '@agoric/kmarshal';
import { makeDummySlogger } from  '@agoric/swingset-vat/src/kernel/slogger.js';
import makeKernelKeeper from '@agoric/swingset-vat/src/kernel/state/kernelKeeper.js';
import { makeKernelQueueHandler } from '@agoric/swingset-vat/src/kernel/kernelQueue.js';
import { BridgeId } from '@agoric/internal';
import bundleSource from '@endo/bundle-source';

import { extract } from './extract-bridge-input.js';


const serializeSlogObj = slogObj =>
  JSON.stringify(slogObj, (_, arg) =>
    typeof arg === 'bigint' ? Number(arg) : arg,
  );

function enqueue(kernelStorage, item) {
  const { kvStore } = kernelStorage;
  // console.log(kvStore.get('runQueue'));
  const [head, tail] = JSON.parse(kvStore.get(`runQueue`));
  kvStore.set(`runQueue.${tail}`, JSON.stringify(item));
  kvStore.set(`runQueue`, JSON.stringify([head, tail + 1]));
}

function vrefToKref(kvStore, vatID, vref) {
  const kref = kvStore.get(`${vatID}.c.${vref}`);
  assert(kref, `vat ${vatID} has no clist for vref ${vref}`);
  return kref;
}

function findResolutions(kernelStorage, vatID, vpids) {
  const { transcriptStore } = kernelStorage;
  // look through the first 200 deliveries of the incarnation for
  // resolutions.
  const remaining_vpids = new Set(vpids);
  const resolutions = new Map();

  // for contracts:
  //  incarnation=0:
  //   first span is [initialize-worker, startVat, message(startZcf), BOYD, save-snapshot]
  //   second span: [load-snapshot, ..] with notifies for promises in vatParameters
  //   startVat(vatParameters.privateArgs) frequently has promises, resolved promptly
  //  incarnation>=1:
  //   first span is [initialize-worker, startVat, (random notify), BOYD, save-snapshot]
  //   second span is [load-snapshot, ..] with more notifies
  //   liveslots/D()/forbidPromises prohibts promises in vatParameters

  // for non-contracts, all incarnations are:
  //   first span is [initialize-worker, startVat, random, BOYD, save-snapshot]
  //   second span: [load-snapshot, random..]

  const ib = transcriptStore.getCurrentIncarnationBounds(vatID);
  let position = ib.startPos;
  while (position < ib.startPos+200) {
    const s = transcriptStore.readItem(vatID, position);
    if (!s) {
      break; // ran off the end of the transcript
    }
    const t = JSON.parse(s);
    console.log(`t[${position}].d is`, t.d);
    if (t.d[0] === 'notify') {
      for (let [vpid, rejected, resCD] of t.d[1]) {
        if (remaining_vpids.has(vpid)) {
          resolutions.set(vpid, kunser(resCD));
          remaining_vpids.delete(vpid);
        }
      }
      if (!remaining_vpids.size) {
        break; // all resolved
      }
    }
    position += 1;
  }
  return resolutions;
}

function parseItem(transcriptStore, vatID, position) {
  const s = transcriptStore.readItem(vatID, position);
  assert(s, `transcript[${vatID}][${position}] missing, read beyond end?`);
  return JSON.parse(s);
}

function getOriginalBundleID(kernelStorage, vatID) {
  // Extract and return the BundleID with which the vat was most
  // recently launched. This appears in the `initialize-worker`
  // message, which will be the very first transcript entry of the
  // latest incarnation.

  const { transcriptStore, kvStore } = kernelStorage;
  const ib = transcriptStore.getCurrentIncarnationBounds(vatID)
  console.log(`incarnation bounds:`, ib);
  const t0 = parseItem(transcriptStore, vatID, ib.startPos)
  assert.equal(t0.d[0], 'initialize-worker');
  const origBundleID = t0.d[1].source.bundleID
  assert(origBundleID);
  return origBundleID;
}

function getVatParameters(kernelStorage, vatID) {
  // Extract and return demarshalled vatParameters for the most recent
  // incarnation. These appear as arguments of the `startVat`
  // delivery, which is always the first real delivery, and appears in
  // the second transcript entry, just after initialize-worker.

  const { transcriptStore, kvStore } = kernelStorage;
  const ib = transcriptStore.getCurrentIncarnationBounds(vatID)
  console.log(`incarnation bounds:`, ib);
  const t0 = parseItem(transcriptStore, vatID, ib.startPos);
  assert.equal(t0.d[0], 'initialize-worker');
  const t1 = parseItem(transcriptStore, vatID, ib.startPos+1);
  assert.equal(t1.d[0], 'startVat');
  const vpCapData = t1.d[1]; // vrefs
  for (let vref of vpCapData.slots) {
    // the kernel prohibits promises in vatParameters, let's doublecheck
    assert(!vref.startsWith('p'), `promise vref ${vref} in vatParameters`);
  }
  const vatParameters = kunser(vpCapData); // embeds vrefs
  return vatParameters;
}

function resolveShallowPromises(kernelStorage, vatID, privateArgs) {
  // Take a demarshalled 'obj' and return a version in which all
  // top-level promise-valued properties are replaced with their
  // resolutions.

  // glean all vrefs, even the non-top-level ones
  const remaining = new Set();
  for (let vref of kser(privateArgs).slots) {
    if (vref.startsWith('p')) {
      remaining.add(vref);
    }
  }
  // resolving non-shallow ones would require finding them in the
  // unmarshalled data, difficult and annoying

  privateArgs = { ...privateArgs }; // get a mutable copy
  const unresVPIDs = new Set();
  const replacements = {};
  for (let [n,v] of Object.entries(privateArgs)) {
    console.log(`  ${n}: ${krefOf(v)}`);
    let vref = krefOf(v); // actually a vref
    if (vref?.startsWith('p')) {
      unresVPIDs.add(vref);
      remaining.delete(vref);
    }
  }
  const resolutions = findResolutions(kernelStorage, vatID, unresVPIDs);
  for (let [n,v] of Object.entries(privateArgs)) {
    // note: krefOf() is actually a vref
    const vref = krefOf(v);
    if (resolutions.has(vref)) {
      replacements[n] = resolutions.get(vref);
    }
  }
  if (remaining.size) {
    const s = [...remaining].join(',');
    throw Error(`non-shallow Promises remaining: ${s}`);
  }
  privateArgs = { ...privateArgs, ...replacements };
  //console.log(`--rSP`, privateArgs, replacements, resolutions);
  return harden(privateArgs);
}

function getPrivateArgs(kernelStorage, vatID) {
  // Extract and return a contract's privateArgs. Resolve any promises
  // they contain.
  const { transcriptStore, kvStore } = kernelStorage;
  const ib = transcriptStore.getCurrentIncarnationBounds(vatID)
  if (ib.incarnation === 0) {
    // incarnation = 0 gets a startZcf() message before any others
    const t0 = parseItem(transcriptStore, vatID, ib.startPos);
    assert.equal(t0.d[0], 'initialize-worker');
    const t1 = parseItem(transcriptStore, vatID, ib.startPos+1);
    assert.equal(t1.d[0], 'startVat');
    const t2 = parseItem(transcriptStore, vatID, ib.startPos+2);
    assert.equal(t2.d[0], 'message');
    const methargsCapData = t2.d[2].methargs;
    const [startZcf, args] = kunser(methargsCapData);
    assert.equal(startZcf, 'startZcf');
    const [_zoeInstanceAdmin, _instanceRecord, _issuerStorage, privateArgs] = args;

    // The privateArgs might contain promises (e.g. v43-walletFactory
    // gets a 'walletReviver' which is actually a promise). To use
    // these in an upgrade, we need a resolved value. We assume that
    // privateArgs is shallow, but if we're wrong, this will throw.
    const resolvedPrivateArgs = resolveShallowPromises(kernelStorage, vatID, privateArgs);
    return resolvedPrivateArgs;
  } else {
    // incarnation >= 1 gets vatParameters.privateArgs
    const vatParameters = getVatParameters(kernelStorage, vatID);
    const { privateArgs } = vatParameters;
    return privateArgs;
  }
}

function buildVatUpgradeEvent(kernelStorage, vatID, vatParameters, bundleID) {
  // vatParameters are demarshalled
  const { kvStore } = kernelStorage;
  assert(bundleID);
  const vpCDvrefs = kser(vatParameters);
  // this assumes the vrefs are still in the c-list (not dropped/GCed)
  const kslots = vpCDvrefs.slots.map(vref => vrefToKref(kvStore, vatID, vref));
  const vpCDkrefs = { ...vpCDvrefs, slots: kslots }; // now kref-marshalled

  const upgradeID = 'xxx'; // unknown to vat-vat-admin, will whine but ignore
  const upgradeMessage = 'vat upgraded';
  const ev = {
    type: 'upgrade-vat',
    vatID,
    upgradeID,
    bundleID,
    vatParameters: vpCDkrefs,
    upgradeMessage,
  };
  console.log(`--ev`, ev);
  return ev;
}

function buildVatUpgrade(kernelStorage, vatID, options) {
  const {
    bundleID = getOriginalBundleID(kernelStorage, vatID),
  } = options;
  // todo: allow override of workerOptions.bundleIDs (lockdown/supervisor)
  const vatParameters = getVatParameters(kernelStorage, vatID);
  return buildVatUpgradeEvent(kernelStorage, vatID, vatParameters, bundleID);
}

function buildContractVatUpgrade(kernelStorage, vatID, options) {
  const {
    zcfBundleID = getOriginalBundleID(kernelStorage, vatID),
    contractBundleID, // TODO: allow override
  } = options;
  assert(!contractBundleID, 'not implemented yet');
  let vatParameters = getVatParameters(kernelStorage, vatID);
  let { contractBundleCap } = vatParameters;
  const privateArgs = getPrivateArgs(kernelStorage, vatID);
  // upgrade wants fewer properties than the original
  vatParameters = { contractBundleCap, privateArgs };
  return buildVatUpgradeEvent(kernelStorage, vatID, vatParameters, zcfBundleID);
}

/*
function extractPrivateArgsForContract(kernelStorage, vatID) {
  const { transcriptStore, kvStore } = kernelStorage;

  // handle both never-upgraded and previously-ugpraded contract vats
  const ib = transcriptStore.getCurrentIncarnationBounds(vatID)
  console.log(`incarnation bounds:`, ib);

  // for contracts:
  //  incarnation=0:
  //   first span is [initialize-worker, startVat, message(startZcf), BOYD, save-snapshot]
  //   second span: [load-snapshot, ..] with notifies for promises in vatParameters
  //  incarnation>=1:
  //   first span is [initialize-worker, startVat, (random notify), BOYD, save-snapshot]
  //   second span is [load-snapshot, ..] with more notifies
  //   notifies are for messages send during startVat, not anything in vatParameters

  //const t0 = transcriptStore.readItem(vatID, 
  let iter = transcriptStore.readSpan(vatID, ib.startPos);
  const t0 = JSON.parse(iter.next().value); // initialize-worker or load-worker
  assert.equal(t0.d[0], 'initialize-worker');
  const t1 = JSON.parse(iter.next().value); // dispatch.startVat
  assert.equal(t1.d[0], 'startVat');
  // for the first incarnation, the startPos+2 delivery is a dispatch.send() startZcf
  // subsequent incarnations (upgrades) don't get a startZcf
  const t2 = JSON.parse(iter.next().value); // contracts: dispatch.send() startZcf
  // E(root).startZcf(zoeInstanceAdmin, instanceRecord, issuerStorage, privateArgs)
  // we currently end the span after startVat plus one delivery, so t3=BOYD and t4=save-snapshot
  iter.return(); // release the DB iterator and connection

  //console.log(JSON.stringify(t0.d));
  const origBundleID = t0.d[1].source.bundleID
  bundleID = bundleID || origBundleID;
  console.log(`## orig bundleID`, origBundleID);
  console.log(`## new bundleID `, bundleID);
  //console.log(JSON.stringify(t1.d));

  let vatParameters = kunser(t1.d[1]); // embeds vrefs
  if (isContract) {

    // the first launch (incarnation=0) gets:
    //   vatParameters={contractBundleCap, zoeService, InvitationIssuer}
    //  and then the first message is:
    //   startZcf(zoeInstanceAdmin, instanceRecord, issuerStorage,  privateArgs)
    //  (and privateArgs might hold promises, which are hopefully resolved soon
    //
    // all subsequent launches (incarnation>=1) want/get:
    //   vatParameters={contractBundleCap, privateArgs}

    let privateArgs;
    if (incarnation === 0) {
      // find startZcf in the transcript, extract privateArgs
      const [startZcf, [_zoeInstanceAdmin, _instanceRecord, _issuerStorage, origPrivateArgs]] = kunser(t2.d[2].methargs);
      assert.equal(startZcf, 'startZcf');
      //console.log(`-- zoeInstanceAdmin`, zoeInstanceAdmin);
      //console.log(`-- instanceRecord`, instanceRecord);
      //console.log(`-- issuerStorage`, issuerStorage);
      console.log(`-- origPrivateArgs`, origPrivateArgs);
      // privateArgs can be anything, but we assume a shallow record
      privateArgs = { ...origPrivateArgs };

      // startZcf might get promises: for v43-walletFactory,
      // privateArgs = { storageNode, walletBridgeManager,
      // walletReviver }, but walletReviver is a promise

      const unresVPIDs = new Set();
      for (let [n,v] of Object.entries(privateArgs)) {
        console.log(`  ${n}: ${krefOf(v)}`);
        let vref = krefOf(v); // actually a vref
        if (vref?.startsWith('p')) {
          unresVPIDs.add(vref);
        }
      }
      const resolutions = findResolutions(kernelStorage, vatID, unresVPIDs);
      for (let [n,v] of Object.entries(privateArgs)) {
        privateArgs[n] = resolutions[krefOf(v)]; // krefOf() is actually a vref
      }
    } else {
      // extract privateArgs from the incarnation's vatParameters
      ({privateArgs}) = vatParameters; // vrefs
    }

    console.log(`--privateArgs`, privateArgs);
}

function enqueueVatUpgrade(kernelStorage, vatID, options={}) {
  const {
    isContract = false,
  } = options;
  let { bundleID, contractBundleID } = options;
  // TODO: contractBundleID
  const { transcriptStore, kvStore } = kernelStorage;
  //const vatKeeper = kernelKeeper.provideVatKeeper(vatID);

  // TODO: tolerate previously-ugpraded vats: use first delivery of
  // current incarnation, not 0
  const ib = transcriptStore.getCurrentIncarnationBounds(vatID)
  console.log(`incarnation bounds:`, ib);

  // for contracts:
  //  incarnation=0:
  //   first span is [initialize-worker, startVat, message(startZcf), BOYD, save-snapshot]
  //   second span: [load-snapshot, ..] with notifies for promises in vatParameters
  //  incarnation>=1:
  //   first span is [initialize-worker, startVat, (random notify), BOYD, save-snapshot]
  //   second span is [load-snapshot, ..] with more notifies
  //   notifies are for messages send during startVat, not anything in vatParameters

  let iter = transcriptStore.readSpan(vatID, ib.startPos);
  const t0 = JSON.parse(iter.next().value); // initialize-worker or load-worker
  assert.equal(t0.d[0], 'initialize-worker');
  const t1 = JSON.parse(iter.next().value); // dispatch.startVat
  assert.equal(t1.d[0], 'startVat');
  // for the first incarnation, the startPos+2 delivery is a dispatch.send() startZcf
  // subsequent incarnations (upgrades) don't get a startZcf
  const t2 = JSON.parse(iter.next().value); // contracts: dispatch.send() startZcf
  // E(root).startZcf(zoeInstanceAdmin, instanceRecord, issuerStorage, privateArgs)
  // we currently end the span after startVat plus one delivery, so t3=BOYD and t4=save-snapshot
  iter.return(); // release the DB iterator and connection

  //console.log(JSON.stringify(t0.d));
  const origBundleID = t0.d[1].source.bundleID
  bundleID = bundleID || origBundleID;
  console.log(`## orig bundleID`, origBundleID);
  console.log(`## new bundleID `, bundleID);
  //console.log(JSON.stringify(t1.d));

  let vatParameters = kunser(t1.d[1]); // embeds vrefs
  if (isContract) {

    // the first launch (incarnation=0) gets:
    //   vatParameters={contractBundleCap, zoeService, InvitationIssuer}
    //  and then the first message is:
    //   startZcf(zoeInstanceAdmin, instanceRecord, issuerStorage,  privateArgs)
    //  (and privateArgs might hold promises, which are hopefully resolved soon
    //
    // all subsequent launches (incarnation>=1) want/get:
    //   vatParameters={contractBundleCap, privateArgs}

    let privateArgs;
    if (incarnation === 0) {
      // find startZcf in the transcript, extract privateArgs
      const [startZcf, [_zoeInstanceAdmin, _instanceRecord, _issuerStorage, origPrivateArgs]] = kunser(t2.d[2].methargs);
      assert.equal(startZcf, 'startZcf');
      //console.log(`-- zoeInstanceAdmin`, zoeInstanceAdmin);
      //console.log(`-- instanceRecord`, instanceRecord);
      //console.log(`-- issuerStorage`, issuerStorage);
      console.log(`-- origPrivateArgs`, origPrivateArgs);
      // privateArgs can be anything, but we assume a shallow record
      privateArgs = { ...origPrivateArgs };

      // startZcf might get promises: for v43-walletFactory,
      // privateArgs = { storageNode, walletBridgeManager,
      // walletReviver }, but walletReviver is a promise

      const unresVPIDs = new Set();
      for (let [n,v] of Object.entries(privateArgs)) {
        console.log(`  ${n}: ${krefOf(v)}`);
        let vref = krefOf(v); // actually a vref
        if (vref?.startsWith('p')) {
          unresVPIDs.add(vref);
        }
      }
      const resolutions = findResolutions(kernelStorage, vatID, unresVPIDs);
      for (let [n,v] of Object.entries(privateArgs)) {
        privateArgs[n] = resolutions[krefOf(v)]; // krefOf() is actually a vref
      }
    } else {
      // extract privateArgs from the incarnation's vatParameters
      ({privateArgs}) = vatParameters; // vrefs
    }

    console.log(`--privateArgs`, privateArgs);

    const { contractBundleCap } = vatParameters;
    vatParameters = {contractBundleCap, privateArgs}; // embeds vrefs
  }

  vatParameters = kser(vatParameters); // vrefs-marshalled
  const kslots = vatParameters.slots.map(vref => vrefToKref(kvStore, vatID, vref));
  vatParameters = { ...vatParameters, slots: kslots }; // now kref-marshalled

  const upgradeID = 'xxx'; // unknown to vat-vat-admin, will whine but ignore
  const upgradeMessage = 'vat upgraded';
  const ev = {
    type: 'upgrade-vat',
    vatID,
    upgradeID,
    bundleID,
    vatParameters,
    upgradeMessage,
  };
  console.log(`--ev`, ev);
  enqueue(kvStore, ev);
}
*/

/*
function enqueueZoeUpgrade(kvStore) {
  const bundleID = kvStore.get('namedBundleID.zoe');
  console.log(bundleID);
  // we happen to know that zoe is started with vatParameters=undefined
  // synthesize an upgrade-vat event for the run-queue
  const vatID = 'v9';
  const upgradeID = 'xxx'; // unknown to vat-vat-admin, will whine but ignore
  const vatParameters = undefined;
  const marshalledVatParameters = kser(vatParameters);
  const upgradeMessage = 'vat upgraded';
  const ev = {
    type: 'upgrade-vat',
    vatID,
    upgradeID,
    bundleID,
    vatParameters: marshalledVatParameters,
    upgradeMessage,
  };
  console.log(`--ev`, ev);
  enqueue(kvStore, ev);
  // TODO: incref the bundle, else would delete if we'd implemented deletes
}
*/

async function getBundle(bundleFrom) {
  assert(bundleFrom);
  let bundle;
  if (bundleFrom.endsWith('.bundle') || bundleFrom.endsWith('.json')) {
    // TODO: is this enough?
    console.log(`-- loading bundle (JSON) from ${bundleFrom}`);
    return JSON.parse(fs.readFileSync(bundleFrom));
  }
  if (bundleFrom.endsWith('.jsb')) {
    // hack to mean "module that exports 'bundle'"
    const name = bundleFrom.slice(0, bundleFrom.length - 1);
    console.log(`-- loading bundle ('export default') from ${name}`);
    const mod = await import(name);
    //console.log(`-- module has keys`, Object.keys(mod));
    assert(mod.default, `module imported from ${name} lacks .default`);
    const bundle = mod.default;
    //console.log(`-- bundle`, Object.keys(bundle));
    return bundle;
  }
  console.log(`-- bundleSource(${bundleFrom})`);
  assert(fs.existsSync(bundleFrom));
  const dev = false; // false = don't include devDependencies in the bundle
  return await bundleSource(bundleFrom, { dev });
}

function makeRunPolicies() {
  let didWork = false;
  let totalComputrons = 0n;
  //const shouldRun = () => ignoreBlockLimit || totalBeans < blockComputeLimit;
  const shouldRun = () => true;
  const remainingBeans = () =>
    ignoreBlockLimit ? undefined : blockComputeLimit - totalBeans;

  const runPolicy = harden({
    allowCleanup: () => false,
    didCleanup: () => undefined, // ignore
    vatCreated() {
      didWork = true;
      return shouldRun();
    },
    crankComplete(details = {}) {
      didWork = true;
      if (details.computrons) {
        totalComputrons += details.computrons;
      }
      return shouldRun();
    },
    crankFailed() {
      didWork = true;
      return shouldRun();
    },
    emptyCrank() {
      didWork = true;
      return shouldRun();
    },
    shouldRun,
    getTotalComputrons() {
      return totalComputrons;
    },
    didAnyWork() {
      return didWork;
    },
  });

  let cleanups = 5;
  const stop = () => false;

  const cleanupPolicy = harden({
    ...runPolicy,
    allowCleanup() {
      if (cleanups > 0) {
        //console.log(`  cleanupPolicy.allowCleanup, ${cleanups}, returning yes`);
        return { budget: cleanups };
      } else {
        //console.log(`  cleanupPolicy.allowCleanup, ${cleanups}, returning no`);
        return false;
      }
    },
    didCleanup(spent) {
      //console.log(`   cleanupPolicy.didCleanup(${spent}), now ${cleanups}`);
      cleanups -= spent.cleanups;
      didWork = true;
      //return cleanups > 0;
      return true;
    },
  });

  return { runPolicy, cleanupPolicy };
}

async function run() {
  const args = process.argv.slice(2);
  const [swingstorefn, ...actionArgs] = args;
  const { kernelStorage, hostStorage } = openSwingStore(swingstorefn);

  async function doCommit() {
    // I once observed a SQLITE_PROTOCOL (aka "SqliteError#1: locking
    // protocol"), https://www.sqlite.org/rescode.html says this
    // connection lost a race with another transaction-starter dozens
    // of times over multiple seconds, and finally gave up. I was
    // running four sequential /usr/bin/sqlite3 commands at the same
    // time, some of which took a long time to execute.
    //
    // to ensure my test runs don't fail while I'm inspecting the DB
    // externally, this wrapper attempts the commit even more times
    let count = 0;
    while (1) {
      try {
        const start = performance.now() / 1000;
        await hostStorage.commit();
        const elapsed = performance.now() / 1000 - start
        return elapsed;
      } catch (e) {
        // note : doesn't work, run-ghost.js crashed without printing anything
        count += 1;
        if (count === 1 || count % 10 === 0) {
          console.log(`doCommit() got error, will retry forever`, e);
        }
      }
    }
  }

  upgradeSwingset(kernelStorage);
  //await hostStorage.commit();
  await doCommit();

  const dummySlog = makeDummySlogger({}, console);
  const kernelKeeper = makeKernelKeeper(kernelStorage, dummySlog);
  kernelKeeper.loadStats();
  const kq = makeKernelQueueHandler({kernelKeeper});
  const { kvStore } = kernelStorage;

  const bridgeF = await fs.createWriteStream('bridge.out');
  let toBridge;
  const registerInboundCallback = cb => toBridge = cb;
  const fakeBalance = '123456789'; // not sure what encoding this is
  function fromBridge(...args) {
    const bridgeId = args[0];
    // console.log(`--bridge output`, args);
    bridgeF.write(JSON.stringify(args));
    bridgeF.write('\n');
    // note: some bridge messages expect a return value, see
    // packages/boot/test/bootstrapTests/supports.js for a similar
    // mock
    let retval;
    let problem;
    if (bridgeId === BridgeId.BANK) {
      const { type } = args[1];
      if (type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
        problem = 'expects an address';
      } else if (type === 'VBANK_GRAB') {
        problem = 'expects { type: VBANK_BALANCE_UPDATE, nonce, updated: [] }';
      } else if (type === 'VBANK_GIVE') {
        problem = 'expects { type: VBANK_BALANCE_UPDATE, nonce, updated: [] }';
      } else if (type === 'VBANK_GET_BALANCE') {
        retval = fakeBalance; // expects a bigint
      } else {
        problem = 'expects some sort of undefined?';
      }
    } else if (bridgeId === BridgeId.STORAGE) {
      const { method } = args[1]; // also args[1].args
      // 'getStoreKey'/'get'/'children'/'entries'/'size' expect a response
      if (['getStoreKey', 'get', 'children', 'entries', 'size'].includes(method)) {
        problem = 'expects a response';
      }
      // 'set'/'setWithoutNotify'/'append' do not
    } else if ([BridgeId.CORE, BridgeId.DIBC, BridgeId.PROVISION, BridgeId.PROVISION_SMART_WALLET,
                BridgeId.WALLET].contains(bridgeId)) {
      // unknown requirements
    }
    if (problem) {
      bridgeF.write(`## note: unable to satisfy ^: ${problem}\n`);
      console.log(`## unable to satisfy ${JSON.stringify(args)}: ${problem}`);
    }
    if (retval) {
      return retval;
    }
  }

  const timerDeviceID = kvStore.get('device.name.timer');
  assert(timerDeviceID);

  let poll;
  const registerDevicePollFunction = cb => poll = cb;
  function getNextWakeup() {
    const dscd = kvStore.get(`${timerDeviceID}.deviceState`);
    //console.log(`timer state`, dscd);
    const ds = kunser(JSON.parse(dscd));
    const { deadlines } = ds;
    if (deadlines.length) {
      return deadlines[0].time;
    }
    return undefined;
  }

  const deviceEndowments = {
    bridge: { registerInboundCallback, callOutbound: fromBridge },
    timer: { registerDevicePollFunction },
  };

  const vatstoreGets = new Map(); // ${vatID}.${key} -> orig
  const vatstoreSets = new Map(); // ${vatID}.${key} -> new
  const vatstoreDeletes = new Set();

  let slogFD;
  function changeSlogfile(newFilename) {
    if (slogFD !== undefined) {
      //await slogF.close();
      fs.closeSync(slogFD);
    }
    slogFD = fs.openSync(newFilename, 'w');
    assert(slogFD >= 0);
    //slogF = await fs.createWriteStream(newFilename, { flush: true });
  }
  changeSlogfile('init.slog');

  let latestVatSyscall;
  const slogSender = timedObj => {
    const slogObj = timedObj;

    //let { time, monotime, syscallNum, activityhash, ...slogObj } = timedObj; // strip timestamps
    //if (slogObj.dr && slogObj.dr[2] && slogObj.dr[2].timestamps) {
    //  const dr = [...slogObj.dr];
    //  dr[2] = { ...dr[2], timestamps: [] };
    //  slogObj = { ...slogObj, dr };
    //}
    if (slogObj.replay) {
      // note post-upgrade v9-zoe does { start-replay, deliveries:1}, but no deliveries
      return;
    }
    const jsonObj = serializeSlogObj(slogObj);
    //slogF.write(jsonObj + '\n');
    fs.writeSync(slogFD, jsonObj + '\n');

    if (slogObj.type === 'syscall') {
      latestVatSyscall = slogObj;
      const { vatID, vsc } = slogObj;
      if (vsc[0] === 'vatstoreSet') {
        const [_, vskey, newValue] = vsc;
        const key = `${vatID}.${vskey}`;
        vatstoreSets.set(key, newValue);
      } else if (vsc[0] === 'vatstoreDelete') {
        const [_, vskey] = vsc;
        const key = `${vatID}.${vskey}`;
        vatstoreDeletes.add(key);
        vatstoreSets.delete(key);
      }
    } else if (slogObj.type === 'syscall-result') {
      const { vatID, vsr } = slogObj;
      assert.equal(vatID, latestVatSyscall.vatID);
      if (latestVatSyscall.vsc[0] === 'vatstoreGet') {
        const [_, vskey] = latestVatSyscall.vsc;
        const key = `${vatID}.${vskey}`;
        assert.equal(vsr[0], 'ok');
        const oldValue = vsr[1]; // might be null
        if (!vatstoreGets.has(key)) {
          // only record first get
          vatstoreGets.set(key, oldValue);
        }
      }
    }

  };
  //slogSender.forceFlush = async () => stream.flush();
  //slogSender.shutdown = async () => stream.close();

  const timedSlogSender = obj => {
    const time = microtime.nowDouble();
    const monotime = performance.now() / 1000;
    return slogSender({...obj, time, monotime});
  }

  const runtimeOptions = { slogSender };
  const controller = await makeSwingsetController(kernelStorage, deviceEndowments, runtimeOptions);

  console.log(`-- kernel ready to start`);
  // by not calling 'await hostStorage.commit()', we won't change the DB
  await controller.run();
  console.log(`-- kernel loaded, ready for ghost action`);
  console.log(`\n\n\n`);
  changeSlogfile('upgrade.slog');
  slogSender({ type: 'ghost-action' });
  const origWakeup = getNextWakeup();

  async function installBundle(bundleFrom) {
    const bundle = harden(await getBundle(bundleFrom));
    //console.log(`-- bundle has keys`, Object.keys(bundle));
    const bundleID = await controller.validateAndInstallBundle(bundle);
    console.log(`-- ID is ${bundleID}`);
    return bundleID;
  }

  const action = actionArgs.shift();

  if (action === 'timer') {
    assert(origWakeup);
    console.log(`## triggering next wakeup`);
    poll(getNextWakeup());

  } else if (action === 'disconnect-promise') {
    const kpid = actionArgs.shift();
    const p = kernelKeeper.getKernelPromise(kpid);
    const { state, decider } = p;
    if (state !== 'unresolved') {
      throw Error(`kpid ${kpid} is in state ${state}, needs to be 'unresolved'`);
    }
    const upgradeMessage = 'vat upgraded';
    const cancel = { name: 'vatUpgraded', upgradeMessage, incarnationNumber: 2 };
    const resolutions = [ [kpid, true, kser(cancel)] ];
    kq.doResolve(decider, resolutions);

  } else if (action === 'restart-contract') {
    const vatID = actionArgs.shift();
    assert(vatID);
    let zcfBundleID, contractBundleID;
    if (actionArgs[0] === '--zcf-bundle-from') {
      actionArgs.shift();
      zcfBundleID = await installBundle(actionArgs.shift());
    }
    if (actionArgs[0] === '--contract-bundle-from') {
      actionArgs.shift();
      contractBundleID = await installBundle(actionArgs.shift());
      // const kpid = controller.queueToKref
    }
    const options = { zcfBundleID, contractBundleID };
    const ev = buildContractVatUpgrade(kernelStorage, vatID, options);
    enqueue(kernelStorage, ev);

  } else if (action === 'restart-vat') {
    const vatID = actionArgs.shift();
    assert(vatID);
    let bundleID;
    if (actionArgs[0] === '--bundle-from') {
      actionArgs.shift();
      bundleID = await installBundle(actionArgs.shift());
    }
    const options = { bundleID };
    const ev = buildVatUpgrade(kernelStorage, vatID, options);
    enqueue(kernelStorage, ev);

  } else if (action === 'terminate-vat') {
    const vatID = actionArgs.shift();
    assert(vatID);
    controller.terminateVat(vatID, kser('ghost terminate-vat'));

  } else if (action === 'resubmit') {
    // 10503734 : vaults: sell USDC_axl to buy IST, aka makeWantMintedInvitation
    const blockNum = Number(actionArgs.shift());
    console.log(`## extracting wallet action from mezzanine DB at block ${blockNum}`);
    const mezdb = sqlite3('mezzanine.sqlite');
    // we don't commit anything; this transaction remains empty
    mezdb.prepare('BEGIN TRANSACTION').run();
    const action = extract(mezdb, blockNum);
    console.log(action);
    const { target, method, args } = action;
    // queueToKref uses kser, but we share the module-level 'refMap' with them
    kq.queueToKref(target, method, args);
    mezdb.close(); // abort the txn, just in case something was written

  } else if (action === 'gov') {
    // e.g. the stATOM gov55 from block 12,126,509
    //   agd query gov proposal 55 -o json >gov55.proposal
    //   node run-ghost.js swingstore.sqlite gov gov55.proposal
    // .content = { '@type', title, description, evals }
    // evals = [ { json_permits, json_code } ]  (length=2)
    const fn = actionArgs.shift();
    const gov_data = fs.readFileSync(fn);
    const gov = JSON.parse(gov_data);
    assert.equal(gov.content['@type'], '/agoric.swingset.CoreEvalProposal');
    const evals = gov.content.evals;
    const type = 'CORE_EVAL';

    // fake the height/time
    const blockHeight = hostStorage.kvStore.get('height') + 1;
    const blockTime = Number(origWakeup) + 1;

    // send v10-bridge a E(ko62).inbound('core', { blockHeight, blockTime, evals: [] })
    // note: evals.length = 2
    kq.queueToKref('ko62', 'inbound', ['core', { blockHeight, blockTime, evals, type } ]);
    console.log(`-- queued CORE_EVAL (${evals.length} evals)`);

  } else {
    console.log(`unknown action:`, action, `try one of:`);
    console.log(` timer : trigger the next scheduled timer wakeup`);
    console.log(` disconnect-promise KPID : disconnect/reject (vatUpgraded) a single promise`);
    console.log(` restart-contract VATID [--zcf-bundle-from ENTRYFN] [--contract-bundle-from ENTRYFN]`);
    console.log(`                  : (null-)upgrade a contract`);
    console.log(` restart-vat VATID [--bundle-from ENTRYFN] : (null-)upgrade a vat`);
    console.log(` resubmit BLOCKNUM : resubmit a bridge message from the block (requires mezzanine.sqlite)`)
    console.log(` gov PROPOSALFN : activate a core-eval governance proposal from contents in FN`);
    console.log();
    return controller.shutdown();
  }

  console.log(`-- triggering ghost action`);
  timedSlogSender({ type: 'ghost-action-start' });
  const { runPolicy } = makeRunPolicies();
  await controller.run(runPolicy);
  timedSlogSender({ type: 'ghost-action-finish', didWork: runPolicy.didAnyWork() });
  console.log(`-- ghost action done, didWork=${runPolicy.didAnyWork()}`);

  //await hostStorage.commit();
  await doCommit();
  changeSlogfile('cleanup.slog');
  //return controller.shutdown();
  
  console.log(`-- starting cleanup`);
  timedSlogSender({ type: 'ghost-cleanup-start' });
  let run = 0;
  while (1) {
    run++;
    console.log(`  cleanup run ${run}`);
    timedSlogSender({ type: 'ghost-cleanup-run-start', run });
    const { cleanupPolicy } = makeRunPolicies();
    await controller.run(cleanupPolicy);
    const didWork = cleanupPolicy.didAnyWork();
    timedSlogSender({ type: 'ghost-cleanup-run-finish', run, didWork });
    const elapsed = await doCommit();
    slogSender({type: 'commit', elapsed });
    if (!didWork) {
      console.log(`-- ghost cleanup done, runs=${run}`);
      break;
    }
    //await hostStorage.commit();
  }
  console.log(`-- cleanup done`);
  timedSlogSender({ type: 'ghost-cleanup-start', runs: run });

  //console.log(`-- controller.reapAllVats()`);
  //timedSlogSender({ type: 'ghost-reap-all-start' });
  //controller.reapAllVats();
  //await controller.run();
  //timedSlogSender({ type: 'ghost-reap-all-finish' });
  //console.log(`-- reapAllVats done`);

  const nextWakeup = getNextWakeup();
  if (nextWakeup !== origWakeup) {
    console.log(`-- orig wakeup:`, origWakeup);
    console.log(`-- next wakeup:`, nextWakeup);
  } else {
    console.log(`-- timer wakeup unchanged`);
  }

  await controller.shutdown();
  console.log(`\n`);
  let keys = new Set(vatstoreDeletes.keys());
  for (const key of vatstoreSets.keys()) {
    keys.add(key);
  }
  keys = Array.from(keys).sort();
  for (const key of keys) {
    if (vatstoreDeletes.has(key)) {
      console.log(`## ${key} DELETED`);
      continue;
    }
    assert(vatstoreSets.has(key));
    const newValue = vatstoreSets.get(key);
    const oldValue = vatstoreGets.get(key); // undefined if never read, null if read but missing
    if (oldValue !== newValue) {
      if (oldValue === null) {
        console.log(`## ${key} CREATED: ${newValue}`);
        continue;
      }
      if (oldValue === undefined) {
        console.log(`## ${key} WROTE (no read): ${newValue}`);
        continue;
      }
      if (key.includes('.vom.rc.')) {
        continue; // boring refcounts
      }
      console.log(`## ${key}`);
      if (key.includes('.vom.o+')) {
        // parse the state.* properties and show only the changed ones
        const oldState = JSON.parse(oldValue);
        const newState = JSON.parse(newValue);
        //console.log(`oldValue:`, oldValue);
        //console.log(`newValue:`, newValue);

        const stateKeys = new Set(Object.keys(oldState));
        Object.keys(newState).forEach(nk => stateKeys.add(nk));
        for (const stateKey of Array.from(stateKeys).sort()) {
          const oldStateValue = oldState[stateKey]; // { body, slots } or undefined
          const newStateValue = newState[stateKey]; // { body, slots } or undefined
          const oldStateValueJSON = JSON.stringify(oldStateValue);
          const newStateValueJSON = JSON.stringify(newStateValue);
          if (oldStateValueJSON !== newStateValueJSON) {
            console.log(` - state.${stateKey}:`)
            console.log(`   old: body: "${oldStateValue.body}"   slots: ${oldStateValue.slots.join(',')}`);
            console.log(`   new: body: "${newStateValue.body}"   slots: ${newStateValue.slots.join(',')}`);
          }
        }
      } else {
        // generic
        console.log(` old: `, oldValue);
        console.log(` new: `, newValue);
      }
    }
  }
}

run().catch(err => console.log('err', err));

    //enqueueContractVatUpgrade(kernelStorage, 'v57'); // voteCounter: lacks 'prepare'
    //enqueueContractVatUpgrade(kernelStorage, 'v47'); // vaultFactory.governor : doesn't fail
    //enqueueContractVatUpgrade(kernelStorage, 'v44'); // auctioneer.governor : doesn't fail
    //enqueueContractVatUpgrade(kernelStorage, 'v36'); // reserve: Object.keys invalid object
    // in assetReserve.js 43: maybe privateArgs=undefined?

// v45-auctioneer
