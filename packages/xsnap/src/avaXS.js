/* avaXS - ava style test runner for XS

Usage:

  node -r esm avaXS.js [--debug] test-*.js

*/

// @ts-check

/* eslint-disable no-await-in-loop */
import '@agoric/install-ses';
import { xsnap } from './xsnap';

// scripts for use in xsnap subprocesses
const SESboot = `../dist/bundle-ses-boot.umd.js`;
const avaAssert = `./avaAssertXS.js`;
const avaHandler = `./avaHandler.js`;

const importMetaUrl = `file://${__filename}`;
/** @type { (ref: string, readFile: typeof import('fs').promises.readFile ) => Promise<string> } */
const asset = (ref, readFile) =>
  readFile(new URL(ref, importMetaUrl).pathname, 'utf8');

/**
 * When we bundle test scripts, we leave these externals
 * as `require(...)` style graph exits and (in avaHandler.js)
 * supply them via a `require` endowment
 * on the Compartment used to run the script.
 */
const externals = [
  'ava',
  '@agoric/bundle-source',
  '@agoric/install-ses',
  '@agoric/install-metering-and-ses',
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Run one test script in an xsnap subprocess.
 *
 * The subprocess reports back once for each test assertion.
 *
 * @typedef {{ id?: number, status: Status, message?: string }
 *         | { plan: number}
 *         | { note: string, label?: string }
 * } TapMessage
 *
 * It also calls back if a test calls `bundleSource`.
 *
 * @typedef {{ moduleFormat: string, source: string }} Bundle
 *
 * And finally it reports back a summary of assertion results.
 *
 * @typedef {{
 *   pass: number,
 *   fail: number,
 *   total: number,
 * }} Summary
 *
 * @param { string } filename
 * @param { string[] } preamble scripts to run in XS start compartment
 * @param { boolean } verbose
 * @param {{
 *   spawnXSnap: (opts: object) => XSnap,
 *   bundleSource: (...args: [string, ...unknown[]]) => Promise<Bundle>,
 *   resolve: typeof import('path').resolve,
 *   dirname: typeof import('path').dirname,
 * }} io
 * @returns {Promise<{
 *   qty: number,
 *   byStatus: Record<Status, number>
 * }>} quantity of tests run and breakdown by status
 *
 * @typedef { 'ok' | 'not ok' | 'SKIP' } Status
 * @typedef {ReturnType<typeof import('./xsnap').xsnap>} XSnap
 */
async function runTestScript(
  filename,
  preamble,
  verbose,
  { spawnXSnap, bundleSource, resolve, dirname },
) {
  const testBundle = await bundleSource(filename, 'getExport', { externals });

  let qty = 0;
  const byStatus = { ok: 0, 'not ok': 0, SKIP: 0 };
  let label = '';

  /**
   * Handle callback "command" from xsnap subprocess.
   *
   * @type { (msg: ArrayBuffer) => Promise<ArrayBuffer> }
   */
  async function handleCommand(message) {
    /**
     * See also send() in avaHandler.js
     *
     * @type { TapMessage | { bundleSource: [string, ...unknown[]] } | Summary }
     */
    const msg = JSON.parse(decoder.decode(message));
    // console.log(input, msg, qty, byStatus);

    if ('bundleSource' in msg) {
      const [startFilename, ...rest] = msg.bundleSource;
      const bundle = await bundleSource(startFilename, ...rest);
      return encoder.encode(JSON.stringify(bundle));
    }

    if ('label' in msg) {
      label = msg.label || label;
      if (verbose) {
        console.log(`${filename}: ${msg.label} ${msg.note}`);
      }
    }
    if ('status' in msg) {
      byStatus[msg.status] += 1;
      qty += 1;
      if (msg.status === 'not ok') {
        console.warn({ ...msg, filename, label });
      }
    }
    return encoder.encode('null');
  }

  // ISSUE: only works in one file / dir
  const literal = JSON.stringify;
  const testPath = resolve(filename);
  const pathGlobalsKludge = `
    globalThis.__filename = ${literal(testPath)};
    globalThis.__dirname = ${literal(dirname(testPath))};
   `;

  const worker = spawnXSnap({ handleCommand });
  try {
    for (const script of preamble) {
      await worker.evaluate(script);
    }

    await worker.evaluate(pathGlobalsKludge);

    // Send the test script to avaHandler.
    await worker.issueStringCommand(testBundle.source);
  } finally {
    await worker.terminate();
  }

  return { qty, byStatus };
}

/**
 * @param {string[]} argv
 * @param {{
 *   bundleSource: typeof import('@agoric/bundle-source').default,
 *   spawn: typeof import('child_process')['spawn'],
 *   osType: typeof import('os')['type'],
 *   readFile: typeof import('fs')['promises']['readFile'],
 *   resolve: typeof import('path').resolve,
 *   dirname: typeof import('path').dirname,
 * }} io
 */
async function main(
  argv,
  { bundleSource, spawn, osType, readFile, resolve, dirname },
) {
  const args = argv.slice(2);
  const debug = args[0] === '--debug';
  const files = debug ? args.slice(1) : args;

  const spawnXSnap = opts =>
    xsnap({
      ...opts,
      debug,
      spawn,
      os: osType(),
      meteringLimit: 0,
      stdout: 'inherit',
      stderr: 'inherit',
    });

  /**
   * we only use import() in type annotations
   *
   * @param { string } src
   */
  const hideImport = src => src.replace(/import\(/g, '');

  const preamble = [
    await asset(SESboot, readFile),
    hideImport(await asset(avaAssert, readFile)),
    hideImport(await asset(avaHandler, readFile)),
  ];

  let totalTests = 0;
  const stats = { ok: 0, 'not ok': 0, SKIP: 0 };

  for (const filename of files) {
    console.log('# test script:', filename);

    const { qty, byStatus } = await runTestScript(filename, preamble, debug, {
      spawnXSnap,
      bundleSource,
      resolve,
      dirname,
    });

    totalTests += qty;
    Object.entries(byStatus).forEach(([status, q]) => {
      stats[status] += q;
    });
  }

  console.log({ totalTests, stats });
  return stats['not ok'] > 0 ? 1 : 0;
}

/* eslint-disable global-require */
if (require.main === module) {
  main([...process.argv], {
    bundleSource: require('@agoric/bundle-source').default,
    spawn: require('child_process').spawn,
    osType: require('os').type,
    readFile: require('fs').promises.readFile,
    resolve: require('path').resolve,
    dirname: require('path').dirname,
  })
    .then(status => {
      process.exit(status);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
