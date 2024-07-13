import fs from 'fs';
import path from 'path';

export default function setGCIIngress(basedir, GCI, rpcAddresses, chainID) {
  const myAddrFn = path.join(basedir, 'ag-cosmos-helper-address');
  const myAddr = fs.readFileSync(myAddrFn).toString().trim();
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
        // Replace duplicate GCIs, rpcAddresses, or base chainIDs.
        const {
          GCI: newGCI,
          chainID: newChainID,
          rpcAddresses: newRpcAddresses,
        } = c;
        const getBase = id => {
          const s = String(id);
          const match = s.match(/^(.*[^\d.])[\d.]*$/);
          return match ? match[1] : s;
        };
        const newBase = getBase(newChainID);
        const index = conns.findIndex(
          ({
            GCI: oldGCI,
            chainID: oldChainID,
            rpcAddresses: oldRpcAddresses,
          }) => {
            if (oldGCI === newGCI || getBase(oldChainID) === newBase) {
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

  for (const conn of JSON.parse(fs.readFileSync(fn))) {
    add(conn);
  }
  const newconn = {
    type: 'chain-cosmos-sdk',
    chainID,
    GCI,
    rpcAddresses,
    myAddr,
  };
  add(newconn);
  const connections = [];
  for (const conns of Object.values(connsByType)) {
    connections.push(...conns);
  }
  fs.writeFileSync(fn, `${JSON.stringify(connections, undefined, 2)}\n`);
}
