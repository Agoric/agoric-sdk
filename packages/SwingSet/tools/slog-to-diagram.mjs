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
  let dInfo;

  for await (const entry of entries) {
    switch (entry.type) {
      case 'create-vat':
        // TODO label participants with vat names
        vatInfo.set(entry.vatID, entry);
        break;
      case 'cosmic-swingset-end-block-start':
        tBlock = entry.time;
        blockHeight = entry.blockHeight;
        arrival.set(blockHeight, {
          time: entry.time,
          blockTime: entry.blockTime,
        });
        break;
      case 'deliver': {
        const { kd } = entry;
        vatInfo.set(entry.vatID, null);
        switch (kd[0]) {
          case 'message': {
            const [
              _tag,
              target,
              {
                method,
                args: { body },
                result,
              },
            ] = kd;
            dInfo = {
              time: entry.time,
              elapsed: entry.time - tBlock,
              crankNum: entry.crankNum,
              deliveryNum: entry.deliveryNum,
              vatID: entry.vatID,
              target,
              method,
              argSize: body.length,
            };
            arrival.set(result || {}, dInfo);
            break;
          }
          case 'notify': {
            const [_tag, resolutions] = kd;
            for (const [kp] of resolutions) {
              dInfo = {
                time: entry.time,
                elapsed: entry.time - tBlock,
                vatID: entry.vatID,
                method: '@',
                target: kp,
              };
              arrival.set(`R${kp}`, dInfo);
            }
            break;
          }
          default:
            break;
        }
        break;
      }
      case 'deliver-result': {
        const { dr } = entry;
        if (dr[2] && 'compute' in dr[2]) {
          const { compute } = dr[2];
          dInfo.compute = compute;
        }
        break;
      }
      case 'syscall': {
        switch (entry.ksc[0]) {
          case 'send': {
            const {
              ksc: [_, target, { method, result }],
            } = entry;
            departure.set(result, {
              time: entry.time,
              vatID: entry.vatID,
              target,
              method,
            });
            break;
          }
          case 'resolve': {
            const {
              ksc: [_, _thatVat, parts],
            } = entry;
            for (const [kp, _rejected, _args] of parts) {
              departure.set(`R${kp}`, { time: entry.time, vatID: entry.vatID });
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

  const byTime = [...arrival].sort((a, b) => a[1].time - b[1].time);

  for (const [
    ref,
    { elapsed, vatID: dest, target, method, argSize, compute, blockTime },
  ] of byTime) {
    if (typeof ref === 'number') {
      blockHeight = ref;
      const dt = new Date(blockTime * 1000).toISOString().slice(0, -5);
      yield `... block ${blockHeight} ${dt} ...\n`;
      continue;
    }
    const t = Math.round(elapsed * 1000) / 1000;
    // yield `autonumber ${blockHeight}.${t}\n`;
    yield `autonumber ${t}\n`;
    const showCompute = compute && compute > 50000 ? compute : '';
    if (typeof ref === 'object') {
      yield `[-> ${dest} : ${target}.${method}(${argSize ||
        ''}) ${showCompute}\n`;
      continue;
    }
    if (!departure.has(ref)) {
      console.warn({ ref });
      continue;
    }
    const { vatID: src } = departure.get(ref);
    yield `${src} -> ${dest} : ${target}.${method}(${argSize ||
      ''}) ${showCompute}\n`;
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
