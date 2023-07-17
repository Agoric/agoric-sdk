// @ts-nocheck
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';
import '@endo/init';

import { decodeBase64 } from '@endo/base64';

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      `extract-vat-from-transcript.js transcript-vNN.sst >vat-bundle.zip`,
    );
  }
  const [transcriptFile] = args;
  let transcriptF = fs.createReadStream(transcriptFile);
  if (transcriptFile.endsWith('.gz')) {
    transcriptF = transcriptF.pipe(zlib.createGunzip());
  }
  const lines = readline.createInterface({ input: transcriptF });
  for await (const line of lines) {
    const t = JSON.parse(line);
    // find the first message
    // 0: create-vat
    // 1: startVat
    // 2: bringOutYourDead
    // 3: message(executeContract(bundle, ...args))
    if (t.type !== 'create-vat') continue;
    const { vatSourceBundle: bundle } = t;
    assert.equal(bundle.moduleFormat, 'endoZipBase64');
    const b64 = bundle.endoZipBase64;
    const zipBytes = decodeBase64(b64);
    fs.writeFileSync('vat-bundle.zip', zipBytes);
    break;
  }
}

process.exitCode = 1;
run().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
