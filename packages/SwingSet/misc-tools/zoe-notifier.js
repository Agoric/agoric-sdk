// @ts-nocheck
import sqlite3 from 'better-sqlite3';

const db = sqlite3('mezzanine.sqlite');
const kpids = db
  .prepare(
    `SELECT pd.kpid FROM promise_decider AS pd, promise_subscriber AS ps WHERE pd.kpid=ps.kpid AND pd.decider='v9' AND ps.subscriber='v43'`,
  )
  .pluck()
  .all();

const two = db
  .prepare(
    `SELECT crankNum FROM delivery_mention WHERE kref=? ORDER BY crankNum LIMIT 1`,
  )
  .pluck();
const three = db.prepare(
  `SELECT * FROM delivery WHERE crankNum=? ORDER BY crankNum LIMIT 1`,
);
const four = db.prepare(`SELECT * FROM delivery_message WHERE crankNum=?`);
const five = db
  .prepare(
    `SELECT crankNum FROM syscall_mention WHERE kref=? ORDER BY crankNum LIMIT 1`,
  )
  .pluck();
const six = db.prepare(`SELECT * FROM delivery_message WHERE crankNum=?`);

for (const kpid of kpids) {
  // console.log(kpid);
  // the kpid is probably the result of a E(xx).getUpdateSince() call, delivered in..
  const cn = two.get(kpid);
  // console.log(cn);
  const gUS = three.get(cn);
  // console.log(gUS);
  const d = four.get(cn);
  // console.log(d);
  if (d.methname !== 'getUpdateSince') {
    console.log(`-- oops ${kpid}, not a getUpdateSince`);
    console.log(d);
    continue;
  }
  // the getUpdateSince() was sent to a Notifier, with kref..
  const { target_kref } = d;
  // console.log(`target_kref:`, target_kref);
  // .. which was first created by a syscall.resolve in crank..
  const resolveCN = five.get(target_kref);
  // console.log(`resolveCN:`, resolveCN);
  // .. which was in response to a method named:
  const create = six.get(resolveCN);
  // console.log(create);
  if (create.vatID !== 'v9' || create.methname !== 'getCurrentAmountNotifier') {
    console.log(`-- oops ${kpid}, not v9-zoe~.getCurrentAmountNotifier`);
  }
  console.log(`ok ${kpid}`);
}

/*


// DISTINCT blockNum,runNum FROM delivery WHERE kd_json LIKE '%PushPrice%'`;
//one = one + ' LIMIT 10';
one = db.prepare(one);
let two = db.prepare(`SELECT * FROM run WHERE blockNum=@blockNum AND runNum=@runNum`);
const times = [];
for (const row of one.iterate()) {
  const brow = two.get({ blockNum: row.blockNum, runNum: row.runNum });
  //console.log(brow.blockNum, brow.runNum, brow.time, brow.usedBeans);
  times.push(brow.time);
}

times.sort();

const sum = times.reduce((a,b) => a+b);
console.log(`count:`, times.length);
console.log(`avg  :`, sum / times.length);
console.log(`med  :`, times[Math.floor(0.5 * times.length)]);
console.log(`90p  :`, times[Math.floor(0.9 * times.length)]);
console.log(`95p  :`, times[Math.floor(0.95 * times.length)]);
console.log(`99p  :`, times[Math.floor(0.90 * times.length)]);
*/
