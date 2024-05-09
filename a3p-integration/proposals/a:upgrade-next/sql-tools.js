import dbOpenAmbient from 'better-sqlite3';

export const HOME = process.env.HOME;

/** @type {<T>(val: T | undefined) => T} */
export const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};
const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

/** @param {import('better-sqlite3').Database} db */
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

/** @param {import('better-sqlite3').Database} db */
const objectCensus = db => {
  const sql = dbTool(db);

  const getCount = () => sql.get`select COUNT(*) from kvStore`;

  const kv = getCount();
  return kv['COUNT(*)'];
};

export const getObjectCount = async () => {
  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  return objectCensus(dbOpenAmbient(fullPath, { readonly: true }));
};

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} vatId
 */
const vatObjectCensus = (db, vatId) => {
  const sql = dbTool(db);

  const getCount = () =>
    sql.get([`SELECT COUNT(*) from kvStore WHERE key LIKE '${vatId}.c.%'`]);

  const kv = getCount();
  return kv['COUNT(*)'];
};

export const getVatObjectCount = async vatId => {
  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  return vatObjectCensus(dbOpenAmbient(fullPath, { readonly: true }), vatId);
};
