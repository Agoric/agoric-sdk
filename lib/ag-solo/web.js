// Start a network service
const path = require('path');
const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const morgan = require('morgan');
const fs = require('fs');

const points = new Map();
const broadcasts = new Map();

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(msg);
  }
};

export function makeHTTPListener(basedir, port, host, inboundCommand) {
  const app = express();
  // HTTP logging.
  app.use(
    morgan(
      `HTTP: :method :url :status :res[content-length] - :response-time ms`,
    ),
  );
  app.use(express.json()); // parse application/json
  const server = http.createServer(app);

  // Override with Dapp html, if any.
  const dapphtmldir = path.join(basedir, 'dapp-html');
  try {
    fs.statSync(dapphtmldir);
    console.log(`Serving Dapp files from ${dapphtmldir}`);
    app.use(express.static(dapphtmldir));
  } catch (e) {}

  // serve the static HTML for the UI
  const htmldir = path.join(basedir, 'html');
  console.log(`Serving static files from ${htmldir}`);
  app.use(express.static(htmldir));

  const validateOrigin = req => {
    const { origin } = req.headers;
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}:`;

    if (!origin) {
      console.log(id, `Missing origin header`);
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
      console.log(id, `Invalid origin host ${origin} is not localhost`);
      return false;
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      console.log(id, `Invalid origin protocol ${origin}`, url.protocol);
      return false;
    }
    return true;
  };

  // accept vat messages on /vat
  app.post('/vat', (req, res) => {
    if (!validateOrigin(req)) {
      res.json({ ok: false, rej: 'Invalid Origin' });
      return;
    }

    // console.log(`POST /vat got`, req.body); // should be jsonable
    inboundCommand(req.body).then(
      r => res.json({ ok: true, res: r }),
      rej => res.json({ ok: false, rej }),
    );
  });

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

  server.listen(port, host, () =>
    console.log('Listening on', `${host}:${port}`),
  );

  let lastConnectionID = 0;

  function newConnection(ws, req) {
    lastConnectionID += 1;
    const connectionID = lastConnectionID;
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}[${connectionID}]:`;

    console.log(id, `new ws connection ${req.url}`);

    ws.on('error', err => {
      console.log(id, 'client error', err);
    });

    ws.on('close', (_code, _reason) => {
      console.log(id, 'client closed');
      broadcasts.delete(ws);
      if (req.url === '/captp') {
        inboundCommand({ type: 'CTP_CLOSE', connectionID }).catch(_ => {});
        points.delete(connectionID);
      }
    });

    if (req.url === '/captp') {
      // This is a point-to-point connection, not broadcast.
      points.set(connectionID, ws);
      inboundCommand({ type: 'CTP_OPEN', connectionID }).catch(err => {
        console.log(id, `error establishing connection`, err);
      });
      ws.on('message', async message => {
        try {
          // some things use inbound messages
          const obj = JSON.parse(message);
          obj.connectionID = connectionID;
          await inboundCommand(obj);
        } catch (e) {
          console.log(id, 'client error', e);
          const error = e.message || JSON.stringify(e);
          // eslint-disable-next-line no-use-before-define
          sendJSON({ type: 'CTP_ERROR', connectionID, error });
        }
      });
    } else {
      broadcasts.set(connectionID, ws);
      ws.on('message', async message => {
        // we ignore messages arriving on the default websocket port, it is only for
        // outbound broadcasts
        console.log(id, `ignoring message on WS port`, String(message));
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
        console.log(`[${connectionID}]: connection not found`);
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
