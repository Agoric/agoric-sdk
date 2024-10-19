import dbOpenAmbient from 'better-sqlite3';
import { HOME, dbTool } from '@agoric/synthetic-chain';

/**
 * @file look up vat incarnation from kernel DB
 * @see {getIncarnation}
 */

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

/**
 * @param {import('better-sqlite3').Database} db
 */
export const makeSwingstore = db => {
  const sql = dbTool(db);

  /** @param {string} key */
  // @ts-expect-error sqlite typedefs
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
    });
  };

  return Object.freeze({
    /** @param {string} vatName */
    findVat: vatName => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      const targetVat = dynamicIDs.find(vatID =>
        lookupVat(vatID).options().name.includes(vatName),
      );
      if (!targetVat) throw Error(`vat not found: ${vatName}`);
      return targetVat;
    },
    /** @param {string} string a substring to search for within the vat name. */
    findVatsExact: string => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      return dynamicIDs.filter(vatID =>
        lookupVat(vatID).options().name.endsWith(string),
      );
    },
    findVatsAll: string => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      return dynamicIDs.filter(vatID =>
        lookupVat(vatID).options().name.includes(string),
      );
    },
    lookupVat,
    kvGetJSON,
    sql,
    db,
  });
};

/**
 * @param {string} vatName
 */
export const getVatsWithSameName = async vatName => {
  const fullPath = swingstorePath.replace(/^~/, HOME);
  const kStore = makeSwingstore(dbOpenAmbient(fullPath, { readonly: true }));

  const vatIDs = kStore.findVatsExact(vatName);
  const vats = vatIDs.map(id => {
    const vatLookup = kStore.lookupVat(id);
    return {
      options: vatLookup.options(),
      currentSpan: vatLookup.currentSpan(),
    };
  });
  return vats;
};

export const getTranscriptItemsForVat = (vatId, n = 10) => {
  const fullPath = swingstorePath.replace(/^~/, HOME);
  const { sql, db } = makeSwingstore(
    dbOpenAmbient(fullPath, { readonly: true }),
  );

  // const items = sql.get`select * from transcriptItems where vatId = ${vatId} order by position desc limit ${n}`;
  const items = db
    .prepare(
      'select * from transcriptItems where vatId = ? order by position desc limit ?',
    )
    .all(vatId, n);
  // console.log(items);
  return items;
};

export const swingStore = makeSwingstore(
  dbOpenAmbient(swingstorePath.replace(/^~/, HOME), { readonly: true }),
);
