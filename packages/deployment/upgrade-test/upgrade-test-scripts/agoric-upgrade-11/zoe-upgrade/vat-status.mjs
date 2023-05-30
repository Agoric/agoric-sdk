/* eslint-disable import/no-extraneous-dependencies */
import processAmbient from 'process';
import dbOpenAmbient from 'better-sqlite3';

const dbTool = db => {
  const prepare = (strings, ...params) => {
    const dml = strings.join(' ? ');
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

const main = async (argv, { dbOpen, HOME }) => {
  const [_node, _script, vatName] = argv;
  if (!vatName) throw Error('vatName required');

  const db = dbOpen(`${HOME}/.agoric/data/agoric/swingstore.sqlite`, {
    readonly: true,
  });
  const sql = dbTool(db);

  const kvGet = key => sql.get`select * from kvStore where key = ${key}`.value;

  const dynamicIDs = JSON.parse(kvGet('vat.dynamicIDs'));
  const targetVat = dynamicIDs.find(vatID => {
    const options = JSON.parse(kvGet(`${vatID}.options`));
    return options.name === vatName;
  });

  const source = JSON.parse(kvGet(`${targetVat}.source`));
  const {
    incarnation,
  } = sql.get`select * from transcriptSpans where isCurrent = 1 and vatID = ${targetVat}`;
  console.error(
    JSON.stringify({ vatName, vatID: targetVat, incarnation, ...source }),
  );
  console.log(incarnation);
};

main(processAmbient.argv, {
  dbOpen: dbOpenAmbient,
  HOME: processAmbient.env.HOME,
}).catch(err => {
  console.error(err);
  processAmbient.exit(1);
});
