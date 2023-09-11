/* eslint-disable */
import '@endo/init';
// import { E } from '@endo/far';
import fs from 'fs';
import process from 'process';
import sqlite3 from 'better-sqlite3';

import { kser, kunser } from '@agoric/kmarshal';


function extractSmallcaps(methargs_smallcaps) {
  const { body, slots } = methargs_smallcaps;
  if (body[0] !== '#') {
    throw Error('ersatz decoder only handles smallcaps');
  }
  const methargs = JSON.parse(body.slice(1));
  const methname = methargs[0];
  return { methname, slots };
}

export function extract(mezdb, blockHeight) {
  const row = mezdb.prepare('SELECT * FROM delivery WHERE blockNum=? ORDER BY crankNum ASC LIMIT 1').get(blockHeight);
  // console.log(row);
  const { crankNum, kd_json } = row;
  const kd = JSON.parse(kd_json);
  console.log(kd);
  assert.equal(kd[0], 'message');
  assert.equal(kd[1], 'ko62'); // probably vat-bridge handler/dispatch object
  const { methargs, result } = kd[2];
  assert.equal(result, null); // bridge device does sendOnly to vat-bridge
  assert.equal(methargs.slots.length, 0); // bridge message is pure data
  const bridge_methargs = kunser(methargs);
  const [bridge_method, bridge_args] = bridge_methargs;
  assert.equal(bridge_method, 'inbound');
  // console.log(bridge_args);
  const [target, targargs] = bridge_args;
  if (target === 'wallet') {
    const { type, blockHeight, blockTime, owner, spendAction } = targargs;
    console.log(spendAction);
    const action = kunser(JSON.parse(spendAction));
    //console.log(action);
    const { method, offer } = action;
    const newID = `ghost-offer-id`; // frontend uses ms-since-epoch as unique-per-account
    const newAction = { method, offer: { ...offer, id: newID } };
    // note: this uses smallcaps, even if the original used old encoding
    const newSpendAction = JSON.stringify(kser(newAction));
    console.log();
    console.log(newSpendAction);
    const newBridgeArgs = [target, { ...targargs, spendAction: newSpendAction } ];
    // queueToKref uses kser, but we share the module-level 'refMap' with them
    // kq.queueToKref(kd[1], bridge_method, newBridgeArgs)
    return { target: kd[1], method: bridge_method, args: newBridgeArgs };
  } else {
    throw Error(`unknown bridge message target ${target}`);
  }



}

async function run() {
  const args = process.argv.slice(2);
  const [mezdbfn, blockHeight_s] = args;
  const blockHeight = Number(blockHeight_s);
  const mezdb = sqlite3(mezdbfn);
  // we don't commit anything; this transaction remains empty
  mezdb.prepare('BEGIN TRANSACTION').run();
  extract(mezdb, blockHeight);
  mezdb.close(); // abort the txn, just in case something was written
}

//run().catch(err => console.log('err', err));
