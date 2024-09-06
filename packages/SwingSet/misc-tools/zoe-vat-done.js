// @ts-nocheck
import sqlite3 from 'better-sqlite3';

const db = sqlite3('mezzanine.sqlite');
const kpids = db
  .prepare(
    `SELECT pd.kpid FROM promise_decider AS pd, promise_subscriber AS ps WHERE pd.kpid=ps.kpid AND pd.decider='v2' AND ps.subscriber='v9'`,
  )
  .pluck()
  .all();

const two = db
  .prepare(
    `SELECT crankNum FROM delivery_mention WHERE kref=? ORDER BY crankNum LIMIT 1`,
  )
  .pluck();
const three = db.prepare(`SELECT * FROM delivery_message WHERE crankNum=?`);

for (const kpid of kpids) {
  // console.log(kpid);
  // the kpid is probably the result of a E(adminNode).done() call, delivered in..
  const cn = two.get(kpid);
  const create = three.get(cn);
  if (create.vatID !== 'v2' || create.methname !== 'done') {
    console.log(`-- oops ${kpid}, not v2-vatAdmin~.done`);
  }
  console.log(`ok ${kpid}`);
}
