import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`extract-transcript-from-slogfile.js SLOGFILE[.gz] VATID`);
    console.log(` - writes transcript to transcript-VATID.sst`);
  }
  const [slogFile, vatID] = args;
  let slogF = fs.createReadStream(slogFile);
  if (slogFile.endsWith('.gz')) {
    slogF = slogF.pipe(zlib.createGunzip());
  }
  const lines = readline.createInterface({ input: slogF });
  // let lineNumber = 0;
  const fn = `transcript-${vatID}.sst`;
  const fd = fs.openSync(fn, 'w');
  let delivery;
  let syscall;
  let syscalls;
  let transcriptNum = 0;
  for await (const line of lines) {
    // lineNumber += 1;
    const e = JSON.parse(line);
    if (e.vatID !== vatID) {
      continue; // wrong vat, or not associated with any vat
    }
    console.log(`e:`, e.type);
    switch (e.type) {
      case 'start-replay-delivery': {
        console.log(`cannot reconstruct transcript from slogfile when`);
        console.log(`vat ${vatID} has replayed deliveries (the slogfile`);
        console.log(`does not record syscall results)`);
        throw Error(`unable to reconstruct transcript`);
      }
      case 'create-vat': {
        const { type, dynamic, vatParameters, vatSourceBundle } = e;
        const t = {
          transcriptNum,
          type,
          vatID,
          dynamic,
          vatParameters,
          vatSourceBundle,
        };
        transcriptNum += 1;
        // first line of transcript is the source bundle
        fs.writeSync(fd, JSON.stringify(t));
        fs.writeSync(fd, '\n');
        break;
      }
      case 'deliver': {
        console.log(` -- deliver`);
        delivery = e.vd;
        syscalls = [];
        break;
      }
      case 'syscall': {
        console.log(` -- syscall`);
        syscall = { d: e.vsc }; // vso: e.g. ["vatstoreGet", vref]
        break;
      }
      case 'syscall-result': {
        console.log(` -- syscall-result`);
        syscall.response = e.vsr;
        syscalls.push(syscall);
        break;
      }
      case 'deliver-result': {
        console.log(` -- deliver-result`);
        const entry = { transcriptNum, d: delivery, syscalls };
        transcriptNum += 1;
        fs.writeSync(fd, JSON.stringify(entry));
        fs.writeSync(fd, '\n');
        break;
      }
      case 'heap-snapshot-save': {
        console.log(' -- heap-snapshot-save');
        const { type, snapshotID } = e;
        const t = { transcriptNum, type, vatID, snapshotID };
        transcriptNum += 1;
        fs.writeSync(fd, JSON.stringify(t));
        fs.writeSync(fd, '\n');
        break;
      }
      default:
        break;
    }
  }
  fs.closeSync(fd);
}

run().catch(err => console.log('err', err));
