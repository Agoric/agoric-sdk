/* eslint-env node */
import { getInstanceBoardId } from '@agoric/synthetic-chain';
import dbOpenAmbient from 'better-sqlite3';
import { writeFile } from 'fs/promises';
import assert from 'node:assert/strict';

const { env } = process;

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
    /** @param {string} vatName */
    findVats: vatName => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      return dynamicIDs.filter(vatID =>
        lookupVat(vatID).options().name.includes(vatName),
      );
    },
    lookupVat,
  });
};

/** @param {string} vatName */
export const getDetailsMatchingVats = async vatName => {
  const kStore = makeSwingstore(
    dbOpenAmbient(swingstorePath, { readonly: true }),
  );

  const vatIDs = kStore.findVats(vatName);
  const infos = [];
  for (const vatID of vatIDs) {
    const vatInfo = kStore.lookupVat(vatID);
    const name = vatInfo.options().name;
    const source = vatInfo.source();
    // @ts-expect-error cast
    const { incarnation } = vatInfo.currentSpan();
    infos.push({ vatName: name, vatID, incarnation, ...source });
  }

  return infos;
};

export const lastAuctionInstancePathname = `${env.HOME}/.agoric/lastAuctioneerInstance.json`;

export const recordAuctioneerInstance = async () => {
  const oldAuctionInstance = await getInstanceBoardId('auctioneer');
  assert(oldAuctionInstance, 'no auction instance found');
  console.log('old auction instance ', oldAuctionInstance, env.HOME);

  await writeFile(lastAuctionInstancePathname, oldAuctionInstance);
};
