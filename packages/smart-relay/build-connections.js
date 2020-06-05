#!/usr/bin/env node

const process = require('process');
const fs = require('fs');
const [helperBasedir, myAddr, GCI, rpc, chainID, keyName] = process.argv.slice(2);
const data = JSON.stringify([
  {
    type: 'chain-cosmos-sdk',
    helperBasedir,
    GCI,
    rpcAddresses: [ rpc ],
    myAddr,
    chainID,
    keyName,
  }
]);
fs.writeFileSync('state/connections.json', `${data}\n`);
