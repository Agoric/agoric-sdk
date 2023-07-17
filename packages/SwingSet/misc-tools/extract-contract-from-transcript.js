// @ts-nocheck
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';
import '@endo/init';

import { decodeBase64 } from '@endo/base64';

// Given a transcript (produced by
// e.g. extract-transcript-from-slogfile.js), which is assumed to be a
// ZCF vat, find the contract bundle and write it to
// 'contract-bundle.zip'.

function processBundle(bundle) {
  assert.equal(bundle.moduleFormat, 'endoZipBase64');
  const b64 = bundle.endoZipBase64;
  const zipBytes = decodeBase64(b64);
  fs.writeFileSync('contract-bundle.zip', zipBytes);
}

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
    // 1: startVat : with vatParameters.contractBundleCap, or not
    // 2: bringOutYourDead
    // 3: message(executeContract(bundle, ...args))
    if (!t.d) continue;
    if (t.d[0] === 'startVat') {
      const body = JSON.parse(t.d[1].body);
      if (body.contractBundleCap) {
        // contract started from bundlecap, look for D(bundlecap).getBundle()
        for (const syscall of t.syscalls) {
          if (syscall.d[0] === 'callNow') {
            // {"d":["callNow","d-70","getBundle",{"body":"[]","slots":[]}],"response":["ok",{"body":"{\"endoZipBase64\":\"UEsDBAoA...
            assert.equal(syscall.d[2], 'getBundle');
            assert.equal(syscall.response[0], 'ok');
            return processBundle(JSON.parse(syscall.response[1].body));
          }
        }
      }
    }
    if (t.d[0] !== 'message') continue;
    assert.equal(t.d[0], 'message');
    assert.equal(t.d[1], 'o+0');
    const methargs = t.d[2].methargs;
    const body = JSON.parse(methargs.body);
    const [_method, margs] = body;
    const bundle = margs[0];
    return processBundle(bundle);
  }
  assert.fail('unable to find evidence of contract bundle');
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
