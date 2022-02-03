/* global WeakRef FinalizationRegistry */
import fs from 'fs';
// import '@endo/init';
import '../tools/install-ses-debug.js';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';
import { spawn } from 'child_process';
import bundleSource from '@endo/bundle-source';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent.js';
import { makeStartXSnap } from '../src/controller.js';
import { makeXsSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-xsnap.js';
import { makeLocalVatManagerFactory } from '../src/kernel/vatManager/manager-local.js';
import { makeNodeSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-node.js';
import { startSubprocessWorker } from '../src/spawnSubprocessWorker.js';
import { requireIdentical } from '../src/kernel/vatManager/transcript.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeGcAndFinalize } from '../src/gc-and-finalize.js';
import engineGC from '../src/engine-gc.js';

async function makeBundles() {
  const srcGE = rel =>
    bundleSource(new URL(rel, import.meta.url).pathname, 'getExport');
  const lockdown = await srcGE(
    '../src/kernel/vatManager/lockdown-subprocess-xsnap.js',
  );
  const supervisor = await srcGE(
    '../src/kernel/vatManager/supervisor-subprocess-xsnap.js',
  );
  fs.writeFileSync('lockdown-bundle', JSON.stringify(lockdown));
  fs.writeFileSync('supervisor-bundle', JSON.stringify(supervisor));
  console.log(`xs bundles written`);
}

function compareSyscalls(vatID, originalSyscall, newSyscall) {
  const error = requireIdentical(vatID, originalSyscall, newSyscall);
  if (
    error &&
    JSON.stringify(originalSyscall).indexOf('error:liveSlots') !== -1
  ) {
    return undefined; // Errors are serialized differently, sometimes
  }
  return error;
}

// relative timings:
// 3.8s v8-false, 27.5s v8-gc
// 10.8s xs-no-gc, 15s xs-gc
const worker = 'xs-worker';
const gcEveryCrank = false;

async function replay(transcriptFile) {
  let vatID; // we learn this from the first line of the transcript
  let factory;

  const fakeKernelKeeper = {
    provideVatKeeper: _vatID => ({
      addToTranscript: () => undefined,
      getLastSnapshot: () => undefined,
    }),
  };
  const kernelSlog = { write() {} };
  const testLog = undefined;
  const meterControl = makeDummyMeterControl();
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(gcEveryCrank ? engineGC : false),
    meterControl,
  });
  const allVatPowers = { testLog };

  if (worker === 'xs-worker') {
    // disable to save a few seconds and rely upon the saved versions instead
    // eslint-disable-next-line no-constant-condition
    if (1) {
      console.log(`creating xsnap helper bundles`);
      await makeBundles();
      console.log(`xsnap helper bundles created`);
    }
    const bundles = [
      JSON.parse(fs.readFileSync('lockdown-bundle')),
      JSON.parse(fs.readFileSync('supervisor-bundle')),
    ];
    const snapstorePath = undefined;
    const env = {};
    const startXSnap = makeStartXSnap(bundles, { snapstorePath, env, spawn });
    factory = makeXsSubprocessFactory({
      kernelKeeper: fakeKernelKeeper,
      kernelSlog,
      startXSnap,
      testLog,
    });
  } else if (worker === 'local') {
    factory = makeLocalVatManagerFactory({
      allVatPowers,
      kernelKeeper: fakeKernelKeeper,
      vatEndowments: {},
      gcTools,
      kernelSlog,
    });
  } else if (worker === 'node-subprocess') {
    // this worker type cannot do blocking syscalls like vatstoreGet, so it's
    // kind of useless for vats that use virtual objects
    function startSubprocessWorkerNode() {
      const supercode = new URL(
        '../src/kernel/vatManager/supervisor-subprocess-node.js',
        import.meta.url,
      ).pathname;
      return startSubprocessWorker(process.execPath, ['-r', 'esm', supercode]);
    }
    factory = makeNodeSubprocessFactory({
      startSubprocessWorker: startSubprocessWorkerNode,
      kernelKeeper: fakeKernelKeeper,
      kernelSlog,
      testLog,
    });
  } else {
    throw Error(`unhandled worker type ${worker}`);
  }

  let manager;

  let transcriptF = fs.createReadStream(transcriptFile);
  if (transcriptFile.endsWith('.gz')) {
    transcriptF = transcriptF.pipe(zlib.createGunzip());
  }
  const lines = readline.createInterface({ input: transcriptF });
  let lineNumber = 1;
  for await (const line of lines) {
    if (lineNumber % 1000 === 0) {
      console.log(` (slog line ${lineNumber})`);
    }
    lineNumber += 1;
    const data = JSON.parse(line);
    if (!manager) {
      if (data.type !== 'create-vat') {
        throw Error(`first line of transcript was not a create-vat`);
      }
      const { vatParameters, vatSourceBundle } = data;
      vatID = data.vatID;
      const managerOptions = {
        vatConsole: console,
        vatParameters,
        compareSyscalls,
        useTranscript: true,
        gcEveryCrank,
      };
      const vatSyscallHandler = undefined;
      manager = await factory.createFromBundle(
        vatID,
        vatSourceBundle,
        managerOptions,
        vatSyscallHandler,
      );
      console.log(`manager created`);
    } else {
      const { d: delivery, syscalls } = data;
      // syscalls = [{ d, response }, ..]
      // console.log(`replaying:`);
      console.log(
        `delivery ${lineNumber}:`,
        JSON.stringify(delivery).slice(0, 200),
      );
      // for (const s of syscalls) {
      //   s.response = 'nope';
      //   console.log(` syscall:`, s.d, s.response);
      // }
      await manager.replayOneDelivery(delivery, syscalls);
      // console.log(`dr`, dr);
    }
  }

  lines.close();
  if (manager) {
    await manager.shutdown();
  }
}

async function run() {
  const args = process.argv.slice(2);
  console.log(`argv`, args);
  if (args.length < 1) {
    console.log(`replay-one-vat.js transcript.sst`);
    return;
  }
  const [transcriptFile] = args;
  console.log(`using transcript ${transcriptFile}`);
  await replay(transcriptFile);
}

run().catch(err => console.log('RUN ERR', err));
