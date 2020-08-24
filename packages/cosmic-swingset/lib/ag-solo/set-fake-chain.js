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

  JSON.parse(fs.readFileSync(fn)).forEach(add);
  const newconn = {
    type: 'fake-chain',
    GCI,
    fakeDelay,
  };
  add(newconn);
  const connections = [];
  Object.entries(connsByType).forEach(([_type, conns]) =>
    connections.push(...conns),
  );
  fs.writeFileSync(fn, `${JSON.stringify(connections, undefined, 2)}\n`);

  const gciFileContents = `\
export const GCI = ${JSON.stringify(GCI)};
`;
  const bfn = path.join(basedir, 'vats', 'gci.js');
  fs.writeFileSync(bfn, gciFileContents);
}
