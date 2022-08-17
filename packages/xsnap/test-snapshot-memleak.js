/* global setTimeout, WeakRef, setImmediate, process */
// @ts-check

import '@endo/init/debug.js';

import * as proc from 'child_process';
import * as os from 'os';
import fs, { unlinkSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';

import { xsnap } from './src/xsnap.js';

import { options, decode, encode, loader } from './test/message-tools.js';

let pid;

function spawn(...args) {
  const worker = proc.spawn(...args);
  pid = worker.pid;
  return worker;
}

const io = { spawn, os: os.type() }; // WARNING: ambient
const ld = loader(import.meta.url);

function memsize(pid) {
  const status = fs.readFileSync(`/proc/${pid}/status`);
  //console.log(status.toString());
  const vmsize = Number(/VmSize:\s+(\d+) kB/.exec(status)[1]) * 1024;
  const rss = Number(/VmRSS:\s+(\d+) kB/.exec(status)[1]) * 1024;
  return { vmsize, rss };
}

async function run() {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decode(message));
    return new Uint8Array();
  }

  const vat0 = xsnap({ ...options(io), handleCommand });
  console.log(`--pid`, pid);

  // populate the memory image a bit
  let str = 'Hello, World!';
  str = str+str+str+str;
  // str = str+str+str+str; // etc
  await vat0.evaluate('\nglobalThis.hello = "' + str + '";\n');

  const num_globals = 10; // try 1000 too
  for (let i = 0; i < num_globals; i++) {
    await vat0.evaluate('\nglobalThis.hello' + i + ' = "' + str + '";\n');
  }

  const COUNT = 2000;
  // get past any initial allocations that skew the rate
  await vat0.snapshot('memleak-snapshot.xss');
  await vat0.snapshot('memleak-snapshot.xss');
  await vat0.snapshot('memleak-snapshot.xss');
  const { vmsize: first_vmsize, rss: first_rss } = memsize(pid);

  for (let i = 0; i <= COUNT; i++) {
    await vat0.snapshot('memleak-snapshot.xss');
    const { vmsize, rss } = memsize(pid);
    // VmSize seems to start at 1 GB, for some reason. RSS is like 44 MB
    //console.log(vmsize);
    if (i === COUNT) {
      const vm_rate = Math.floor((vmsize - first_vmsize) / COUNT);
      console.log(`vmsize leak rate: ${vm_rate} bytes/snapshot`);
      const rss_rate = Math.floor((rss - first_rss) / COUNT);
      console.log(`rsssize leak rate: ${rss_rate} bytes/snapshot`);
      console.log(`str.length ${str.length}`);
      console.log(`num_globals ${num_globals}`);
      // leak of both seems to be about (30 kB + num_globals) per snapshot write
      break;
    }
    if (vmsize > 2_000_000_000) {
      console.log(`quitting before we kill the host`);
      break;
    }
  }
  await vat0.close();
}

run().catch(e => console.log(e));
