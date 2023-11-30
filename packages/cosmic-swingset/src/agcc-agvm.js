/* global process */
// @ts-check
import fs from 'fs';
import { Worker } from 'worker_threads';
import stringify from './helpers/json-stable-stringify.js';
import { makeJsonRpcService } from './helpers/input-worker.js';

const DAEMON_PORT = 321;

const debug = (..._args) => {}; // console.error(..._args);

const getFdsFromSpec = spec => {
  const obj = JSON.parse(spec);

  const { agd: { fd: fds = [] } = {} } = obj || {};
  if (!Array.isArray(fds)) {
    throw Error(
      `VM spec ${spec} does not have an array for agd.fd, has ${fds}`,
    );
  }
  const ifd = fds[0] || 0;
  const ofd = fds[1] || ifd || 1;

  return [ifd, ofd];
};

export const makeAgccFromSpec = spec => {
  const [ifd, ofd] = getFdsFromSpec(spec);
  debug('Got agd', ifd, ofd);

  let sendToNode;
  const dispatchObj = obj => {
    const { method, params, result, error, id } = obj;
    debug('dispatch', method, params, id);
    if (method === 'agvm.ReceiveMessage') {
      const [{ Port, Data, NeedsReply }] = params;
      /** @type {number | string} */
      let replyPort = 0;
      if (NeedsReply) {
        replyPort = `r${id}`;
      }
      sendToNode(Port, replyPort, Data);
    } else if (method) {
      throw Error(`Unknown method ${method}`);
    } else if (error != null) {
      throw Error(`Unexpected reply ${id} with error ${error}`);
    } else {
      throw Error(`Unexpected reply ${id} with result ${result}`);
    }
  };

  const send = obj => {
    debug('send', obj);
    fs.writeSync(ofd, `${stringify(obj)}\n`);
  };

  let rpcService;
  let lastSendId = 0;
  return {
    runAgCosmosDaemon(nodePort, dispatch, _daemonArgv) {
      debug('Got runAgCosmosDaemon', nodePort, dispatch, _daemonArgv);
      sendToNode = (port, replyPort, msg) => {
        const match = String(replyPort).match(/^r(\d+)$/);
        if (match) {
          replyPort = Number(match[1]);
        }
        const replier = {
          resolve(res) {
            if (!match) {
              debug('ignoring resolution', res, 'to', replyPort);
              return;
            }
            const obj = {
              id: replyPort,
              result: String(res),
              error: null,
            };
            send(obj);
          },
          reject(rej) {
            if (!match) {
              debug('ignoring rejection', rej, 'to', replyPort);
              return;
            }
            const obj = {
              id: replyPort,
              result: null,
              error: String(rej),
            };
            send(obj);
          },
        };
        dispatch(port, msg, replier);
      };

      const w = new Worker(new URL('./agd-input-worker.js', import.meta.url));
      rpcService = makeJsonRpcService(w, ifd, dispatchObj);
      rpcService
        .start()
        .then(() => process.exit())
        .catch(err => {
          console.error(`rpcService stopped`, err);
          process.exit(1);
        });
      return DAEMON_PORT;
    },
    send(port, msg) {
      const match = String(port).match(/^r(\d+)$/);
      let needReply = true;
      if (match) {
        // We're sending a reply, so dig out the id.
        port = Number(match[1]);
        needReply = false;
      }
      const id = needReply ? (lastSendId += 1) : port;
      const obj = {
        method: 'agd.ReceiveMessage',
        params: [
          {
            Port: port,
            Data: msg,
            NeedsReply: needReply,
          },
        ],
        id,
      };
      if (!needReply) {
        send(obj);
        return '<no-reply-requested>';
      }

      const wakeup = rpcService.makeReplyWakeup(id);
      send(obj);
      const ret = wakeup.wait();

      if (ret.id !== id) {
        throw Error(`Expected id ${id}, got ${ret.id}`);
      } else if (ret.error) {
        throw Error(ret.error);
      }
      return ret.result;
    },
  };
};
