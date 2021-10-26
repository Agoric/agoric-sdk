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
  // track end-of-delivery for deactivating actors
  const deliverResults = [];

  let tBlock;
  let blockHeight;
  let dInfo;

  for await (const entry of entries) {
    // handle off-chain use, such as in unit tests
    if (!tBlock) {
      tBlock = entry.time;
    }
    switch (entry.type) {
      case 'create-vat':
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
        if (!vatInfo.has(entry.vatID))
          vatInfo.set(entry.vatID, {
            type: 'create-vat',
            time: entry.time,
            vatID: entry.vatID,
          });
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
              type: entry.type,
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
            for (const [kp, { state }] of resolutions) {
              dInfo = {
                type: entry.type,
                time: entry.time,
                elapsed: entry.time - tBlock,
                vatID: entry.vatID,
                state,
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
        // track end-of-delivery for deactivating actors
        deliverResults.push([
          entry.type,
          { time: entry.time, type: entry.type, vatID: entry.vatID },
        ]);
        // supplement deliver entry with compute meter
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
              type: entry.type,
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
              departure.set(`R${kp}`, {
                type: entry.type,
                time: entry.time,
                vatID: entry.vatID,
              });
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

  yield '@startuml slog\n';

  for (const [vatID, info] of vatInfo) {
    const { name = '???' } = info || {};
    const label = JSON.stringify(`${vatID}:${name}`); // stringify to add ""s
    yield `control ${label} as ${vatID}\n`;
  }

  const byTime = [...arrival, ...deliverResults].sort(
    (a, b) => a[1].time - b[1].time,
  );

  let active;
  for (const [
    ref,
    {
      type,
      elapsed,
      vatID: dest,
      target,
      method,
      state,
      argSize,
      compute,
      blockTime,
    },
  ] of byTime) {
    if (type === 'deliver-result') {
      if (active) {
        // yield `deactivate ${active}\n`;
        active = undefined;
      }
      continue;
    }
    if (typeof ref === 'number') {
      blockHeight = ref;
      const dt = new Date(blockTime * 1000).toISOString().slice(0, -5);
      yield `... block ${blockHeight} ${dt} ...\n`;
      continue;
    }
    const t = Math.round(elapsed * 1000) / 1000;

    // add note to compute-intensive deliveries
    const computeNote =
      compute && compute > 50000
        ? `note right\n${compute.toLocaleString()} compute\nend note\n`
        : undefined;

    // yield `autonumber ${blockHeight}.${t}\n`;
    yield `autonumber ${t}\n`;
    if (typeof ref === 'object') {
      yield `[-> ${dest} : ${target}.${method || state}(${argSize || ''})\n`;
      if (computeNote) yield computeNote;
      continue;
    }
    if (!departure.has(ref)) {
      console.warn('no source for', { ref });
      yield `[o-> ${dest} : ${ref} <- ${target}.${method || state}(${argSize ||
        ''})\n`;
      if (computeNote) yield computeNote;
      continue;
    }
    const { vatID: src } = departure.get(ref);
    const label = method
      ? `${ref} <- ${target}.${method}(${argSize || ''})`
      : `${target}.${state}()`;
    // label return values (resolutions) with dotted lines
    const arrow = method ? '->' : '-->';

    yield `${src} ${arrow} ${dest} : ${label}\n`;

    // show active vat
    if (type === 'deliver' && active !== dest) {
      // yield `activate ${dest}\n`;
      active = dest;
    }

    if (computeNote) yield computeNote;
  }

  yield '@enduml\n';
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
