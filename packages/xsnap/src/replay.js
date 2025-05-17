/**
 * Replay usage:
 *   node replay.js <folder>...
 *
 * In case of more than one folder:
 *  1. Spawn based on 00000-options.json in the first folder
 *  2. For all folders but the last,
 *     replay steps 00001 to the first snapshot step.
 *  3. For the last folder, play steps 00001 to last.
 */
import childProcessPowers from 'child_process';
import osPowers from 'os';
import fsPowers from 'fs';
import { Readable } from 'stream';
import { tmpName as tmpNamePower } from 'tmp';
import { fileURLToPath } from 'url';
import { makeQueue } from '@endo/stream';
import { xsnap, DEFAULT_CRANK_METERING_LIMIT } from './xsnap.js';

const { freeze } = Object;

const encoder = new TextEncoder();

/** @param {number} n */
const pad5 = n => `${n}`.padStart(5, '0');

/** @param {string | undefined} description */
const filenameFromDescription = description =>
  `${(description || 'unknown').replaceAll(/[^a-zA-Z0-9_.-]/g, '-')}.xss`;

/**
 * @param {string} path
 * @param {{ writeFileSync: typeof import('fs').writeFileSync }} io
 */
function makeSyncStorage(path, { writeFileSync }) {
  const base = new URL(path, 'file://');
  return freeze({
    /** @param {string} fn */
    file: fn => {
      /** @param {Uint8Array} data */
      const put = data =>
        writeFileSync(fileURLToPath(new URL(fn, base)), data, {
          flag: 'wx',
        });

      return freeze({
        put,
        /** @param {string} txt */
        putText: txt => put(encoder.encode(txt)),
      });
    },
  });
}

/**
 * @param {string} path
 * @param {{
 *   readdirSync: typeof import('fs').readdirSync,
 *   readFileSync: typeof import('fs').readFileSync,
 * }} io
 */
function makeSyncAccess(path, { readdirSync, readFileSync }) {
  const base = new URL(path, 'file://');
  /** @param {string} fn */
  const file = fn => {
    const fullname = fileURLToPath(new URL(fn, base));

    return freeze({
      getData: () => readFileSync(fullname),
      getText: () => readFileSync(fullname, 'utf-8'),
    });
  };
  return freeze({
    path,
    file,
    readdir: () => readdirSync(fileURLToPath(base)),
  });
}

/**
 * Start an xsnap subprocess controller that records data
 * flowing to it for replay.
 *
 * @param {XSnapOptions} options used
 *        to create the underlying xsnap subprocess. Note that
 *        options.handleCommand is wrapped in order to capture
 *        data sent to the process.
 * @param {string} folderPath where to store files of the form
 *        00000-options.json
 *        00001-evaluate.dat
 *        00002-issueCommand.dat
 *        00003-reply.dat
 * @param {{
 *   writeFileSync: typeof import('fs').writeFileSync,
 * }} io
 * @returns {XSnap}
 *
 * @typedef {ReturnType <typeof import('./xsnap.js').xsnap>} XSnap
 * @typedef { import('./xsnap.js').XSnapOptions } XSnapOptions
 */
export async function recordXSnap(options, folderPath, { writeFileSync }) {
  const folder = makeSyncStorage(folderPath, { writeFileSync });

  let ix = 0;

  /**
   * @param {string} kind
   * @param {string} [ext]
   */
  const nextFile = (kind, ext = 'dat') => {
    const fn = `${pad5(ix)}-${kind}.${ext}`;
    ix += 1;

    return folder.file(fn);
  };

  const { handleCommand: handle = msg => msg } = options;

  /** @param { Uint8Array} msg */
  async function handleCommand(msg) {
    nextFile('command').put(msg);
    const result = await handle(msg);
    nextFile('reply').put(result);
    return result;
  }

  const {
    os,
    name = '_replay_',
    debug = false,
    parserBufferSize = undefined,
    snapshotStream,
    snapshotDescription,
    meteringLimit = DEFAULT_CRANK_METERING_LIMIT,
  } = options;
  nextFile('options', 'json').putText(
    JSON.stringify({
      os,
      name,
      debug,
      parserBufferSize,
      snapshot: snapshotStream && filenameFromDescription(snapshotDescription),
      meteringLimit,
    }),
  );

  const it = await xsnap({ ...options, handleCommand });

  return freeze({
    name: it.name,
    isReady: async () => {
      nextFile('isReady').putText('');
      return it.isReady();
    },
    /** @param {Uint8Array} msg */
    issueCommand: async msg => {
      nextFile('issueCommand').put(msg);
      return it.issueCommand(msg);
    },
    issueStringCommand: async str => {
      nextFile('issueCommand').putText(str);
      return it.issueStringCommand(str);
    },
    close: it.close,
    terminate: it.terminate,
    evaluate: async code => {
      nextFile('evaluate').putText(code);
      return it.evaluate(code);
    },
    execute: async _fileName => {
      throw Error('recording: execute not supported');
    },
    import: async _fileName => {
      throw Error('recording: import not supported');
    },
    makeSnapshotStream(description) {
      nextFile('snapshot').putText(filenameFromDescription(description));
      return it.makeSnapshotStream(description);
    },
  });
}

/**
 * Replay an xsnap subprocess from one or more folders of steps.
 *
 * @param {XSnapOptions} opts
 * @param {string[]} folders
 * @param {{
 *   readdirSync: typeof import('fs').readdirSync,
 *   readFileSync: typeof import('fs').readFileSync,
 * }} io
 */
export async function replayXSnap(
  opts,
  folders,
  { readdirSync, readFileSync },
) {
  const replies = makeQueue();
  async function handleCommand(_msg) {
    const r = await replies.get();
    // console.log('handleCommand', { r: decode(r), msg: decode(msg) });
    return r;
  }

  /** @param {string} folder */
  async function start(folder) {
    const rd = makeSyncAccess(folder, { readdirSync, readFileSync });
    const [optionsFn] = rd.readdir();
    const storedOpts = JSON.parse(rd.file(optionsFn).getText());
    console.log(folder, optionsFn, ':', storedOpts);
    const { os } = opts; // override stored os
    const { snapshot: snapshotFile } = storedOpts;
    const snapshot =
      snapshotFile && Readable.from(rd.file(snapshotFile).getData());
    return xsnap({ ...opts, ...storedOpts, os, snapshot, handleCommand });
  }

  let running;
  const done = [];
  const it = await start(folders[0]);

  /**
   * @param {ReturnType<typeof makeSyncAccess>} rd
   * @param {string[]} steps
   */
  async function runSteps(rd, steps) {
    const folder = rd.path;
    for await (const step of steps) {
      const parts = step.match(/(\d+)-([a-zA-Z]+)\.(dat|json)$/);
      if (!parts) {
        throw Error(`expected 0001-abc.dat; got: ${step}`);
      }
      const [_match, digits, kind] = parts;
      const seq = parseInt(digits, 10);
      console.log(folder, seq, kind);
      if (running && !['command', 'reply'].includes(kind)) {
        await running;
        running = undefined;
      }
      const file = rd.file(step);
      switch (kind) {
        case 'isReady':
          await it.isReady();
          break;
        case 'evaluate':
          running = it.evaluate(file.getText());
          break;
        case 'issueCommand':
          running = it.issueCommand(file.getData());
          break;
        case 'command':
          // ignore; we already know how to reply
          break;
        case 'reply':
          replies.put(file.getData());
          break;
        case 'snapshot':
          if (folders.length > 1 && folder !== folders.slice(-1)[0]) {
            console.log(folder, step, 'ignoring remaining steps from', folder);
            return;
          } else {
            await (async () => {
              const snapshotPath = file.getText();
              const snapFile = await opts.fs.open(snapshotPath, 'w');
              await snapFile.writeFile(
                // @ts-expect-error incorrect typings, does accept AsyncIterable
                it.makeSnapshotStream(snapshotPath),
              );
              await snapFile.close();
            })().catch(err => {
              console.warn('error while taking snapshot:', err);
            });
          }
          break;
        default:
          console.log(`bad kind: ${kind}`);
          throw RangeError(`bad kind: ${kind}`);
      }
      done.push([folder, seq, kind]);
    }
  }

  for await (const folder of folders) {
    const rd = makeSyncAccess(folder, { readdirSync, readFileSync });

    const [optionsFn, ...steps] = rd.readdir();
    if (folder !== folders[0]) {
      const storedOpts = JSON.parse(rd.file(optionsFn).getText());
      console.log(folder, optionsFn, 'already spawned; ignoring:', storedOpts);
    }
    await runSteps(rd, steps);
  }

  await it.close();
  return done;
}

/**
 *
 * @param {string[]} argv
 * @param {{
 *   spawn: typeof import('child_process').spawn,
 *   fs: Omit<import('./xsnap.js').XSnapOptions['fs'], 'tmpName'>,
 *   tmpName: import('tmp')['tmpName'],
 *   osType: typeof import('os').type,
 *   readdirSync: typeof import('fs').readdirSync,
 *   readFileSync: typeof import('fs').readFileSync,
 * }} io
 */
export async function main(
  argv,
  { spawn, fs, tmpName, osType, readdirSync, readFileSync },
) {
  const folders = argv;
  if (!folders) {
    throw Error(`usage: replay folder...`);
  }
  /** @type { import('./xsnap.js').XSnapOptions } */
  const options = {
    spawn,
    fs: { ...fs, tmpName },
    os: osType(),
    stdout: 'inherit',
    stderr: 'inherit',
  };
  await replayXSnap(options, folders, { readdirSync, readFileSync });
}

/* eslint-env node */
if (process.argv[1] === fileURLToPath(new URL(import.meta.url))) {
  main([...process.argv.slice(2)], {
    spawn: childProcessPowers.spawn,
    fs: { ...fsPowers, ...fsPowers.promises },
    tmpName: tmpNamePower,
    osType: osPowers.type,
    readdirSync: fsPowers.readdirSync,
    readFileSync: fsPowers.readFileSync,
  }).catch(err => {
    console.error(err);
    process.exit(err.code || 1);
  });
}
