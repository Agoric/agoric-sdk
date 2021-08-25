// @ts-check

import { pipeline } from 'stream';

// [PlantUML \- Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)

/**
 * TODO: refactor as readLines, map JSON.parse
 *
 * @param {AsyncIterable<Buffer>} data
 */
async function* readJSONLines(data) {
  let buf = '';
  for await (const chunk of data) {
    buf += chunk;
    for (let pos = buf.indexOf('\n'); pos >= 0; pos = buf.indexOf('\n')) {
      const line = buf.slice(0, pos);
      yield JSON.parse(line);
      buf = buf.slice(pos + 1);
    }
  }
}

/**
 * @param {AsyncIterable<SlogEntry>} entries
 */
async function* slogToDiagram(entries) {
  /** @type { Map<string, SlogCreateVatEntry> } */
  const vatInfo = new Map();
  const arrival = new Map();
  const departure = new Map();

  let tBlock;
  let blockHeight;

  for await (const entry of entries) {
    switch (entry.type) {
      case 'create-vat':
        // TODO label participants with vat names
        vatInfo.set(entry.vatID, entry);
        break;
      case 'cosmic-swingset-end-block-start':
        tBlock = entry.time;
        blockHeight = entry.blockHeight;
        departure.set(blockHeight, { blockTime: entry.blockTime });
        break;
      case 'deliver': {
        const { kd } = entry;
        vatInfo.set(entry.vatID, null);
        switch (kd[0]) {
          case 'message': {
            const [_tag, target, { method, result }] = kd;
            arrival.set(result, {
              time: entry.time - tBlock,
              crankNum: entry.crankNum,
              deliveryNum: entry.deliveryNum,
              vatID: entry.vatID,
              target,
              method,
            });
            break;
          }
          case 'notify': {
            const [_tag, resolutions] = kd;
            for (const [kp] of resolutions) {
              arrival.set(`R${kp}`, {
                time: entry.time - tBlock,
                vatID: entry.vatID,
                method: '@',
                target: kp,
              });
            }
            break;
          }
          default:
            break;
        }
        break;
      }
      case 'syscall': {
        switch (entry.ksc[0]) {
          case 'send': {
            const {
              ksc: [_, target, { method, result }],
            } = entry;
            departure.set(result, { vatID: entry.vatID, target, method });
            break;
          }
          case 'resolve': {
            const {
              ksc: [_, _thatVat, parts],
            } = entry;
            for (const [kp, _rejected, _args] of parts) {
              departure.set(`R${kp}`, { vatID: entry.vatID });
            }
            break;
          }
          default:
            // skip
            break;
        }
        break;
      }
      default:
        // pass
        break;
    }
  }

  for (const [vatID, _info] of vatInfo) {
    yield `control ${vatID}\n`;
  }

  for (const [ref, { vatID: src, blockTime }] of departure) {
    if (typeof ref === 'number') {
      blockHeight = ref;
      const dt = new Date(blockTime * 1000).toISOString();
      yield `... block ${blockHeight} ${dt} ...\n`;
      continue;
    }
    if (!arrival.has(ref)) {
      console.warn({ ref });
      continue;
    }
    const {
      time,
      crankNum,
      deliveryNum,
      vatID: dest,
      target,
      method,
    } = arrival.get(ref);
    const t = new Date(time * 1000)
      .toISOString()
      .slice(14, -1)
      .replace(/:/g, '.');
    yield `autonumber ${blockHeight}.${t}\n`;
    yield `${src} -> ${dest} : ${target}.${method}()\n`;
  }
}

/**
 * @param {{
 *   stdin: typeof process.stdin,
 *   stdout: typeof process.stdout,
 * }} io
 */
const main = async ({ stdin, stdout }) =>
  pipeline(stdin, readJSONLines, slogToDiagram, stdout, err => {
    if (err) throw err;
  });

/* TODO: only call main() if this is from CLI */
/* global process */
main({
  stdin: process.stdin,
  stdout: process.stdout,
}).catch(err => {
  console.error(err);
  process.exit(1);
});
