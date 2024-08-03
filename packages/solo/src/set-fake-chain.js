import fs from 'fs';
import path from 'path';

export default function setFakeChain(basedir, GCI, fakeDelay) {
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
      case 'fake-chain': {
        // Replace duplicate GCIs.
        const { GCI: newGCI } = c;
        const index = conns.findIndex(({ GCI: oldGCI }) => oldGCI === newGCI);
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
    type: 'fake-chain',
    GCI,
    fakeDelay,
  };
  add(newconn);
  const connections = [];
  for (const conns of Object.values(connsByType)) {
    connections.push(...conns);
  }
  fs.writeFileSync(fn, `${JSON.stringify(connections, undefined, 2)}\n`);
}
