/* eslint-disable no-continue */
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
      `extract-contract-from-transcript.js transcript-vNN.sst >contract-bundle.zip`,
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
    if (!t.d) continue;
    if (t.d[0] !== 'message') continue;
    assert.equal(t.d[0], 'message');
    assert.equal(t.d[1], 'o+0');
    const methargs = t.d[2].methargs;
    const body = JSON.parse(methargs.body);
    const [_method, margs] = body;
    const bundle = margs[0];
    assert.equal(bundle.moduleFormat, 'endoZipBase64');
    const b64 = bundle.endoZipBase64;
    const zipBytes = decodeBase64(b64);
    fs.writeFileSync('contract-bundle.zip', zipBytes);
    break;
  }
}

run().catch(err => console.log('err', err));
