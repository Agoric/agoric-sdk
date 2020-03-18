// Start a network service
import path from 'path';
import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import fs from 'fs';

import anylogger from 'anylogger';

// We need to CommonJS require morgan or else it warns, until:
// https://github.com/expressjs/morgan/issues/190
// is fixed.
const morgan = require('morgan');

const log = anylogger('web');

const points = new Map();
const broadcasts = new Map();

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(msg);
  }
};

export function makeHTTPListener(basedir, port, host, rawInboundCommand) {
  // Enrich the inbound command with some metadata.
  const inboundCommand = (
    body,
    { url, headers: { origin } = {} } = {},
    id = undefined,
  ) => {
    const obj = { ...body, requestContext: { origin, url, date: Date.now() } };
    return rawInboundCommand(obj).catch(err => {
      const idpfx = id ? `${id} ` : '';
      log.error(
        `${idpfx}inbound error:`,
        err,
        'from',
        JSON.stringify(obj, undefined, 2),
      );
      throw (err && err.message) || JSON.stringify(err);
    });
  };

  const app = express();
  // HTTP logging.
  app.use(
    morgan(`:method :url :status :res[content-length] - :response-time ms`, {
      stream: {
        write(msg) {
          log.info(msg.trimRight());
        },
      },
    }),
  );
  app.use(express.json()); // parse application/json
  const server = http.createServer(app);

  // Override with Dapp html, if any.
  const dapphtmldir = path.join(basedir, 'dapp-html');
  try {
    fs.statSync(dapphtmldir);
    log(`Serving Dapp files from ${dapphtmldir}`);
    app.use(express.static(dapphtmldir));
  } catch (e) {
    // Do nothing.
  }

  // serve the static HTML for the UI
  const htmldir = path.join(basedir, 'html');
  log(`Serving static files from ${htmldir}`);
  app.use(express.static(htmldir));

  const validateOrigin = req => {
    const { origin } = req.headers;
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}:`;

    if (!origin) {
      log.error(id, `Missing origin header`);
      return false;
    }
    const url = new URL(origin);
    const isLocalhost = hostname =>
      hostname.match(/^(localhost|127\.0\.0\.1)$/);

    if (['chrome-extension:', 'moz-extension:'].includes(url.protocol)) {
      // Extensions such as metamask.
      return true;
    }

    if (!isLocalhost(url.hostname)) {
      log.error(id, `Invalid origin host ${origin} is not localhost`);
      return false;
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      log.error(id, `Invalid origin protocol ${origin}`, url.protocol);
      return false;
    }
    return true;
  };

  // accept messages on some well-known endpoints
  // todo: later allow arbitrary endpoints?
  for (const ep of ['/vat', '/wallet-public', '/api']) {
    app.post(ep, (req, res) => {
      if (ep !== '/api' && !validateOrigin(req)) {
        res.json({ ok: false, rej: 'Invalid Origin' });
        return;
      }

      // console.log(`POST ${ep} got`, req.body); // should be jsonable
      inboundCommand(req.body, req)
        .then(
          r => res.json({ ok: true, res: r }),
          rej => res.json({ ok: false, rej }),
        )
        .catch(_ => {});
    });
  }

  // accept WebSocket connections at the root path.
  // This senses the Connection-Upgrade header to distinguish between plain
  // GETs (which should return index.html) and WebSocket requests.. it might
  // be better to move the WebSocket listener off to e.g. /ws with a 'path:
  // "ws"' option.
  const wss = new WebSocket.Server({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    if (!validateOrigin(req)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  });

  server.listen(port, host, () => log.info('Listening on', `${host}:${port}`));

  let lastConnectionID = 0;

  function newConnection(ws, req) {
    lastConnectionID += 1;
    const connectionID = lastConnectionID;
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}[${connectionID}]:`;

    log.info(id, `new WebSocket connection ${req.url}`);

    ws.on('error', err => {
      log.error(id, 'client error', err);
    });

    ws.on('close', (_code, _reason) => {
      log.info(id, 'client closed');
      broadcasts.delete(ws);
      if (req.url === '/captp') {
        inboundCommand({ type: 'CTP_CLOSE', connectionID }, req, id)
          .catch(_ => {})
          .finally(() => points.delete(connectionID));
      }
    });

    if (req.url === '/captp') {
      // This is a point-to-point connection, not broadcast.
      points.set(connectionID, ws);
      inboundCommand(
        { type: 'CTP_OPEN', connectionID },
        req,
        id,
      ).catch(_ => {});
      ws.on('message', async message => {
        try {
          // some things use inbound messages
          const obj = JSON.parse(message);
          obj.connectionID = connectionID;
          await inboundCommand(obj, req, id);
        } catch (error) {
          // eslint-disable-next-line no-use-before-define
          sendJSON({ type: 'CTP_ERROR', connectionID, error });
        }
      });
    } else {
      broadcasts.set(connectionID, ws);
      ws.on('message', async message => {
        try {
          const obj = JSON.parse(message);
          // eslint-disable-next-line no-use-before-define
          sendJSON(await inboundCommand(obj, req, id));
        } catch (error) {
          // ignore
        }
      });
    }
  }
  wss.on('connection', newConnection);

  function sendJSON(obj) {
    const { connectionID, ...rest } = obj;
    if (connectionID) {
      // Point-to-point.
      const c = points.get(connectionID);
      if (c) {
        send(c, JSON.stringify(rest));
      } else {
        log.error(`[${connectionID}]: connection not found`);
      }
    } else {
      // Broadcast message.
      const json = JSON.stringify(rest);
      for (const c of broadcasts.values()) {
        send(c, json);
      }
    }
  }

  return sendJSON;
}
