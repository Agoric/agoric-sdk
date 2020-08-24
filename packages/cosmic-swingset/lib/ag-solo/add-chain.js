import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

import setGCIIngress from './set-gci-ingress';

const DEFAULT_CHAIN_CONFIG = 'https://testnet.agoric.com/network-config';

/**
 * @param {string} basedir
 * @param {string=} chainConfig
 * @param {boolean} [force=false]
 */
async function addChain(basedir, chainConfig, force = false) {
  let actualConfig = chainConfig;
  const cache = path.join(basedir, 'add-chain-default.txt');
  if (actualConfig === undefined) {
    if (fs.existsSync(cache)) {
      actualConfig = fs.readFileSync(cache, 'utf-8');
    } else {
      actualConfig = DEFAULT_CHAIN_CONFIG;
    }
  }

  console.log('downloading netconfig from', actualConfig);
  const r = await fetch(actualConfig);
  const netconf = await r.json();
  if (!netconf.gci) {
    throw Error(`${actualConfig} does not contain a "gci" entry`);
  }

  const connFile = path.join(basedir, 'connections.json');
  const conns = JSON.parse(fs.readFileSync(connFile));
  for (const conn of conns) {
    if (conn.GCI === netconf.gci) {
      if (!force) {
        console.log(`Already have an entry for ${conn.GCI}; not replacing`);
        return 0;
      }
    }
  }

  console.log('Setting chain parameters');
  setGCIIngress(basedir, netconf.gci, netconf.rpcAddrs, netconf.chainName);

  if (chainConfig === undefined) {
    console.log('Writing', actualConfig, 'to', cache);
    fs.writeFileSync(cache, actualConfig);
  }
  return 0;
}

export default addChain;
