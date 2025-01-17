// @ts-nocheck
/* eslint-disable */
import '@endo/init';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import bundleSource from '@endo/bundle-source';
import { getLockdownBundle } from '@agoric/xsnap-lockdown';
import { spawn } from 'child_process';
import { xsnap, recordXSnap } from '@agoric/xsnap';
import { type as osType } from 'os';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`run-in-xs.js entrypoint.js`);
    return;
  }
  const entrypoint = args[0];
  // const bundle = await bundleSource(entrypoint);

  const srcGE = rel =>
    bundleSource(new URL(rel, import.meta.url).pathname, 'getExport');
  const lockdown = await getLockdownBundle();
  const supervisor = await srcGE('./run-in-xs-supervisor.js');
  const xsnapOpts = {
    os: osType(),
    spawn,
    stdout: 'inherit',
    stderr: 'inherit',
    debug: false,
  };
  const name = 'worker';

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  async function handleCommand(msg) {
    // parentLog('handleCommand', { length: msg.byteLength });
    // const tagged = handleUpstream(JSON.parse(decoder.decode(msg)));
    console.log(`worker:`, decoder.decode(msg));
    const tagged = [];
    return encoder.encode(JSON.stringify(tagged));
  }

  const worker = xsnap({ handleCommand, name, meteringLimit: 0, ...xsnapOpts });
  await worker.evaluate(`(${lockdown.source}\n)()`.trim());
  await worker.evaluate(`(${supervisor.source}\n)()`.trim());

  // const result = await worker.issueStringCommand(JSON.stringify(['command']))

  console.log(`closing worker`);
  await worker.close().then(_ => undefined);
}

run();
