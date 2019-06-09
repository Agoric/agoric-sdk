import fs from 'fs';
import path from 'path';

export default function setGCIIngress(basedir, GCI, rpcAddresses, chainID) {
  const myAddrFn = path.join(basedir, 'ag-cosmos-helper-address');
  const myAddr = fs.readFileSync(myAddrFn).toString().trim();
  const fn = path.join(basedir, 'connections.json');
  let connections = JSON.parse(fs.readFileSync(fn));
  connections.push({ type: 'chain-cosmos-sdk',
                     chainID,
                     GCI,
                     rpcAddresses,
                     myAddr,
                   });
  fs.writeFileSync(fn, JSON.stringify(connections, undefined, 2)+'\n');

  let gciFileContents = `export const GCI = ${JSON.stringify(GCI)};\n`;
  const bfn = path.join(basedir, 'vats', 'gci.js');
  fs.writeFileSync(bfn, gciFileContents);
}

