import dbOpenAmbient from 'better-sqlite3';
import { HOME, dbTool } from '@agoric/synthetic-chain';

/**
 * @typedef {{position: number; item: string; vatID: string; incarnation: number}} TranscriptItem
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
    db,
  });
};

const initSwingstore = () => {
  const fullPath = swingstorePath.replace(/^~/, HOME);
  return makeSwingstore(dbOpenAmbient(fullPath, { readonly: true }));
};

/**
 * @param {string} vatName
 */
export const getVatsWithSameName = async vatName => {
  const kStore = initSwingstore();

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

/**
 *
 * @param {string} vatId
 * @param {number} n
 * @returns {Array<TranscriptItem>}
 */
export const getTranscriptItemsForVat = (vatId, n = 10) => {
  const { db } = initSwingstore();

  const items = db
    .prepare(
      'select * from transcriptItems where vatId = ? order by position desc limit ?',
    )
    .all(vatId, n);

  // @ts-expect-error casting problem when assigning values coming from db
  return items;
};

export const snapshotVat = vatName => {
  const { findVatsExact } = initSwingstore();

  const snapshots = {};
  const vatIdsWithExactName = findVatsExact(vatName);
  vatIdsWithExactName.forEach(id => {
    const element = getTranscriptItemsForVat(id, 1)[0];

    snapshots[id] = element.position;
  });

  return snapshots;
};

export const swingStore = makeSwingstore(
  dbOpenAmbient(swingstorePath.replace(/^~/, HOME), { readonly: true }),
);
