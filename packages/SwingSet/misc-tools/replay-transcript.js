/* global WeakRef FinalizationRegistry */
// import '@agoric/install-ses';
import '../tools/install-ses-debug.js';
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';
import { spawn } from 'child_process';
import bundleSource from '@agoric/bundle-source';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent.js';
import { makeStartXSnap } from '../src/controller.js';
import { makeXsSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-xsnap.js';
import { makeLocalVatManagerFactory } from '../src/kernel/vatManager/manager-local.js';
import { makeNodeSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-node.js';
import { startSubprocessWorker } from '../src/spawnSubprocessWorker.js';
import { requireIdentical } from '../src/kernel/vatManager/transcript.js';

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

async function replay(transcriptFile, worker = 'xs-worker') {
  let vatID; // we learn this from the first line of the transcript
  let factory;

  const fakeKernelKeeper = {
    provideVatKeeper: _vatID => ({
      addToTranscript: () => undefined,
    }),
  };
  const kernelSlog = { write() {} };
  const testLog = undefined;
  const gcTools = { WeakRef, FinalizationRegistry, waitUntilQuiescent };
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
  if (args.length < 2) {
    console.log(`replay-one-vat.js transcript.sst`);
  }
  const [transcriptFile] = args;
  console.log(`using transcript ${transcriptFile}`);
  await replay(transcriptFile, 'local');
}

run().catch(err => console.log('RUN ERR', err));
