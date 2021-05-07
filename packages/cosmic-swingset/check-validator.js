#! /usr/bin/env node
/* global process require Buffer */
// check-validator - Find if there is a validator that matches the current ag-chain-cosmos
// Michael FIG <mfig@agoric.com>, 2021-05-06
const oper = process.argv[2];

const { spawnSync } = require('child_process');

console.log('Fetching current validators matching', oper || 'ALL');
const ret = spawnSync('ag-cosmos-helper', [
  'query',
  'staking',
  'validators',
  '--limit=1000',
  '-ojson',
]);
if (ret.error) {
  throw ret.error;
}
if (ret.stderr) {
  process.stderr.write(ret.stderr);
}
if (ret.code) {
  process.exit(ret.code);
}

const output = ret.stdout.toString('utf-8');
let obj;
try {
  obj = JSON.parse(output);
} catch (e) {
  console.error('Cannot parse:', output);
  throw e;
}

if (!obj || !Array.isArray(obj.validators)) {
  console.error('Bad shape:', obj);
  throw Error(`Could not parse validators`);
}

const narrow = obj.validators.filter(
  validator => !oper || validator.operator_address === oper,
);

const opKeys = narrow.map(({ operator_address: op, consensus_pubkey: pk }) => {
  const pkHex = Buffer.from(pk.key, 'base64').toString('hex');
  return { op, pkHex, pk };
});

console.log('Fetching current node pubkey...');
const ret2 = spawnSync('ag-chain-cosmos', ['tendermint', 'show-validator']);
const selfPub = ret2.stdout.toString('utf-8').trim();
console.log(selfPub);
console.log('Fetching current node hex...');
const ret3 = spawnSync('ag-cosmos-helper', [
  'keys',
  'parse',
  '--output=json',
  selfPub,
]);
const selfParse = ret3.stdout.toString('utf-8');
let selfParseObj;
try {
  selfParseObj = JSON.parse(selfParse);
} catch (e) {
  console.error('Cannot parse', selfParse);
  throw e;
}

const selfHex = selfParseObj.bytes;
console.log(selfHex);

console.log('Matching pubkeys...');
const lselfHex = selfHex.toLowerCase();
const match = opKeys.find(({ pkHex }) =>
  lselfHex.endsWith(pkHex.toLowerCase()),
);

if (!match) {
  console.log(JSON.stringify(narrow, null, 2));
  throw Error(`Sorry!  We couldn't find your node!`);
}

console.log('Congratulations!  Your node is at', match);
