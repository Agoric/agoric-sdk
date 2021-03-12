#!/usr/bin/env node
/* global require */

// NOTE: Runs outside SES

const process = require('process');
const fs = require('fs');
const toml = require('@iarna/toml');

// point this at ~/.ag-cosmos-chain/config/config.toml

const configString = fs.readFileSync(process.argv[2]).toString();
const config = toml.parse(configString);
const { laddr } = config.rpc; // like tcp://0.0.0.0:26657
// eslint-disable-next-line no-useless-escape
const m = laddr.match(/^tcp:\/\/([\d\.]+):(\d+)$/);
if (!m) {
  throw new Error(`error, unexpected laddr format ${laddr}`);
}
let addr = m[1];
if (addr === '0.0.0.0') {
  addr = '127.0.0.1';
}
const port = m[2];
const rpcAddr = `${addr}:${port}`;
console.log(rpcAddr);
