// vatWorker driver for node.js
// contrast with main.js for xs
import '@agoric/install-ses';

import { main as vatWorker } from './vatWorker';

const INFD = 3;
const OUTFD = 4;

function makePipe(io, sleep) {
  function write(data) {
    let done = 0;
    for (;;) {
      try {
        done += io.writeSync(OUTFD, data.slice(done));
        if (done >= data.length) {
          return done;
        }
      } catch (writeFailed) {
        if (writeFailed.code === 'EAGAIN') {
          sleep(0.1);
          // try again
        } else {
          throw writeFailed;
        }
      }
    }
  }

  return harden({
    writeMessage(msg) {
      write(`${msg.length}:`);
      write(msg);
      write(',');
    },
    readMessage(EOF) {
      let buf = Buffer.from('999999999:', 'utf-8');
      let len = null;
      let colonPos = null;
      let offset = 0;

      for (;;) {
        // console.error('readMessage', { length: buf.length, len, colonPos, offset });
        try {
          offset += io.readSync(INFD, buf, {
            offset,
            length: buf.length - offset,
          });
        } catch (err) {
          if (err.code === 'EAGAIN') {
            sleep(0.1);
            // eslint-disable-next-line no-continue
            continue;
          } else if (err.code === 'EOF') {
            throw EOF;
          } else {
            throw err;
          }
        }
        if (len === null) {
          colonPos = buf.indexOf(':');
          if (colonPos > 0) {
            const digits = buf.slice(0, colonPos).toString('utf-8');
            len = parseInt(digits, 10);
            const rest = Buffer.alloc(len + 1);
            // console.error('parsed len. copy', { digits, len, targetStart: 0, sourceStart: colonPos + 1, sourceEnd: offset });
            buf.copy(rest, 0, colonPos + 1, offset);
            buf = rest;
            offset -= colonPos + 1;
          }
        } else if (offset === len + 1) {
          const delim = buf.slice(-1).toString('utf-8');
          if (delim !== ',') {
            throw new Error(
              `bad netstring: length ${len} expected , found [${delim}]`,
            );
          }
          const result = buf.slice(0, -1).toString('utf-8');
          // console.error({ colon: colonPos, len, result: result.slice(0, 20) });
          return result;
        }
      }
    },
  });
}

async function main({ setImmediate, fs, spawnSync }) {
  const sleep = secs => spawnSync('sleep', [secs]);
  const pipe = makePipe(fs, sleep);
  return vatWorker({
    readMessage: pipe.readMessage,
    writeMessage: pipe.writeMessage,
    setImmediate,
  });
}

main({
  setImmediate,
  // eslint-disable-next-line global-require
  spawnSync: require('child_process').spawnSync,
  fs: {
    // eslint-disable-next-line global-require
    readSync: require('fs').readSync,
    // eslint-disable-next-line global-require
    writeSync: require('fs').writeSync,
  },
})
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit(0));
