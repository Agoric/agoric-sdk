// run with 'node -r esm convert-slog-to-xsnap.js slog.out vatID'
// creates xsnap-0.js, xsnap-1.js, etc

import process from 'process';
import fs from 'fs';
import path from 'path';

const LF = 0x0a;
async function* readLines(input) {
  let b = Buffer.from('');
  let payloads;
  for await (const chunk of input) {
    b = Buffer.concat([b, chunk]);
    for (;;) {
      const eol = b.indexOf(LF);
      if (eol === -1) {
        break;
      }
      yield b.slice(0, eol);
      b = b.slice(eol + 1);
    }
  }
}

async function* parseRecords(slogFile) {
  const slogF = await fs.createReadStream(slogFile);
  for await (const line of readLines(slogF)) {
    yield JSON.parse(line);
  }
}

async function* unclosing(iter) {
  for (;;) {
    const n = await iter.next();
    if (n.done) {
      return;
    }
    yield n.value;
  }
}

async function listVats(slogFile) {
  console.log(`Please re-run with a single vatID from this list:`);
  for await (const r of parseRecords(slogFile)) {
    const { type, vatID, description } = r;
    if (type === 'create-vat') {
      console.log(`${vatID} : ${description}`);
    }
  }
}

function inject(f, srcFn) {
  const src = fs.readFileSync(path.join(__dirname, srcFn));
  f.write(src);
}

async function buildInit(records, vatID, mode, outputDir) {
  // we take the slog's create-vat entry for vatID and copy its source bundle
  // into output/vatSourceBundle.js, in an export clause, so it can be
  // imported by build.js

  let vatSourceBundle;
  for await (const r of unclosing(records)) {
    console.log(JSON.stringify(r).slice(0, 200));
    if (r.vatID !== vatID) {
      continue;
    }
    if (r.type !== 'create-vat') {
      throw Error(`first record should be create-vat, not ${r.type}`);
    }
    console.log(`got vatSourceBundle`);
    ({ vatSourceBundle } = r);
    break;
  }
  if (!vatSourceBundle) {
    throw Error(`unable to find create-vat for vatID='${vatID}'`);
  }

  let outFn = path.join(outputDir, 'vatSourceBundle.js');
  const f = await fs.createWriteStream(outFn, { flags: 'w' });
  const s = JSON.stringify(vatSourceBundle, undefined, 2);
  f.write(`export const vatSourceBundle = ${s};\n`);
  f.end();

  // that will be imported by build.js
  let inFn = path.join(
    __dirname,
    'input',
    mode === '--node' ? 'build-node.js' : 'build-xsnap.js',
  );
  outFn = path.join(outputDir, 'build.js');
  await fs.promises.copyFile(inFn, outFn);

  // which will import the rest of the code from this rollup'ed bundle
  inFn = path.join(
    __dirname,
    mode === '--node'
      ? 'bundle-functions-node.js'
      : 'bundle-functions-xsnap.js',
  );
  outFn = path.join(outputDir, 'bundle-functions.js');
  await fs.promises.copyFile(inFn, outFn);
}

async function buildDeliveries(records, vatID, outputDir) {
  let deliveryNum;
  let syscallNum;
  let delivery;
  let syscalls;
  let syscallResults;
  for await (const r of unclosing(records)) {
    // console.log(JSON.stringify(r).slice(0,200));
    if (r.vatID !== vatID) {
      continue;
    }
    if (r.type === 'deliver') {
      deliveryNum = r.deliveryNum;
      delivery = r;
      syscalls = [];
      syscallResults = [];
    } else if (r.type === 'syscall') {
      syscallNum = r.syscallNum;
      syscalls.push(r);
    } else if (r.type === 'syscall-result') {
      if (syscallNum !== r.syscallNum) {
        throw Error(
          `got syscall-result for ${r.syscallNum}, not ${syscallNum}`,
        );
      }
      syscallResults.push(r);
    } else if (r.type === 'deliver-result') {
      if (deliveryNum !== r.deliveryNum) {
        throw Error(
          `got deliver-result for $r.deliveryNum}, not ${deliveryNum}`,
        );
      }
      console.log(
        `got complete delivery ${deliveryNum} with ${syscalls.length} syscalls`,
      );

      const src = fs
        .readFileSync(path.join(__dirname, 'input', 'deliver.js'))
        .toString();
      const s = JSON.stringify(
        { delivery, syscalls, syscallResults },
        undefined,
        2,
      );
      const fn = path.join(outputDir, `deliver-${deliveryNum}.js`);
      const f = await fs.createWriteStream(fn, { flags: 'w' });
      f.write(src.replace(`'REPLACE!ME'`, s));
      f.end();
    } else if (r.type === 'console') {
      // ignore
    } else {
      throw Error(`unexpected r.type ${r.type}`);
    }
  }
}

async function run() {
  /*
  function* count() {
    for (let i = 0; i < 10; i++) {
      yield i;
    }
  }

  function* unclosing(i) {
    for (;;) {
      const n = i.next();
      if (n.done) {
        return;
      }
      yield n.value;
    }
  }

  const c = count();
  for (const n of unclosing(c)) {
    if (n > 4) {
      break;
    }
    console.log(n);
  }
  console.log(`midpoint`);
  for (const n of unclosing(c)) {
    console.log(n);
  }
  return;
*/

  const slogFile = process.argv[2];
  const vatID = process.argv[3];
  const mode = process.argv[4];
  const outputDir = process.argv[5];
  console.log(`run`, slogFile, vatID, mode, outputDir);
  if (!vatID) {
    await listVats(slogFile);
    return;
  }

  if (outputDir) await fs.promises.mkdir(outputDir);
  const records = parseRecords(slogFile);
  await buildInit(records, vatID, mode, outputDir);
  console.log(`did buildInit`);
  await buildDeliveries(records, vatID, outputDir);
  console.log(`finished buildDeliveries`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function* parseRecords2(slogFile) {
  const slogF = await fs.createReadStream(slogFile);
  const records = [];
  for await (const line of readLines(slogF)) {
    records.push(JSON.parse(line));
  }
  for (const record of records) {
    yield record;
  }
}
