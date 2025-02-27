#!/usr/bin/env node
/**
 * @file Interact with the database and/or vats of a swingstore.sqlite in an
 *   ephemeral environment. This file functions as both an importable module and
 *   as a standalone interactive or non-interactive script. See
 *   "Check for CLI invocation" below for usage detail about the latter.
 */
/* eslint-env node */
/* global globalThis */
/* eslint-disable no-empty */

// Overwrite the global console for deeper inspection.
// @ts-expect-error TS2307 Cannot find module
import 'data:text/javascript,import { Console } from "node:console"; const { stdout, stderr, env } = process; const inspectOptions = { depth: Number(env.CONSOLE_INSPECT_DEPTH) || 6 }; globalThis.console = new Console({ stdout, stderr, inspectOptions });';

import 'ses';
import '@endo/eventual-send/shim.js';
import '@endo/init/pre.js';
// __hardenTaming__: "unsafe" is unfortunate, but without it, automatic
// hardening discovers EventEmitter.prototype and breaks creation of new event
// emitters (e.g., `Readable.from(...)`) because initialization is vulnerable to
// the property assignment override mistake w.r.t. _events/_eventsCount/etc.
// https://github.com/nodejs/node/blob/v22.12.0/lib/events.js#L347
// @ts-expect-error TS2307 Cannot find module
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
import { QueuedActionType } from '@agoric/internal/src/action-types.js';
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

const dataProp = { writable: true, enumerable: true, configurable: true };
const empty = Object.create(null);
const noop = () => {};
const parseNumber = input => (input.match(/[0-9]/) ? Number(input) : NaN);

// cf. packages/swing-store/src/exporter.js
const storeExportAPI = ['getExportRecords', 'getArtifactNames'];

// TODO: getVatAdminNode('v112') # scan the vatAdmin vom v2.vs.vom.* vrefs for value matching /\b${vatID}\b/
export const makeHelpers = ({ db, EV }) => {
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
      /** @type {string[]} */ (/^([^*?]*)((?:[*?]([^*?]*))*)$/.exec(keyGlob));
    let sql = sqlKVByHalfRange;
    /** @type {Record<'a' | 'b' | 'keySuffix' | 'keyGlob' | 'valueGlob', string | null>} */
    const args = {
      a: keyPrefix,
      b: null,
      keySuffix: keySuffix || null,
      keyGlob: keyTail && keyTail !== '*' ? keyGlob : null,
      valueGlob: valueGlob ?? null,
    };
    const chars = [...keyPrefix];
    const i = chars.findLastIndex(ch => ch < '\u{10FFFF}');
    if (i !== -1) {
      sql = sqlKVByRange;
      const newLastCP = /** @type {number} */ (chars[i].codePointAt(0)) + 1;
      args.b = chars.slice(0, i).join('') + String.fromCodePoint(newLastCP);
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
    // @ts-expect-error
    vatsByID = undefined;
    // @ts-expect-error
    vatsByName = undefined;
  }

  const vatIDPatt = /^v[1-9][0-9]*$/;
  // @see {@link ../../SwingSet/docs/c-lists.md}
  // @see {@link ../../swingset-liveslots/src/vatstore-usage.md}
  const refPatt =
    /(?<kref>^k[opd][1-9][0-9]*$)|(?<vref>^[opd][+-](?:0|[1-9][0-9]*)$|^(?<baseref>o[+][vd]?(?<kindID>[1-9][0-9]*)\/[1-9][0-9]*)(?<facetSuffix>:(?<facetID>0|[1-9][0-9]*))?)/;
  const krefToVrefValuePatt = /^([R_]) ([^ ]+)$/;
  const getKindMeta = (vatID, kindID) => {
    const kindMetaJSON =
      kvGet(`${vatID}.vs.vom.dkind.${kindID}.descriptor`) ||
      kvGet(`${vatID}.vs.vom.vkind.${kindID}.descriptor`);
    return JSON.parse(kindMetaJSON);
  };

  /**
   * @param {string} refID kref or vref
   * @param {string} [contextVatID]
   * @returns {Array<{vatID: string, kref: string, vref: string, kind?: string, facet?: string}>}
   */
  const getRefs = (refID, contextVatID = undefined) => {
    const refParts = refID.match(refPatt)?.groups;
    if (!refParts) throw Fail`unknown kref or vref format in ${refID}`;
    const isKref = !!refParts.kref;
    contextVatID === undefined ||
      contextVatID.match(vatIDPatt) ||
      Fail`invalid contextVatID ${contextVatID}`;

    // Search for rows like (`${vatID}.c.${kref}`, `${flag} ${vref}`), where
    // kref might be exracted from rows like (`${vatID}.c.${vref}`, kref).
    // @see {@link ../../SwingSet/docs/c-lists.md}
    const krefs = [];
    let kindMeta;
    if (isKref) {
      krefs.push(refID);
    } else {
      const maybeKref = kref => kref && krefs.push(kref);
      maybeKref(kvGet(`${contextVatID}.c.${refID}`));
      const { baseref, kindID, facetID } = refParts;
      if (kindID && !facetID) {
        // Each facet might have its own kref.
        kindMeta = getKindMeta(contextVatID, kindID);
        const facetNames = kindMeta?.facets;
        for (let i = 0; i < (facetNames?.length ?? 0); i += 1) {
          maybeKref(kvGet(`${contextVatID}.c.${baseref}:${i}`));
        }
      }
    }
    // Don't scan when we can enumerate keys.
    const results = [];
    for (const vatID of vatsByID.keys()) {
      for (const kref of krefs) {
        const value = kvGet(`${vatID}.c.${kref}`);
        if (!value) continue;
        const [_value, _reachabilityFlag, vref] =
          value.match(krefToVrefValuePatt) ||
          Fail`unexpected c-list value ${value}`;
        const result = { vatID, kref, vref };
        const { kindID, facetID } = vref.match(refPatt)?.groups || empty;
        if (kindID) {
          // kindID appears only in vrefs for the exporting vat, where we either
          // get metadata on the first try or not at all.
          if (kindMeta !== null) {
            kindMeta ||= getKindMeta(vatID, kindID) || null;
          }
          result.kind = kindMeta?.tag;
          if (facetID) result.facet = kindMeta?.facets?.[facetID];
        }
        results.push(result);
      }
    }
    return results;
  };

  /**
   * Run a core-eval directly through the controller (i.e., without a block).
   *
   * @param {string} fnText must evaluate to a function that will be invoked in
   *   a core eval compartment with a "powers" argument as attenuated by
   *   `permits` (with no attenuation by default).
   * @param {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifestPermit} [permits]
   */
  const runCoreEval = async (fnText, permits = true) => {
    // Fail noisily if fnText does not evaluate to a function.
    // This must be refactored if there is ever a need for such input.
    const fn = new Compartment().evaluate(fnText);
    typeof fn === 'function' || Fail`text must evaluate to a function`;
    /** @type {import('@agoric/cosmic-proto/swingset/swingset.js').CoreEvalSDKType} */
    const coreEvalDesc = {
      json_permits: JSON.stringify(permits),
      js_code: fnText,
    };
    const coreEvalAction = {
      type: QueuedActionType.CORE_EVAL,
      evals: [coreEvalDesc],
    };
    // Assume a path to the coreEvalBridgeHandler.
    const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
      'coreEvalBridgeHandler',
    );
    return EV(coreEvalBridgeHandler).fromBridge(coreEvalAction);
  };

  return harden({
    runCoreEval,
    stable: { db, getRefs, kvGet, kvGetJSON, kvGlob, vatsByID, vatsByName },
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
        const makeResult = /** @type {Function} */ (logAndMarkMap.get(name));
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
  const { env } = process;
  const maxVatsOnline = parseNumber(env.INQUISITOR_MAX_VATS_ONLINE || '3');

  const { swingStore, mutations } = makeSwingStoreOverlay(argv[0]);
  const { db, kvStore } = swingStore.internal;
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPort, msg) => {
    console.log('[bridge] received', msg);
    switch (destPort) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      default:
        Fail`[inquisitor] bridge port ${q(destPort)} not implemented for message ${msg}`;
    }
  };
  const config = {
    swingsetConfig: { maxVatsOnline },
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

  const {
    EV,
    controller,
    shutdown,
    getLastBlockInfo,
    pushQueueRecord,
    pushCoreEval,
    runNextBlock,
  } = testKit;
  const helpers = makeHelpers({ db, EV });
  const endowments = {
    // Raw access to overlay data.
    ...{ kvStore: provideEnhancedKVStore(kvStore), swingStore },
    // Block interactions
    ...{ getLastBlockInfo, pushQueueRecord, pushCoreEval, runNextBlock },
    // Vat interactions.
    ...{ EV, controller, krefOf, kser, kslot, kunser },
    // Inquisitor API.
    ...{ mutations, ...helpers },
  };
  const contextDescriptors = objectMap(
    { console, endowments, ...endowments, shutdown },
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
  console.warn('endowments:', ...truthyKeys(endowments));
  console.warn('endowments.stable:', ...truthyKeys(endowments.stable));
  const replServer = repl.start({
    useGlobal: true,
    // @ts-expect-error TS2322 REPLWriter really is allowed to return an Error
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
const interactive = process.stdin.isTTY && !process.env.INQUISITOR_NO_REPL;
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
    env: { ...process.env, INQUISITOR_NO_REPL: '1' },
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
} else if (isCLIEntryPoint || process.env.INQUISITOR_NO_REPL) {
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
    if (!options.help) log(`Error: ${err.message}`);
    const self = pathlib.relative(process.cwd(), process.argv[1]);
    log(`Usage: ${self} swingstore.sqlite \\
  [--history-file PATH (default ${cliOptions['history-file'].default})]

Loads an ephemeral environment in which one or more vats may be probed
via \`EV\`/\`controller\`/\`kvStore\`/\`mutations\`/etc. without persisting changes.
May be used interactively, or as a recipient of piped commands, or as a module.
Example commands:
* stable.db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").pluck().all();
* stable.db.pragma("table_info(transcriptSpans)");
* [vatAdminNodeRow] = stable.db.kvGlob('v2.vs.*', '*v100*');
* stable.getRefs('o+10', 'v1');
* board = await EV.vat('bootstrap').consumeItem('board');
* obj = await EV(board).getValue('board02963');
* await runCoreEval(\`async powers => {
    const ref = await E.get(powers.consume.auctioneerKit).governorAdminFacet;
    console.log(ref);
    powers.produce.ref.resolve(ref);
  }\`);
* (await EV.vat('bootstrap').consumeItem('ref')).getKref()

ENVIRONMENT VARIABLES
  CONSOLE_INSPECT_DEPTH
    The number of times to recurse while formatting an object (default 6).
  INQUISITOR_MAX_VATS_ONLINE
    The maximum number of vats to have in memory at any given time (default 3).`);
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
