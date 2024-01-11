#! /usr/bin/env node
/* eslint-env node */
// @jessie-check

// check-validator - Find if there is a validator that matches the current ag-chain-cosmos
// Michael FIG <mfig@agoric.com>, 2021-06-25
const oper = process.argv[2];

const { spawnSync } = require('child_process');

console.log('Fetching current validators matching', oper || 'ALL');
const ret = spawnSync('agd', [
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
const ret2 = spawnSync('agd', ['tendermint', 'show-validator']);
const selfPub = ret2.stdout.toString('utf-8').trim();
console.log(selfPub);

const selfObj = {};
try {
  selfObj.pk = JSON.parse(selfPub);
} catch (e) {
  console.log('Fetching current node hex...');
  const ret3 = spawnSync('agd', ['keys', 'parse', '--output=json', selfPub]);
  const selfParse = ret3.stdout.toString('utf-8');
  let selfParseObj;
  try {
    selfParseObj = JSON.parse(selfParse);
  } catch (e2) {
    console.error('Cannot parse', selfParse);
    throw e2;
  }

  const selfHex = selfParseObj.bytes;
  console.log(selfHex);
  selfObj.pkHex = selfHex;
}

console.log('Matching pubkeys...');
const lselfHex = selfObj.pkHex && selfObj.pkHex.toLowerCase();
const match = opKeys.find(({ pk, pkHex }) => {
  if (selfObj.pk && pk) {
    if (selfObj.pk['@type'] === pk['@type'] && selfObj.pk.key === pk.key) {
      return true;
    }
  }
  if (lselfHex && pkHex) {
    if (lselfHex.endsWith(pkHex.toLowerCase())) {
      return true;
    }
  }
  return false;
});

if (!match) {
  console.log(JSON.stringify(narrow, null, 2));
  throw Error(`Sorry!  We couldn't find your node!`);
}

console.log('Congratulations!  Your node is at', match);
