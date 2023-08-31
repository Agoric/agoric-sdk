// @ts-check
import processAmbient from 'process';
import dbOpenAmbient from 'better-sqlite3';

/**
 * @file look up vat incarnation from kernel DB
 * @see {main}
 */

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

/**
 * SQL short-hand
 *
 * @param {import('better-sqlite3').Database} db
 */
const dbTool = db => {
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
      const targetVat = dynamicIDs.find(
        vatID => lookupVat(vatID).options().name === vatName,
      );
      if (!targetVat) throw Error(vatName);
      return targetVat;
    },
    lookupVat,
  });
};

/** @type {<T>(val: T | undefined) => T} */
const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};

/**
 * @param {string[]} argv
 * @param {{ dbOpen: typeof import('better-sqlite3'), HOME?: string }} io
 */
const main = async (argv, { dbOpen, HOME }) => {
  const [_node, _script, vatName] = argv;
  if (!vatName) throw Error('vatName required');

  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  const kStore = makeSwingstore(dbOpen(fullPath, { readonly: true }));

  const vatID = kStore.findVat(vatName);
  const vatInfo = kStore.lookupVat(vatID);

  const source = vatInfo.source();
  const { incarnation } = vatInfo.currentSpan();

  // misc info to stderr
  console.error(JSON.stringify({ vatName, vatID, incarnation, ...source }));

  // incarnation to stdout
  console.log(incarnation);
};

processAmbient.exitCode = 1;
main(processAmbient.argv, {
  dbOpen: dbOpenAmbient,
  HOME: processAmbient.env.HOME,
}).then(
  () => {
    processAmbient.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    processAmbient.exit(processAmbient.exitCode || 1);
  },
);
