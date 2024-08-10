/* eslint-disable camelcase */
// import '@endo/init';
import fs from 'fs';
import zlib from 'zlib';
import process from 'process';
import readline from 'readline';

import sqlite3 from 'better-sqlite3';

function makeDB(dbPath) {
  const db = sqlite3(dbPath);
  const indexes = [];
  const sql = {};
  db.exec(`PRAGMA journal_mode=WAL`);

  db.exec(`CREATE TABLE IF NOT EXISTS block (
blockNum INTEGER, -- or 'bootstrap'
blockTime INTEGER,
compute_time FLOAT, -- cosmic-swingset-{begin,end}-block : includes cosmos-sdk time
swingset_time FLOAT -- cosmic-swingset-end-block-{start,finish} : only swingset time
-- PRIMARY KEY (blockNum) -- INTEGER or STRING, so cannot be PRIMARY KEY
)`);
  sql.addBlock = db.prepare(
    `INSERT INTO block VALUES (@blockNum, @blockTime, @compute_time, @swingset_time)`,
  );
  indexes.push(`CREATE INDEX IF NOT EXISTS block_blockNum ON block (blockNum)`);

  db.exec(`CREATE TABLE IF NOT EXISTS run (
blockNum INTEGER,
runNum INTEGER,
time FLOAT, -- cosmic-swingset-run-{start,finish}
usedBeans INTEGER,
remainingBeans INTEGER
-- PRIMARY KEY (blockNum, runNum) -- same
)`);
  sql.addRun = db.prepare(
    `INSERT INTO run VALUES (@blockNum, @runNum, @time, @usedBeans, @remainingBeans)`,
  );
  indexes.push(`CREATE INDEX IF NOT EXISTS run_blockNum ON run (blockNum)`);

  /* all deliveries */
  db.exec(`CREATE TABLE IF NOT EXISTS delivery (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
kd_json STRING,
deliver_ok BOOLEAN,
time FLOAT, -- deliver to deliver-result
meterType STRING,
computrons INTEGER
-- PRIMARY KEY (crankNum)
)`);
  // we duplicate crankNums: https://github.com/Agoric/agoric-sdk/issues/8264
  // so we can't use PRIMARY KEY (crankNum), but instead add a (non-UNIQUE) index
  indexes.push(
    `CREATE INDEX IF NOT EXISTS delivery_crankNum ON delivery (crankNum)`,
    `CREATE INDEX IF NOT EXISTS delivery_blockNum_runNum ON delivery (blockNum, runNum)`,
    `CREATE INDEX IF NOT EXISTS delivery_vatID_deliveryNum ON delivery (vatID, deliveryNum)`,
  );
  sql.addDelivery = db.prepare(
    `INSERT INTO delivery VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @kd_json, @deliver_ok, @time,
      @meterType, @computrons)`,
  );

  // dispatch.deliver, indexed by methodname and result_kpid
  db.exec(`CREATE TABLE IF NOT EXISTS delivery_message (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
target_kref STRING,
methname STRING,
result_kpid STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS delivery_message_methname ON delivery_message (methname)`,
    `CREATE INDEX IF NOT EXISTS delivery_message_result ON delivery_message (result_kpid)`,
    `CREATE INDEX IF NOT EXISTS delivery_message_crankNum ON delivery_message (crankNum)`,
  );
  sql.addDispatchDeliver = db.prepare(
    `INSERT INTO delivery_message VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @target_kref, @methname, @result_kpid
     )`,
  );

  // dispatch.notify, indexed by kpid
  db.exec(`CREATE TABLE IF NOT EXISTS delivery_notify (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
kpid STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS delivery_notify_kpid ON delivery_notify (kpid)`,
  );
  sql.addDispatchNotify = db.prepare(
    `INSERT INTO delivery_notify VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @kpid
     )`,
  );

  // deliveries which target or mention krefs
  db.exec(`CREATE TABLE IF NOT EXISTS delivery_mention (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
kref STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS delivery_mention_kref ON delivery_mention (kref)`,
  );
  sql.addDispatchMention = db.prepare(
    `INSERT INTO delivery_mention VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @kref
     )`,
  );

  /* all syscalls */
  db.exec(`CREATE TABLE IF NOT EXISTS syscall (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
syscallNum INTEGER,
type STRING,
ksc_json STRING,
result_ok STRING,
result_json STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS syscall_blockNum_runNum ON syscall (blockNum, runNum)`,
    `CREATE INDEX IF NOT EXISTS syscall_crankNum ON syscall (crankNum)`,
    `CREATE INDEX IF NOT EXISTS syscall_vatID_deliveryNum ON syscall (vatID, deliveryNum)`,
  );
  sql.addSyscall = db.prepare(
    `INSERT INTO syscall VALUES (
@blockNum, @runNum, @crankNum, @vatID, @deliveryNum, @syscallNum,
@type, @ksc_json, @result_ok, @result_json
)`,
  );

  // syscall.sends, indexed by methodname and result_kpid
  db.exec(`CREATE TABLE IF NOT EXISTS syscall_message (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
syscallNum INTEGER,
target_kref STRING,
methname STRING,
result_kpid STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS syscall_message_methname ON syscall_message (methname)`,
    `CREATE INDEX IF NOT EXISTS syscall_message_result ON syscall_message (result_kpid)`,
  );
  sql.addSyscallSend = db.prepare(
    `INSERT INTO syscall_message VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @syscallNum, @target_kref, @methname, @result_kpid
     )`,
  );

  // syscall.resolve, indexed by kpid
  db.exec(`CREATE TABLE IF NOT EXISTS syscall_resolve (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
syscallNum INTEGER,
kpid STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS syscall_resolve_kpid ON syscall_resolve (kpid)`,
  );
  sql.addSyscallResolve = db.prepare(
    `INSERT INTO syscall_resolve VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @syscallNum, @kpid
     )`,
  );

  // syscall which target or mention a kref
  db.exec(`CREATE TABLE IF NOT EXISTS syscall_mention (
blockNum INTEGER,
runNum INTEGER,
crankNum INTEGER,
vatID STRING,
deliveryNum INTEGER,
syscallNum INTEGER,
kref STRING
)`);
  indexes.push(
    `CREATE INDEX IF NOT EXISTS syscall_mention_kref ON syscall_mention (kref)`,
  );
  sql.addSyscallMention = db.prepare(
    `INSERT INTO syscall_mention VALUES (
      @blockNum, @runNum,
      @crankNum, @vatID, @deliveryNum,
      @syscallNum, @kref
     )`,
  );

  /* current data */
  db.exec(
    `CREATE TABLE IF NOT EXISTS promise_decider (kpid STRING, decider STRING)`,
  );
  sql.addPromiseDecider = db.prepare(
    `INSERT INTO promise_decider VALUES (@kpid, @decider)`,
  );
  sql.clearPromiseDeciders = db.prepare(`DELETE FROM promise_decider`);

  db.exec(
    `CREATE TABLE IF NOT EXISTS promise_subscriber (kpid STRING, subscriber STRING)`,
  );
  sql.addPromiseSubscriber = db.prepare(
    `INSERT INTO promise_subscriber VALUES (@kpid, @subscriber)`,
  );
  sql.clearPromiseSubscribers = db.prepare(`DELETE FROM promise_subscriber`);

  return { db, sql, indexes };
}

function copySwingStore(sql, swingstoreDbPath) {
  const swingstoreDb = sqlite3(swingstoreDbPath);
  sql.clearPromiseDeciders.run();
  sql.clearPromiseSubscribers.run();
  /** @type {any} */
  const deciders = swingstoreDb.prepare(
    "SELECT * FROM kvStore WHERE key LIKE 'kp%.decider'",
  );
  for (const row of deciders.iterate()) {
    const [kpid] = row.key.split('.');
    const decider = row.value;
    sql.addPromiseDecider.run({ kpid, decider });
  }
  /** @type {any} */
  const subscribers = swingstoreDb.prepare(
    "SELECT * FROM kvStore WHERE key LIKE 'kp%.subscribers'",
  );
  for (const row of subscribers.iterate()) {
    const [kpid] = row.key.split('.');
    for (const subscriber of row.value.split(',')) {
      sql.addPromiseSubscriber.run({ kpid, subscriber });
    }
  }
}

function createIndexes(db, indexes) {
  for (const index of indexes) {
    db.exec(index);
  }
}

function extractSmallcaps(methargs_smallcaps) {
  const { body, slots } = methargs_smallcaps;
  if (body[0] !== '#') {
    throw Error('ersatz decoder only handles smallcaps');
  }
  const methargs = JSON.parse(body.slice(1));
  const methname = methargs[0];
  return { methname, slots };
}

async function processFile(slogfileName, sql, commitAndReopenTransaction) {
  console.log(`processFile`, slogfileName);
  /** @type {import('stream').Readable} */
  let slog = fs.createReadStream(slogfileName);
  if (slogfileName.endsWith('.gz')) {
    slog = slog.pipe(zlib.createGunzip());
  }
  const lines = readline.createInterface({ input: slog });
  let blockNum;
  let blockTime;
  let blockStartTime;
  let blockSwingsetStartTime;
  let runStartTime;
  let runNum;
  let delivery;
  let deliveryStartTime;
  let syscall;
  for await (const line of lines) {
    const data = JSON.parse(line);

    if (data.replay) {
      continue;
    }

    if (data.type === 'cosmic-swingset-bootstrap-block-start') {
      blockNum = 'bootstrap';
      blockTime = data.blockTime;
      blockStartTime = data.time;
      runNum = 0;
    }
    if (data.type === 'cosmic-swingset-bootstrap-block-finish') {
      const compute_time = data.time - blockStartTime;
      const swingset_time = compute_time;
      sql.addBlock.run({ blockNum, blockTime, compute_time, swingset_time });
      blockNum = undefined;
      blockTime = undefined;
      blockStartTime = undefined;
    }
    if (data.type === 'cosmic-swingset-begin-block') {
      blockNum = data.blockHeight;
      blockTime = data.blockTime;
      blockStartTime = data.time;
      if (blockNum % 1000 === 0) {
        console.log(`blockHeight`, blockNum);
      }
      if (blockNum % 20000 === 0) {
        console.log(`committing`);
        commitAndReopenTransaction();
      }
    }
    if (data.type === 'cosmic-swingset-end-block-start') {
      blockSwingsetStartTime = data.time;
    }
    if (data.type === 'cosmic-swingset-end-block-finish') {
      const compute_time = data.time - blockStartTime;
      const swingset_time = data.time - blockSwingsetStartTime;
      sql.addBlock.run({ blockNum, blockTime, compute_time, swingset_time });
      blockNum = undefined;
      blockTime = undefined;
      blockStartTime = undefined;
      blockSwingsetStartTime = undefined;
    }

    if (data.type === 'cosmic-swingset-run-start') {
      runNum = data.runNum;
      runStartTime = data.time;
    }
    if (data.type === 'cosmic-swingset-run-finish') {
      const time = data.time - runStartTime;
      const { usedBeans, remainingBeans } = data;
      sql.addRun.run({ blockNum, runNum, time, usedBeans, remainingBeans });
      runNum = undefined;
      runStartTime = undefined;
    }

    if (data.type === 'deliver') {
      delivery = data;
      deliveryStartTime = data.time;
      continue;
    }

    if (data.type === 'syscall') {
      syscall = data;
    }

    if (data.type === 'syscall-result') {
      const { crankNum, vatID, deliveryNum } = delivery;
      const { syscallNum, ksc } = syscall;
      syscall = undefined;
      const { ksr } = data;
      const type = ksc[0];
      const [result_ok_s, result_value_data] = ksr;
      const result_ok = result_ok_s === 'ok' ? 1 : 0; // sqlite hates booleans
      const ksc_json = JSON.stringify(ksc);
      // syscall.invoke gets capdata in result_value
      const result_json = JSON.stringify(result_value_data);
      sql.addSyscall.run({
        blockNum,
        runNum,
        crankNum,
        vatID,
        deliveryNum,
        syscallNum,
        type,
        ksc_json,
        result_ok,
        result_json,
      });
      if (type === 'send') {
        const target_kref = ksc[1];
        const { methargs, result: result_kpid } = ksc[2];
        const { methname, slots } = extractSmallcaps(methargs);
        sql.addSyscallSend.run({
          blockNum,
          runNum,
          crankNum,
          vatID,
          deliveryNum,
          syscallNum,
          target_kref,
          methname,
          result_kpid,
        });
        sql.addSyscallMention.run({
          blockNum,
          runNum,
          crankNum,
          vatID,
          deliveryNum,
          syscallNum,
          kref: target_kref,
        });
        if (result_kpid) {
          sql.addSyscallMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            syscallNum,
            kref: result_kpid,
          });
        }
        for (const kref of slots) {
          sql.addSyscallMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            syscallNum,
            kref,
          });
        }
      }
      if (type === 'resolve') {
        for (const resolution of ksc[2]) {
          const [kpid, _rejected, capData] = resolution;
          const { slots } = extractSmallcaps(capData);
          sql.addSyscallResolve.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            syscallNum,
            kpid,
          });
          sql.addSyscallMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            syscallNum,
            kref: kpid,
          });
          for (const kref of slots) {
            sql.addSyscallMention.run({
              blockNum,
              runNum,
              crankNum,
              vatID,
              deliveryNum,
              syscallNum,
              kref,
            });
          }
        }
      }
      if (type === 'subscribe') {
        const kpid = ksc[2];
        sql.addSyscallMention.run({
          blockNum,
          runNum,
          crankNum,
          vatID,
          deliveryNum,
          syscallNum,
          kref: kpid,
        });
      }

      // TODO: track syscall.invoke krefs in both args and results, in syscall_mention
      // TODO: track GC mentions in a separate table
      // TODO: track syscall.exit mentions in a separate table
    }

    if (data.type === 'deliver-result') {
      const { kd, crankNum, vatID, deliveryNum } = delivery;
      const time = data.time - deliveryStartTime;
      delivery = undefined;
      deliveryStartTime = undefined;
      const { dr } = data;
      // BOYD dr[1] is a stats object, so skip deliver_error
      const [deliver_ok_s, _deliver_error, deliver_meter] = dr;
      const deliver_ok = deliver_ok_s === 'ok' ? 1 : 0; // sqlite hates booleans
      const { meterType, compute: computrons } = deliver_meter || {};
      const kd_json = JSON.stringify(kd);
      sql.addDelivery.run({
        blockNum,
        runNum,
        crankNum,
        vatID,
        deliveryNum,
        kd_json,
        deliver_ok,
        time,
        meterType,
        computrons,
      });
      if (kd[0] === 'message') {
        // kd[1] should be a {kref: ...} object
        const target_kref =
          typeof kd[1] === 'string' ? kd[1] : Reflect.get(kd[1], 'kref');
        const { methargs, result: result_kpid } = kd[2];
        const { methname, slots } = extractSmallcaps(methargs);
        sql.addDispatchDeliver.run({
          blockNum,
          runNum,
          crankNum,
          vatID,
          deliveryNum,
          target_kref,
          methname,
          result_kpid,
        });
        sql.addDispatchMention.run({
          blockNum,
          runNum,
          crankNum,
          vatID,
          deliveryNum,
          kref: target_kref,
        });
        if (result_kpid) {
          sql.addDispatchMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            kref: result_kpid,
          });
        }
        for (const kref of slots) {
          sql.addDispatchMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            kref,
          });
        }
      }
      if (kd[0] === 'notify') {
        for (const resolution of kd[1]) {
          const [kpid, { state: _state, data: resdata }] = resolution;
          sql.addDispatchNotify.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            kpid,
          });
          sql.addDispatchMention.run({
            blockNum,
            runNum,
            crankNum,
            vatID,
            deliveryNum,
            kref: kpid,
          });
          const { slots } = extractSmallcaps(resdata);
          for (const kref of slots) {
            sql.addDispatchMention.run({
              blockNum,
              runNum,
              crankNum,
              vatID,
              deliveryNum,
              kref,
            });
          }
        }
      }
    }
  }
}

async function run() {
  const [_node, scriptPath, dbPath, swingstoreDbPath, ...slogfileNames] =
    process.argv;

  if (slogfileNames.length === 0) {
    console.log(
      `Usage: ${scriptPath} outputDb.sqlite swingstoreDb.sqlite slogFile...`,
    );
    process.exit(64);
    return;
  }

  const { db, sql, indexes } = makeDB(dbPath);
  db.prepare('BEGIN IMMEDIATE TRANSACTION').run();

  const commitAndReopenTransaction = () => {
    db.prepare('COMMIT').run();
    db.prepare('BEGIN IMMEDIATE TRANSACTION').run();
  };

  console.log(`copying current swingstore data..`);
  await copySwingStore(sql, swingstoreDbPath);

  for (const slogfileName of slogfileNames) {
    await processFile(slogfileName, sql, commitAndReopenTransaction);
  }
  commitAndReopenTransaction();

  console.log(`creating indexes..`);
  createIndexes(db, indexes);
  db.prepare('COMMIT').run();

  console.log(`performing wal_checkpoint`);
  db.prepare('PRAGMA wal_checkpoint(FULL)').run();
}

run().catch(err => console.log('err', err));
