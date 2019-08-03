import fs from 'fs';
import path from 'path';

export default function setGCIIngress(basedir, GCI, rpcAddresses, chainID) {
  const myAddrFn = path.join(basedir, 'ag-cosmos-helper-address');
  const myAddr = fs
    .readFileSync(myAddrFn)
    .toString()
    .trim();
  const fn = path.join(basedir, 'connections.json');
  const connsByType = {};
  const add = c => {
    const { type } = c;
    const conns = connsByType[type];
    if (!conns) {
      connsByType[type] = [c];
      return;
    }

    switch (type) {
      case 'chain-cosmos-sdk': {
        // Replace duplicate GCIs.
        const { GCI: newGCI, rpcAddresses: newRpcAddresses } = c;
        const index = conns.findIndex(
          ({ GCI: oldGCI, rpcAddresses: oldRpcAddresses }) => {
            if (oldGCI === newGCI) {
              return true;
            }
            for (const r of newRpcAddresses) {
              // Overlapping RPC address.
              if (oldRpcAddresses.includes(r)) {
                return true;
              }
            }
            return false;
          },
        );
        if (index < 0) {
          conns.push(c);
        } else {
          conns[index] = c;
        }
        break;
      }
      default:
        conns.push(c);
    }
  };

  JSON.parse(fs.readFileSync(fn)).forEach(add);
  const newconn = {
    type: 'chain-cosmos-sdk',
    chainID,
    GCI,
    rpcAddresses,
    myAddr,
  };
  add(newconn);
  const connections = [];
  Object.entries(connsByType).forEach(([type, conns]) =>
    connections.push(...conns),
  );
  fs.writeFileSync(fn, `${JSON.stringify(connections, undefined, 2)}\n`);

  const gciFileContents = `\
export const GCI = ${JSON.stringify(GCI)};
`;
  const bfn = path.join(basedir, 'vats', 'gci.js');
  fs.writeFileSync(bfn, gciFileContents);
}
