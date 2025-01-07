#!/usr/bin/env node
/* eslint-env node */
/* global globalThis */
/* eslint-disable no-empty */

// This file functions as both an importable module and a standalone script.
// See below for usage detail about the latter.
// eslint-disable-next-line import/no-extraneous-dependencies
import 'ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@endo/eventual-send/shim.js';
import '@endo/init/pre.js';
// __hardenTaming__: "unsafe" is unfortunate, but without it, automatic
// hardening discovers EventEmitter.prototype and breaks creation of new event
// emitters (e.g., `Readable.from(...)`) because initialization is vulnerable to
// the property assignment override mistake w.r.t. _events/_eventsCount/etc.
// https://github.com/nodejs/node/blob/v22.12.0/lib/events.js#L347
// @ts-expect-error Cannot find module
import 'data:text/javascript,try { lockdown({ domainTaming: "unsafe", errorTaming: "unsafe-debug", __hardenTaming__: "unsafe" }); } catch (_err) {}';

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import pathlib from 'node:path';
import repl from 'node:repl';
import stream from 'node:stream';
import {
  setImmediate as resolveImmediate,
  setTimeout as delay,
} from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { inspect, parseArgs } from 'node:util';
import { isMainThread } from 'node:worker_threads';
// eslint-disable-next-line import/no-extraneous-dependencies
import sqlite3 from 'better-sqlite3';
import { Fail, b, q } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { objectMap, BridgeId } from '@agoric/internal';
import { defineName } from '@agoric/internal/src/js-utils.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { krefOf, kser, kslot, kunser } from '@agoric/kmarshal';
import {
  openSwingStore,
  makeBundleStore,
  bundleIDFromName,
} from '@agoric/swing-store';
import {
  makeBufferedStorage,
  provideEnhancedKVStore,
} from '../src/helpers/bufferedStorage.js';
import {
  DEFAULT_SIM_SWINGSET_PARAMS,
  makeVatCleanupBudgetFromKeywords,
} from '../src/sim-params.js';
import { makeCosmicSwingsetTestKit } from './test-kit.js';

/** @import { ManagerType, SwingSetConfig } from '@agoric/swingset-vat' */
/** @import { KVStore } from '../src/helpers/bufferedStorage.js' */

const useColors = process.stdout?.hasColors?.();
const inspectDepth = 6;

const noop = () => {};
const dataProp = { writable: true, enumerable: true, configurable: true };

// cf. packages/swing-store/src/exporter.js
const storeExportAPI = ['getExportRecords', 'getArtifactNames'];

/**
 * @param {(...args: unknown[]) => void} log
 * @param {import('tty').WriteStream | import('stream').Writable} [outStream]
 * @param {{ colors?: boolean, depth?: number }} [options]
 * @returns {(...args: unknown[]) => void}
 */
const makeLogDeep = (log, outStream, options = {}) => {
  // @ts-expect-error Property 'hasColors' does not exist on type 'Writable'
  const { colors = !!outStream?.hasColors?.() } = options;
  const { depth = inspectDepth } = options;
  const maybeInspect = val => {
    if (val === null || typeof val !== 'object') return val;
    return inspect(val, { colors, depth });
  };
  return (...args) => log(...args.map(maybeInspect));
};

// TODO: Helpers for finding vats and tracking references, e.g.
//   * getVatAdminNode('v112') # scan the vatAdmin vom v2.vs.vom.* vrefs for value matching /\b${vatID}\b/
const makeHelpers = ({ db }) => {
  const sqlKVGet = db
    .prepare('SELECT value FROM kvStore WHERE key = ?')
    .pluck();
  const kvGet = key => sqlKVGet.get(key);
  const kvGetJSON = key => JSON.parse(kvGet(key));
  const sqlKVByRange = db.prepare(
    `SELECT key, value FROM kvStore WHERE key >= :a AND key < :b AND ${[
      '(:keySuffix IS NULL OR substr(key, -length(:keySuffix)) = :keySuffix)',
      '(:keyGlob IS NULL OR key GLOB :keyGlob)',
      '(:valueGlob IS NULL OR value GLOB :valueGlob)',
    ].join(' AND ')}`,
  );
  const sqlKVByHalfRange = db.prepare(
    `SELECT key, value FROM kvStore WHERE key >= :a AND ${[
      '(:keySuffix IS NULL OR substr(key, -length(:keySuffix)) = :keySuffix)',
      '(:keyGlob IS NULL OR key GLOB :keyGlob)',
      '(:valueGlob IS NULL OR value GLOB :valueGlob)',
    ].join(' AND ')}`,
  );
  const kvGlob = (keyGlob, valueGlob = undefined, lazy = false) => {
    const [_keyPattern, keyPrefix, keyTail, keySuffix] =
      /^([^*?]*)((?:[*?]([^*?]*))*)$/.exec(keyGlob);
    let sql = sqlKVByHalfRange;
    const args = {
      a: keyPrefix,
      b: null,
      keySuffix: keySuffix || null,
      keyGlob: keyTail && keyTail !== '*' ? keyGlob : null,
      valueGlob: valueGlob ?? null,
    };
    const cps = [...keyPrefix].map(ch => ch.codePointAt(0));
    const i = cps.findLastIndex(cp => cp < 0x10ffff);
    if (i !== -1) {
      sql = sqlKVByRange;
      args.b = String.fromCodePoint(...cps.slice(0, i), cps[i] + 1);
    } else {
      console.warn('Warning: Unprefixed searches can be slow');
    }
    return lazy ? sql.iterate(args) : sql.all(args);
  };
  let vatsByID = new Map();
  let vatsByName = new Map();
  try {
    // @see {@link ../../SwingSet/src/kernel/state/kernelKeeper.js}
    kvGetJSON('vat.names').every(
      name =>
        typeof name === 'string' ||
        Fail`static vat name ${q(name)} must be a string`,
    );
    kvGetJSON('vat.dynamicIDs').every(
      vatID =>
        typeof vatID === 'string' ||
        Fail`dynamic vatID ${q(vatID)} must be a string`,
    );
    const vatQuery = db.prepare(`
      WITH vat AS (
        SELECT 1 AS rank, nameJSON.key AS idx, vatNameToID.value AS vatID
           FROM kvStore AS nameList
                LEFT JOIN json_each(nameList.value) AS nameJSON
                LEFT JOIN kvStore AS vatNameToID
                          ON vatNameToID.key = 'vat.name.' || nameJSON.atom
          WHERE nameList.key='vat.names'
        UNION SELECT 2 as rank, idJSON.key AS idx, idJSON.value AS vatID
           FROM kvStore AS idList, json_each(idList.value) AS idJSON
          WHERE idList.key='vat.dynamicIDs'
      )
      SELECT vat.vatID, rank, source.value AS sourceText, options.value AS optionsText
        FROM vat
             LEFT JOIN kvStore AS source ON source.key = vat.vatID || '.source'
             LEFT JOIN kvStore AS options ON options.key = vat.vatID || '.options'
      ORDER BY vat.rank, vat.idx
    `);
    for (const dbRecord of vatQuery.iterate()) {
      const { vatID, rank, sourceText, optionsText } = dbRecord;
      const isStatic = rank === 1;
      const source = sourceText ? JSON.parse(sourceText) : undefined;
      const options = optionsText ? JSON.parse(optionsText) : undefined;
      const name = options?.name;
      const vat = harden({ vatID, name, isStatic, source, options });
      vatsByID.set(vatID, vat);
      if (name) {
        const conflict = vatsByName.get(name);
        if (vat.isStatic || !conflict) {
          // Static vats trump dynamic vats in vatsByName.
          vatsByName.set(name, vat);
        } else if (!Array.isArray(conflict)) {
          // ...but dynamic vats with duplicate names get collected into arrays.
          vatsByName.set(name, [conflict, vat]);
        } else {
          conflict.push(vat);
        }
      }
    }
  } catch (err) {
    console.warn('Warning: Could not build vat maps', err);
    vatsByID = undefined;
    vatsByName = undefined;
  }
  const vatIDPatt = /^v[1-9][0-9]*$/;
  const refPatt =
    /^(?:(k[opd][1-9][0-9]*)|[opd][+-][1-9][0-9]*|o[+]d[1-9][0-9]*\/[1-9][0-9]*)$/;
  const vrefValuePatt = /^([R_]) ([^ ]+)$/;
  /**
   * @param {string} refID kref or vref
   * @param {string} [vatID]
   * @returns {Record<string, {vatID: string, kref: string, vref: string}>}
   */
  const getRefs = (refID, vatID = undefined) => {
    const refParts =
      refID.match(refPatt) || Fail`unknown kref or vref format in ${refID}`;
    const isKref = !!refParts[1];
    vatID == null || vatID.match(vatIDPatt) || Fail`invalid vatID ${vatID}`;

    // Search for rows like (`v${vatID}.c.${vref}`, kref) or
    // (`v${vatID}.c.${kref}`, `${flag} ${vref}`).
    // @see {@link ../../SwingSet/docs/c-lists.md}
    const kref = isKref
      ? refID
      : (vatID || Fail`vatID is required to interpret a vref`) &&
        kvGet(`${vatID}.c.${refID}`);
    if (!kref) return [];
    const results = [];
    // Don't scan when we can enumerate keys.
    // TODO: ..but maybe still do this in sqlite, e.g.
    // `INNER JOIN kvStore AS entry ON entry.key = vat.vatID || '.c.' || :kref`
    for (const vatID of vatsByID.keys()) {
      const value = kvGet(`${vatID}.c.${kref}`);
      if (!value) continue;
      const valueParts =
        value.match(vrefValuePatt) || Fail`unexpected c-list value ${value}`;
      results.push({ vatID, kref, vref: valueParts[2] });
    }
    return results;
  };
  return harden({
    immutable: { db, getRefs, kvGet, kvGetJSON, kvGlob, vatsByID, vatsByName },
  });
};

/**
 * Wrap a swing-store sub-store (kvStore/transcriptStore/etc.) with a
 * replacement whose functions log and/or track/respond to staleness.
 *
 * @template {object} Substore
 * @param {string} storeName
 * @param {Substore} store
 * @param {object} [options]
 * @param {(...args: unknown[]) => void} [options.log]
 * @param {(...args: unknown[]) => void} [options.warn]
 * @param {(key?: unknown) => boolean} [options.isClean]
 * @param {(key?: unknown) => boolean} [options.isStale]
 * @param {(key?: unknown) => void} [options.markStale]
 * @param {string[]} [options.allow] functions to allow
 * @param {string[]} [options.allowIfClean] functions to allow when `isClean(firstArg)` returns true
 * @param {string[]} [options.allowAndMark] functions to augment with `markStale(firstArg)`
 * @param {Array<string | [string, Function]>} [options.logAndMark] functions to replace with `log(storeName, functionName, firstArg, ...details)` and `markStale(firstArg)`
 * @param {string[]} [options.warnIfStale] functions to augment with `warn(storeName, functionName, firstArg, ...details)` when `isStale(firstArg)` returns true
 * @param {string[]} [options.disallow] functions to disallow
 * @returns {Substore}
 */
export const wrapSubstore = (storeName, store, options = {}) => {
  const {
    log = console.log,
    warn = console.warn,
    isClean = () => Fail`[inquisitor] cannot check isClean in ${storeName}`,
    isStale = () => Fail`[inquisitor] cannot check isStale in ${storeName}`,
    markStale = () => Fail`[inquisitor] cannot markStale in ${storeName}`,
    allow = [],
    allowIfClean = [],
    allowAndMark = [],
    logAndMark: rawLogAndMark = [],
    warnIfStale = [],
    disallow = [],
  } = options;
  const logAndMarkMap = new Map(
    rawLogAndMark.map(x => (Array.isArray(x) ? x : [x, noop])),
  );
  const flat = (...arrs) => [].concat(...arrs);
  /** @type {Set<string>} */
  const unseen = new Set(
    flat(allow, allowIfClean, allowAndMark, warnIfStale, disallow),
  );
  for (const name of logAndMarkMap.keys()) unseen.add(name);
  const wrapped = objectMap(
    /** @type {Record<string, Function>} */ (store),
    (fn, name) => {
      if (typeof name !== 'string') {
        throw Fail`[inquisitor] non-string property ${b(storeName)}[${q(name)}]`;
      }
      unseen.delete(name);
      if (allow.includes(name)) {
        return fn;
      } else if (allowIfClean.includes(name)) {
        return defineName(name, (key, ...rest) => {
          isClean(key) ||
            Fail`[inquisitor] ${b(storeName)}.${b(name)}(${b(key)}) after mutations`;
          return fn(key, ...rest);
        });
      } else if (allowAndMark.includes(name)) {
        return defineName(name, (key, ...rest) => {
          markStale(key);
          return fn(key, ...rest);
        });
      } else if (logAndMarkMap.has(name)) {
        const makeResult = logAndMarkMap.get(name);
        return defineName(name, (key, ...rest) => {
          markStale(key);
          log(storeName, name, key, ...rest);
          return makeResult(key, ...rest);
        });
      } else if (warnIfStale.includes(name)) {
        return defineName(name, (key, ...rest) => {
          if (isStale(key)) {
            warn(storeName, name, key, 'returning stale data');
          }
          return fn(key, ...rest);
        });
      } else if (disallow.includes(name)) {
        return defineName(
          name,
          () => Fail`[inquisitor] disallowed ${b(storeName)}.${b(name)}`,
        );
      } else {
        throw Fail`[inquisitor] unknown ${b(storeName)} function ${b(name)}; time to update?`;
      }
    },
  );
  unseen.size === 0 ||
    Fail`[inquisitor] ${b(storeName)} lacked ${q([...unseen])}; time to update?`;
  // @ts-expect-error cast
  return wrapped;
};
harden(wrapSubstore);

/**
 * Make an overlay-like swing-store that buffers all mutations over a read-only
 * database.
 * If this ever needs substantial refactoring, consider pushing the
 * functionality into swing-store itself.
 *
 * @param {string} dbPath to a swingstore.sqlite file
 * @param {typeof wrapSubstore} wrapStore a function to replace swing-store sub-stores (kvStore/transcriptStore/etc.)
 */
export const makeSwingStoreOverlay = (dbPath, wrapStore = wrapSubstore) => {
  /** @type {Array<[storeName: string, operation: string, ...args: unknown[]]>} */
  const mutations = [];
  const recordCall = (storeName, operation, ...details) =>
    mutations.push([storeName, operation, ...details]);
  const makeWrapHelpers = () => {
    const modifiedVats = new Set();
    return {
      log: recordCall,
      isClean: () => modifiedVats.size === 0,
      isStale: vatID => modifiedVats.has(vatID),
      markStale: vatID => modifiedVats.add(vatID),
    };
  };

  const kvListeners = {
    onPendingSet: (key, value) => recordCall('kvStore', 'set', key, value),
    onPendingDelete: key => recordCall('kvStore', 'delete', key),
  };
  const swingStore = openSwingStore(dbPath, {
    asFile: true,
    readonly: true,
    wrapKvStore: base => makeBufferedStorage(base, kvListeners).kvStore,
    wrapTranscriptStore: transcriptStore => {
      const wrapHelpers = makeWrapHelpers();
      const pendingItemsByVat = new Map();
      /** @type {ReturnType<import('@agoric/swing-store').makeTranscriptStore>} */
      const transcriptStoreOverride = {
        ...transcriptStore,
        addItem: (vatID, item) => {
          recordCall('transcriptStore', 'addItem', vatID, item);
          if (wrapHelpers.isStale(vatID)) return;
          const pendingItems = pendingItemsByVat.get(vatID) || [];
          const { startPos, endPos, hash, incarnation } =
            pendingItems.at(-1) || transcriptStore.getCurrentSpanBounds(vatID);
          pendingItems.push({
            item,
            startPos,
            endPos: endPos + 1,
            hash: hash && '<unknown>',
            incarnation,
          });
          pendingItemsByVat.set(vatID, pendingItems);
        },
        getCurrentSpanBounds: vatID => {
          const pendingItems = pendingItemsByVat.get(vatID) || [];
          const { startPos, endPos, hash, incarnation } =
            pendingItems.at(-1) || transcriptStore.getCurrentSpanBounds(vatID);
          return { startPos, endPos, hash, incarnation };
        },
        readSpan: (vatID, startPos) => {
          const reader = function* reader() {
            try {
              // Read from the base store.
              yield* transcriptStore.readSpan(vatID, startPos);
            } catch (_err) {}
            // Read from the overlay, assuming that any transcripts of vatID
            // are for the current span.
            const pendingItems = pendingItemsByVat.get(vatID) || [];
            for (const { item, startPos: itemStartPos } of pendingItems) {
              if (startPos !== undefined && itemStartPos !== startPos) break;
              yield item;
            }
          };
          return reader();
        },
      };
      return wrapStore('transcriptStore', transcriptStoreOverride, {
        ...wrapHelpers,
        logAndMark: [
          'initTranscript',
          'rolloverSpan',
          'rolloverIncarnation',
          'stopUsingTranscript',
          ['deleteVatTranscripts', () => harden({ done: true, cleanups: 0 })],
        ],
        warnIfStale: ['addItem', 'getCurrentSpanBounds', 'readSpan'],
        allowIfClean: [
          ...storeExportAPI,
          'exportSpan',
          'dumpTranscripts',
          'readFullVatTranscript',
        ],
        disallow: [
          'importTranscriptSpanRecord',
          'populateTranscriptSpan',
          'assertComplete',
          'repairTranscriptSpanRecord',
        ],
      });
    },
    wrapSnapStore: snapStore => {
      const wrapHelpers = makeWrapHelpers();
      /** @type {ReturnType<import('@agoric/swing-store').makeSnapStore>} */
      const snapStoreOverride = {
        ...snapStore,
        saveSnapshot: async (vatID, snapPos, dataStream) => {
          const entryPrefix = ['snapStore', 'saveSnapshot', vatID, snapPos];
          wrapHelpers.markStale(vatID);
          await null;
          let size = 0;
          try {
            for await (const chunk of dataStream) size += chunk.length;
            recordCall(...entryPrefix, `<${size} bytes>`);
          } catch (err) {
            recordCall(...entryPrefix, `<error after ${size} bytes>`);
            throw err;
          }
          return /** @type {import('@agoric/swing-store').SnapshotResult} */ (
            harden({ uncompressedSize: size })
          );
        },
      };
      return wrapStore('snapStore', snapStoreOverride, {
        ...wrapHelpers,
        allow: ['saveSnapshot'],
        logAndMark: [
          ['deleteVatSnapshots', () => harden({ done: true, cleanups: 0 })],
          'stopUsingLastSnapshot',
        ],
        warnIfStale: ['loadSnapshot', 'getSnapshotInfo', 'hasHash'],
        allowIfClean: [
          ...storeExportAPI,
          'exportSnapshot',
          'listAllSnapshots',
          'dumpSnapshots',
        ],
        disallow: [
          'deleteAllUnusedSnapshots',
          'importSnapshotRecord',
          'populateSnapshot',
          'assertComplete',
          'repairSnapshotRecord',
          'deleteSnapshotByHash',
        ],
      });
    },
    wrapBundleStore: bundleStore => {
      const overlayDB = sqlite3(':memory:');
      const overlay = makeBundleStore(overlayDB, noop, noop);
      let modified = false;
      const onNewBundle = (operation, key, ...details) => {
        modified = true;
        recordCall('bundleStore', operation, key, ...details);
        const bundleID = bundleIDFromName(key);
        !bundleStore.hasBundle(bundleID) ||
          Fail`base bundleStore already has ${bundleID}`;
      };
      /** @type {ReturnType<import('@agoric/swing-store').makeBundleStore>} */
      const bundleStoreOverride = {
        ...bundleStore,
        // writes
        importBundleRecord: (key, value) => {
          onNewBundle('importBundleRecord', key, value);
          return overlay.importBundleRecord(key, value);
        },
        importBundle: async (name, dataProvider) => {
          const data = await dataProvider();
          onNewBundle('importBundle', name, `<${data.length} bytes>`);
          return overlay.importBundle(name, () => Promise.resolve(data));
        },
        addBundle: (bundleID, bundle) => {
          onNewBundle('addBundle', `bundle.${bundleID}`, bundle.moduleFormat);
          return overlay.addBundle(bundleID, bundle);
        },
        deleteBundle: bundleID => {
          modified = true;
          recordCall('bundleStore', 'deleteBundle', bundleID);
          if (overlay.hasBundle(bundleID)) overlay.deleteBundle(bundleID);
        },
        // reads
        hasBundle: bundleID =>
          overlay.hasBundle(bundleID) || bundleStore.hasBundle(bundleID),
        getBundle: bundleID => {
          if (overlay.hasBundle(bundleID)) return overlay.getBundle(bundleID);
          return bundleStore.getBundle(bundleID);
        },
      };
      return wrapStore('bundleStore', bundleStoreOverride, {
        log: recordCall,
        isClean: () => !modified,
        allow: [
          'importBundleRecord',
          'importBundle',
          'addBundle',
          'hasBundle',
          'getBundle',
          'deleteBundle',
        ],
        allowIfClean: [
          ...storeExportAPI,
          'exportBundle',
          'getBundleIDs',
          'dumpBundles',
        ],
        disallow: ['assertComplete', 'repairBundleRecord'],
      });
    },
  });

  return { swingStore, mutations };
};
harden(makeSwingStoreOverlay);

/**
 * Load a swing-store database for either REPL or scripted interactions.
 *
 * @param {[swingstoreDbPath: string]} argv
 * @param {{ interactive?: boolean, historyFile?: string }} [options]
 * @param {{ console?: typeof globalThis.console, process?: typeof globalThis.process }} [powers]
 */
const main = async (argv, options = {}, powers = {}) => {
  const { interactive, historyFile } = options;
  const { console = globalThis.console, process = globalThis.process } = powers;
  const logDeep = makeLogDeep(console.log, process.stdout);

  const { swingStore, mutations } = makeSwingStoreOverlay(argv[0]);
  const { db, kvStore } = swingStore.internal;
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPort, msg) => {
    logDeep('[bridge] received', msg);
    switch (destPort) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      default:
        Fail`[inquisitor] bridge port ${q(destPort)} not implemented for message ${msg}`;
    }
  };
  const config = {
    swingsetConfig: { maxVatsOnline: 3 },
    swingStore,
    /** @type {Partial<SwingSetConfig>} */
    configOverrides: {
      // Default to XS workers with no GC or snapshots.
      defaultManagerType: 'xsnap',
      defaultReapGCKrefs: 'never',
      defaultReapInterval: 'never',
      snapshotInterval: Number.MAX_VALUE,
    },
    fixupInitMessage: msg => ({
      ...msg,
      blockHeight: Number(swingStore.hostStorage.kvStore.get('host.height')),
      blockTime: Math.floor(Date.now() / 1000 - 60),
      // Default to no cleanup for terminated vats.
      params: {
        ...DEFAULT_SIM_SWINGSET_PARAMS,
        ...msg.params,
        vat_cleanup_budget: makeVatCleanupBudgetFromKeywords({ Default: 0 }),
      },
    }),
  };
  const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, config);

  const { EV, controller, shutdown } = testKit;
  const helpers = makeHelpers({ db });
  const endowments = {
    // Raw access to overlay data.
    ...{ kvStore: provideEnhancedKVStore(kvStore), swingStore },
    // Vat interactions.
    ...{ EV, controller, krefOf, kser, kslot, kunser },
    // Inquisitor API.
    ...{ mutations, ...helpers },
  };
  const contextDescriptors = objectMap(
    { console, ...endowments, shutdown },
    (value, name) => {
      // For final cleanup, `shutdown` must be preserved.
      if (name === 'shutdown') {
        return { ...dataProp, value, writable: false, configurable: false };
      }
      return { ...dataProp, value };
    },
  );

  if (!interactive) {
    Object.defineProperties(globalThis, contextDescriptors);
    return;
  }

  const truthyKeys = obj =>
    Object.entries(obj).flatMap(([key, value]) => (value ? [key] : []));
  console.warn('globals:', ...truthyKeys(endowments));
  console.warn('globals.immutable:', ...truthyKeys(endowments.immutable));
  const replServer = repl.start({
    useGlobal: true,
    writer: value => {
      if (value instanceof Error) {
        // Use the SES console.
        console.error(value);
        return Object.defineProperty(Error(value.message), 'name', {
          value: value.name,
        });
      }
      return inspect(value, { colors: useColors, depth: inspectDepth });
    },
  });
  if (historyFile) replServer.setupHistory(historyFile, _err => {});
  Object.defineProperties(replServer.context, contextDescriptors);
  const cleanup = () => shutdown().catch(noop);
  replServer.on('exit', cleanup);
  process.on('beforeExit', cleanup);
};

// Check for CLI invocation.
const isImport =
  fs.realpathSync(process.argv[1]) !== fileURLToPath(import.meta.url);
const isCLIEntryPoint = !isImport && !process.send && isMainThread !== false;
const interactive =
  process.stdin.isTTY && !process.env.AGORIC_INTERROGATOR_NO_REPL;
if (isCLIEntryPoint && !interactive) {
  // When directly invoked with non-interactive stdin, defer to a child process
  // that will read stdin as module statements in the global environment with
  // `EV`/`controller`/`kvStore`/etc.
  const args = [
    '--input-type=module',
    ...['--import', process.argv[1]],
    '',
    ...process.argv.slice(2),
  ];
  const child = spawn(process.argv[0], args, {
    env: { ...process.env, AGORIC_INTERROGATOR_NO_REPL: '1' },
    stdio: ['pipe', 'inherit', 'inherit', 'ipc'],
  });
  const { promise: childDoneP, resolve: finishChild } = makePromiseKit();
  child.on('error', error => setImmediate(finishChild, { error }));
  child.on('exit', (code, signal) => finishChild({ code, signal }));
  void childDoneP.then(resolveImmediate).then(async result => {
    await null;
    if (result?.signal) {
      process.kill(process.pid, result.signal);
      await delay(100);
    }
    if (typeof result?.code === 'number') process.exit(result.code);
    const { error } = result;
    console.error(error);
    process.exit(error.code || 1);
  });
  const childInput = child.stdin;
  if (!childInput) throw Fail`[inquisitor] child must have stdin`;
  process.stdin.pipe(childInput, { end: false });
  process.stdin.on('end', () => {
    const cleanup = `\n; try { await shutdown(); } catch (_err) {}`;
    stream.Readable.from([cleanup]).pipe(childInput);
  });
} else if (isCLIEntryPoint || process.env.AGORIC_INTERROGATOR_NO_REPL) {
  // When directly invoked with interactive stdin OR as a worker above, parse
  // CLI arguments and use `main` to setup the environment for either a REPL or
  // evaluating stdin as module statements (respectively).
  const homedir = os.homedir();
  const defaultHistFile = pathlib.join(
    homedir,
    '.agoric_inquisitor_repl_history',
  );
  /** @typedef {{type: 'string' | 'boolean', short?: string, multiple?: boolean, default?: string | boolean | string[] | boolean[]}} ParseArgsOptionConfig */
  /** @type {Record<string, ParseArgsOptionConfig>} */
  const cliOptions = {
    help: { type: 'boolean' },
    'history-file': {
      type: 'string',
      default: defaultHistFile,
    },
  };
  const { values: options, positionals: args } = parseArgs({
    options: cliOptions,
    allowPositionals: true,
  });
  try {
    if (options.help) throw Error();
    args.length >= 1 || Fail`missing swingstore.sqlite`;
    args.length === 1 || Fail`extra arguments`;
  } catch (err) {
    const log = options.help ? console.log : console.error;
    if (!options.help) log(err.message);
    const self = pathlib.relative(process.cwd(), process.argv[1]);
    log(`Usage: ${self} swingstore.sqlite
  [--history-file PATH (default ${cliOptions['history-file'].default})]

Loads an ephemeral environment in which one or more vats may be probed
via \`EV\`/\`controller\`/\`kvStore\`/\`mutations\`/etc. without persisting changes.
For example:
  immutable.db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").pluck().all();
  immutable.db.pragma("table_info(transcriptSpans)");
  [vatAdminNodeRow] = immutable.db.kvGlob('v2.vs.*', '*v100*');
  immutable.db.getRefs('o+10', 'v1');
  board = await EV.vat('bootstrap').consumeItem('board');
  obj = await EV(board).getValue('board02963');
  await EV(kslot(kvStore.get('v1.c.o+10'))).fromBridge({
    type: 'CORE_EVAL',
    evals: [{
      json_permits: true,
      js_code: \`(async powers => {
        const ref = await E.get(powers.consume.auctioneerKit).governorAdminFacet;
        console.log(ref);
        powers.produce.ref.resolve(ref);
        console.log('OK');
      })\`,
    }],
  });
  (await EV.vat('bootstrap').consumeItem('ref')).getKref()

May be used interactively, or as a recipient of piped commands, or as a module.`);
    process.exit(64);
  }
  const camelizedOptions = Object.fromEntries(
    Object.entries(options).map(([name, value]) => [
      name.replaceAll(/-([a-z])/g, (_, letter) => `${letter.toUpperCase()}`),
      value,
    ]),
  );
  // eslint-disable-next-line @jessie.js/safe-await-separator
  await main(/** @type {[string]} */ (args), {
    ...camelizedOptions,
    interactive,
  }).catch(err => {
    console.error(err);
    process.exit(err.code || 1);
  });
}
