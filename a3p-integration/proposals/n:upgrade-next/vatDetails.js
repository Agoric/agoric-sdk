// Temporary fork of
// https://github.com/Agoric/agoric-3-proposals/blob/main/packages/synthetic-chain/src/lib/vat-status.js
// for deleted vat information.
// See https://github.com/Agoric/agoric-3-proposals/issues/208
/* eslint-env node */

import dbOpenAmbient from 'better-sqlite3';

const HOME = process.env.HOME;

/** @type {<T>(val: T | undefined) => T} */
export const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};

/**
 * @file look up vat incarnation from kernel DB
 * @see {getIncarnation}
 */

const swingstorePath = `${HOME}/.agoric/data/agoric/swingstore.sqlite`;

/**
 * SQL short-hand
 *
 * @param {import('better-sqlite3').Database} db
 */
export const dbTool = db => {
  const prepare = (strings, ...params) => {
    const dml = strings.join('?');
    return { stmt: db.prepare(dml), params };
  };
  const sql = (strings, ...args) => {
    const { stmt, params } = prepare(strings, ...args);
    return stmt.all(...params);
  };
  sql.get = (strings, ...args) => {
    const { stmt, params } = prepare(strings, ...args);
    return stmt.get(...params);
  };
  return sql;
};

/**
 * @param {import('better-sqlite3').Database} db
 */
const makeSwingstore = db => {
  const sql = dbTool(db);

  /** @param {string} key */
  // @ts-expect-error cast
  const kvGet = key => sql.get`select * from kvStore where key = ${key}`.value;
  /** @param {string} key */
  const kvGetJSON = key => JSON.parse(kvGet(key));

  /** @param {string} vatID */
  const lookupVat = vatID => {
    return Object.freeze({
      source: () => kvGetJSON(`${vatID}.source`),
      options: () => kvGetJSON(`${vatID}.options`),
      currentSpan: () =>
        sql.get`select * from transcriptSpans where isCurrent = 1 and vatID = ${vatID}`,
      getTerminated: () => kvGetJSON('vats.terminated').includes(vatID),
    });
  };

  /**
   * @param {string} vatName
   * @param {boolean} [includeTerminated]
   * @returns {string[]}
   */
  const findDynamicVatIDs = (vatName, includeTerminated = false) => {
    /** @type {string[]} */
    const terminatedVatIDs = kvGetJSON('vats.terminated');
    /** @type {string[]} */
    const allDynamicIDs = kvGetJSON('vat.dynamicIDs');
    const dynamicIDs = includeTerminated
      ? allDynamicIDs
      : allDynamicIDs.filter(vatID => !terminatedVatIDs.includes(vatID));
    const matchingIDs = dynamicIDs.filter(vatID =>
      lookupVat(vatID).options().name.includes(vatName),
    );
    return matchingIDs;
  };

  return Object.freeze({
    /**
     * @param {string} vatName
     * @param {boolean} [includeTerminated]
     * @returns {string}
     */
    findVat: (vatName, includeTerminated = false) => {
      /** @type {string[]} */
      const matchingIDs = findDynamicVatIDs(vatName, includeTerminated);
      if (matchingIDs.length === 0) throw Error(`vat not found: ${vatName}`);
      return matchingIDs[0];
    },
    findVats: findDynamicVatIDs,
    lookupVat,
  });
};

/**
 * @param {string} vatName
 * @param {boolean} [includeTerminated]
 */
export const getDetailsMatchingVats = async (
  vatName,
  includeTerminated = false,
) => {
  const kStore = makeSwingstore(
    dbOpenAmbient(swingstorePath, { readonly: true }),
  );

  const vatIDs = kStore.findVats(vatName, includeTerminated);
  const infos = [];
  for (const vatID of vatIDs) {
    const vatInfo = kStore.lookupVat(vatID);
    const name = vatInfo.options().name;
    const source = vatInfo.source();
    const terminated = includeTerminated && vatInfo.getTerminated();
    // @ts-expect-error cast
    const { incarnation } = vatInfo.currentSpan();
    infos.push({ vatName: name, vatID, incarnation, terminated, ...source });
  }

  return infos;
};
