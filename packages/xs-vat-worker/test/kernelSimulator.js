// Usage: node -r esm kernelSimulator.js
// context: https://github.com/Agoric/agoric-sdk/issues/1299
import '@agoric/install-ses';

import { readNetstring, writeNetstring } from '../src/netstring';

const INFD = 3;
const OUTFD = 4;

function options(env) {
  return {
    vat1: env.VAT1 || 'vat-target.js',
    transcript: env.TRANSCRIPT || 'transcript.txt',
    workerBin: env.WORKERBIN || './build/bin/lin/release/xs-vat-worker',
  };
}

function makeWorker(child) {
  const format = obj => JSON.stringify(obj);
  const send = obj => writeNetstring(child.stdio[INFD], format(obj));

  child.stdio[OUTFD].pause();

  const expect = async msgtype => {
    const txt = await readNetstring(child.stdio[OUTFD]);
    let msg;
    try {
      msg = JSON.parse(txt);
    } catch (badJSON) {
      console.error('bad JSON ', txt.length, ' chars: [', txt, ']', badJSON);
      throw badJSON;
    }
    if (msg.msgtype !== msgtype) {
      throw new Error(`expected ${msgtype}; found: ${msg.msgtype}; error: ${msg.error} [${JSON.stringify(msg)}]`);
    }
    return msg;
  };

  return harden({
    async loadVat(bundle) {
      await send({ msgtype: 'load-bundle', bundle });
      return expect('load-bundle-ack');
    },
    async dispatch({ d, syscalls, _crankNumber }) {
      await send({ msgtype: 'dispatch', type: d[0], args: d.slice(1) });
      for (const syscall of syscalls) {
        // eslint-disable-next-line no-await-in-loop
        const request = await expect('syscall');
        console.log('syscall request', request);
        // eslint-disable-next-line no-await-in-loop
        await send({ msgtype: 'syscall-ack', response: syscall.response });
      }
      return expect('dispatch-ack');
    },
    async finish() {
      await send({ msgtype: 'finish' });
      await expect('finish-ack');
    },
  });
}

async function runTranscript(w1, bundle, transcript) {
  await w1.loadVat(bundle);
  console.log('loadVat done.');

  const events = transcript.split('\n');

  while (events.length > 0) {
    const event = events.shift();
    if (!event) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const found = event.match(/^(?<id>[^ ]+) :: (?<payload>.*)/);
    if (!found) {
      console.log('unexpected transcript format', { line: event });
      // eslint-disable-next-line no-continue
      continue;
    }
    const { id, payload } = found.groups;

    const obj = JSON.parse(payload);
    if (typeof obj !== 'object') {
      console.log('not a dispatch event', id, obj);
      // eslint-disable-next-line no-continue
      continue;
    }
    console.log('dispatching:', id);
    // eslint-disable-next-line no-await-in-loop
    await w1.dispatch(obj);
    console.log('dispatch done:', id);
  }

  await w1.finish();
  console.log('END OF TRANSCRIPT.');
}

// eslint-disable-next-line no-shadow
export async function main(argv, { env, io, bundleSource, spawn }) {
  const { vat1, transcript, workerBin } = options(env);

  const bundle = await bundleSource(vat1);

  console.log('spawning', { workerBin });
  const child = await spawn(workerBin, [], {
    stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe'],
  });
  child.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error('unexpected exit:', { code, signal });
    }
  });
  const w1 = makeWorker(child);

  const text = await io.readFile(transcript, 'utf-8');
  await runTranscript(w1, bundle, text);
}

if (require.main === module) {
  main(process.argv, {
    env: process.env,
    // eslint-disable-next-line global-require
    io: {
      // eslint-disable-next-line global-require
      readFile: require('fs').promises.readFile,
    },
    // eslint-disable-next-line global-require
    bundleSource: require('@agoric/bundle-source').default,
    // eslint-disable-next-line global-require
    spawn: require('child_process').spawn,
  }).catch(err => {
    console.error(err);
  });
}
