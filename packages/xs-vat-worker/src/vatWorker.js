import { importBundle } from '@agoric/import-bundle';
import { HandledPromise } from '@agoric/eventual-send';
// TODO? import anylogger from 'anylogger';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

const EOF = new Error('EOF');

// from SwingSet/src/controller.js
function makeConsole(_tag) {
  const log = console; // TODO? anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function makeVatEndowments(consoleTag) {
  return harden({
    console: makeConsole(`SwingSet:${consoleTag}`),
    HandledPromise,
    // TODO: re2 is a RegExp work-a-like that disables backtracking expressions for
    // safer memory consumption
    RegExp,
  });
}

// see also: detecting an empty vat promise queue (end of "crank")
// https://github.com/Agoric/agoric-sdk/issues/45
function endOfCrank(setImmediate) {
  return new Promise((resolve, _reject) => {
    setImmediate(() => {
      // console.log('hello from setImmediate callback. The promise queue is presumably empty.');
      resolve();
    });
  });
}

function makeWorker(io, setImmediate) {
  let vatNS = null;
  let dispatch;
  let state;

  const format = msg => JSON.stringify(msg);
  const sync = (method, args) => {
    io.writeMessage(format({ msgtype: 'syscall', method, args }));
    return JSON.parse(io.readMessage());
  };
  const syscall = harden({
    subscribe(...args) {
      return sync('subscribe', args);
    },
    send(...args) {
      return sync('send', args);
    },
    fulfillToData(...args) {
      return sync('fulfillToData', args);
    },
    fulfillToPresence(...args) {
      return sync('fulfillToPresence', args);
    },
    reject(...args) {
      return sync('reject', args);
    },
  });

  async function loadBundle(name, bundle) {
    if (vatNS !== null) {
      throw new Error('bundle already loaded');
    }

    vatNS = await importBundle(bundle, {
      filePrefix: name,
      endowments: makeVatEndowments(name),
    });
    // TODO: be sure console.log isn't mixed with protocol stream
    // console.log('loaded bundle with methods', Object.keys(vatNS));

    state = {}; // ??
    dispatch = makeLiveSlots(syscall, state, vatNS.buildRootObject);
  }

  function turnCrank(dispatchType, args) {
    return new Promise((resolve, reject) => {
      try {
        dispatch[dispatchType](...args);
      } catch (error) {
        // console.log({ dispatchError: error });
        reject(error);
        return;
      }
      endOfCrank(setImmediate).then(resolve);
    });
  }

  const name = 'WORKER'; // TODO?
  async function handle(message) {
    switch (message.msgtype) {
      case 'load-bundle':
        try {
          await loadBundle(name, message.bundle);
        } catch (error) {
          // console.log('load-bundle failed:', error);
          io.writeMessage(
            format({ msgtype: 'load-bundle-nak', error: error.message }),
          );
          break;
        }
        io.writeMessage(format({ msgtype: 'load-bundle-ack' }));
        break;
      case 'dispatch':
        try {
          await turnCrank(message.type, message.args);
        } catch (error) {
          io.writeMessage(
            format({
              msgtype: 'dispatch-nak',
              error: error instanceof Error ? error.message : error,
            }),
          );
          break;
        }
        io.writeMessage(format({ msgtype: 'dispatch-ack' }));
        break;
      case 'finish':
        io.writeMessage(format({ msgtype: 'finish-ack' }));
        break;
      default:
        console.warn('unexpected msgtype', message.msgtype);
    }
    return message.msgtype;
  }

  return harden({ handle });
}

export async function main({ readMessage, writeMessage, setImmediate }) {
  const worker = makeWorker({ readMessage, writeMessage }, setImmediate);

  for (;;) {
    let message;
    try {
      // eslint-disable-next-line no-await-in-loop
      message = JSON.parse(readMessage(EOF));
    } catch (noMessage) {
      if (noMessage === EOF) {
        return;
      }
      console.warn('problem getting message:', noMessage);
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const msgtype = await worker.handle(message);
    if (msgtype === 'finish') {
      break;
    }
  }
}
