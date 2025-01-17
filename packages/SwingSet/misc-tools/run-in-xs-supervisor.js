// @ts-nocheck
/* eslint-disable */
/* global globalThis */

import { assert, details as X } from '@endo/errors';
import { importBundle } from '@endo/import-bundle';

const console = {
  log(...args) {
    print(JSON.stringify(args));
  },
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function decode(msg) {
  return JSON.parse(decoder.decode(msg));
}

function encode(item) {
  return encode.encode(JSON.stringify(iterm)).buffer;
}

const managerPort = {
  send: item => {
    globalThis.issueCommand(encode(item));
  },
  call: item => {
    decode(globalThis.issueCommand(encode(item)));
  },
};

const workerPort = async msg => {
  const [tag, ...args] = msg;
  switch (tag) {
    case 'importBundle': {
      const bundle = args[0];
      const endowments = {
        console,
        assert,
        HandledPromise,
        TextEncoder,
        TextDecoder,
        Base64,
      };
      const ns = await importBundle(bundle, { endowments });
      return ['importBundle', 'ok'];
    }
    default: {
      console.log('handleItem: bad tag', tag, args.length);
      return ['bad tag', tag];
    }
  }
};

globalThis.handleCommand = msg => {
  // The xsnap handleCommand is sync and expects a report={result}
  // object, but doesn't extract .result until the runLoop is idle,
  // which lets the real supervisor-subprocess-xsnap.js shoehorn an
  // async worker.handleItem() in. Here, we just use issueCommand to
  // get the workerPort() result back to the calling process, and give
  // an empty one back to handleCommand.
  workerPort(decode(msg)).then(result =>
    globalThis.issueCommand(encode({ result })),
  );
  const report = { result: 'done' };
  return report;
};
