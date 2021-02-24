/* avaXS - ava style test runner for XS

Usage:

agoric-sdk/packages/ERTP$ node -r esm ../xsnap/src/avaXS.js test/unitTests/test-*.js

*/
// @ts-check

/* eslint-disable no-await-in-loop */
import '@agoric/install-ses';
import { xsnap } from './xsnap';

const importMetaUrl = `file://${__filename}`;
/** @type { (ref: string, readFile: typeof import('fs').promises.readFile ) => Promise<string> } */
const asset = (ref, readFile) =>
  readFile(new URL(ref, importMetaUrl).pathname, 'utf8');

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * @param {string} input
 * @param {string} src
 * @param {{
 *   withXSnap: (o: Object, fn: ((w: XSnap) => Promise<void>)) => Promise<void>,
 *   bundleSource: (...args: [string, ...unknown[]]) => Promise<Bundle>,
 *   resolve: typeof import('path').resolve,
 *   dirname: typeof import('path').dirname,
 *   debug: boolean,
 * }} io
 *
 * @typedef {{
 *   id?: number, status: 'ok' | 'not ok' | 'SKIP', message?: string
 * } | { plan: number} | { note: string, label?: string }} TapMessage
 * @typedef {ReturnType<typeof import('./xsnap').xsnap>} XSnap
 * @typedef {{ moduleFormat: string }} Bundle
 *
 * @typedef {{
 *   pass: number,
 *   fail: number,
 *   total: number,
 * }} Summary
 */
async function runTest(
  input,
  src,
  { withXSnap, bundleSource, resolve, dirname, debug },
) {
  let label = '';
  let qty = 0;
  const byStatus = { ok: 0, 'not ok': 0, SKIP: 0 };

  /** @type { (msg: ArrayBuffer) => Promise<ArrayBuffer> } */
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
      if (debug) console.log(`${input}: ${msg.label} ${msg.note}`);
    }
    if ('status' in msg) {
      byStatus[msg.status] += 1;
      qty += 1;
      if (msg.status === 'not ok') {
        console.warn({ ...msg, input, label });
      }
    }
    return encoder.encode('null');
  }

  const testPath = resolve(input);
  const literal = JSON.stringify;

  // ISSUE: only works in one file / dir
  // TODO: migrate to import.meta.url
  const pathGlobalsKludge = `
    globalThis.__filename = ${literal(testPath)};
    globalThis.__dirname = ${literal(dirname(testPath))};
   `;
  await withXSnap({ name: input, handleCommand }, async worker => {
    await worker.evaluate(pathGlobalsKludge);
    await worker.issueStringCommand(src);
  });

  return { qty, byStatus };
}

/** @type {(argv: string[], name: string) => boolean } */
function extractFlag(argv, name) {
  const ix = argv.indexOf(name);
  if (ix >= 0) {
    argv.splice(ix, 1);
    return true;
  }
  return false;
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
  async function testSource(input) {
    const bundle = await bundleSource(input, 'getExport', {
      externals: [
        'ava',
        '@agoric/bundle-source',
        '@agoric/install-ses',
        '@agoric/install-metering-and-ses',
      ],
    });
    return bundle.source;
  }

  const sesShim = await asset(`../dist/bootstrap.umd.js`, readFile);
  const tinyAva = await asset(`./avaAssertXS.js`, readFile);
  const avaHandler = await asset(`./avaHandler.js`, readFile);

  const debug = extractFlag(argv, '--debug');

  // we only use import() in type annotations
  const hideImport = (/** @type { string } */ src) =>
    src.replace(/import\(/g, '');

  async function withXSnap(opts, thunk) {
    const worker = xsnap({
      meteringLimit: 0,
      spawn,
      os: osType(),
      stdout: 'inherit',
      stderr: 'inherit',
      debug,
      ...opts,
    });
    try {
      await worker.evaluate(sesShim);
      await worker.evaluate(hideImport(tinyAva));
      await worker.evaluate(hideImport(avaHandler));
      return await thunk(worker);
    } finally {
      worker.terminate();
    }
  }

  let totalTests = 0;
  const stats = { ok: 0, 'not ok': 0, SKIP: 0 };
  for (const input of argv.slice(2)) {
    console.log('# test script:', input);
    const src = await testSource(input);

    const { qty, byStatus } = await runTest(input, src, {
      withXSnap,
      bundleSource,
      resolve,
      dirname,
      debug,
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
  main(process.argv, {
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
