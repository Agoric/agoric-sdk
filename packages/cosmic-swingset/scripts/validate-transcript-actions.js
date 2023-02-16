#! /usr/bin/env node
// @ts-check

// import '@endo/init';
import '@endo/init/debug.js';

import process from 'process';
import { createReadStream } from 'node:fs';
import { Transform } from 'stream';
import zlib from 'zlib';

import ReadlineTransform from 'readline-transform';
import { assert, details as X, quote as q } from '@agoric/assert';

import { validateWalletAction } from '../src/validate-inbound.js';

/**
 * @param {string} filePath
 * @returns {import('stream').Readable}
 */
const getTranscriptStream = filePath => {
  /** @type {import('stream').Readable} */
  let rawStream = filePath === '-' ? process.stdin : createReadStream(filePath);
  if (filePath.endsWith('.gz')) {
    rawStream = rawStream.pipe(zlib.createGunzip());
  }
  const lineTransform = new ReadlineTransform({ readableObjectMode: true });
  const parseStream = new Transform({
    objectMode: true,
    transform(line, _encodeing, callback) {
      try {
        callback(null, harden(JSON.parse(line)));
      } catch (e) {
        const error = assert.error(X`Error while parsing ${line}`);
        assert.note(error, X`Caused by ${q(e)}`);
        callback(error);
      }
    },
  });
  return rawStream.pipe(lineTransform).pipe(parseStream);
};

const main = async ({ inputFile }) => {
  const chainInputTranscript = getTranscriptStream(inputFile);

  for await (const event of chainInputTranscript) {
    if (
      event.type === 'inbound-action' &&
      event.action.type === 'WALLET_SPEND_ACTION'
    ) {
      await validateWalletAction(event.action).catch(err => {
        console.error(
          'Smart Wallet action failed validation',
          event.action,
          err,
        );
      });
    }
  }

  chainInputTranscript.destroy();
};

// process.once('beforeExit', exitCode => {
//   console.log(
//     'beforeExit',
//     exitCode,
//     process._getActiveRequests(),
//     process._getActiveHandles(),
//   );
// });

main({ inputFile: process.argv[2] }).then(
  () => {
    process.exit(process.exitCode || 0);
  },
  rej => {
    // console.log(process._getActiveRequests(), process._getActiveHandles());
    console.error(rej);
    process.exit(process.exitCode || 2);
  },
);
