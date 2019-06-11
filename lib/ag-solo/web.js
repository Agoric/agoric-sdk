// Start a network service
const fs = require('fs');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const morgan = require('morgan');

const connections = new Set();

export function makeHTTPListener(basedir, port, host, inboundCommand) {
  const app = express();
  // HTTP logging.
  app.use(
    morgan(
      `HTTP: :method :url :status :res[content-length] - :response-time ms`,
    ),
  );
  app.use(express.json()); // parse application/json
  const server = app.listen(port, host, () =>
    console.log('Listening on', `${host}:${port}`),
  );

  // serve the static HTML for the UI
  const htmldir = path.join(basedir, 'html');
  console.log(`Serving static files from ${htmldir}`);
  app.use(express.static(htmldir));

  // accept vat messages on /vat
  app.post('/vat', (req, res) => {
    // console.log(`POST /vat got`, req.body); // should be jsonable
    inboundCommand(req.body).then(
      r => res.json({ ok: true, res: r }),
      rej => res.json({ ok: false, rej }),
    );
  });

  // accept WebSocket connections at the root path. TODO: I'm guessing that
  // this senses the Connection-Upgrade header to distinguish between plain
  // GETs (which should return index.html) and WebSocket requests.. it might
  // be better to move the WebSocket listener off to e.g. /ws with a 'path:
  // "ws"' option.
  const wss = new WebSocket.Server({ server });

  function newConnection(ws, req) {
    console.log(`new ws connection`);
    connections.add(ws);

    ws.on('error', err => {
      console.log('client error', err);
    });

    ws.on('close', (code, reason) => {
      console.log('client closed');
      connections.delete(ws);
    });

    ws.on('message', message => {
      // we ignore messages arriving on the websocket port, it is only for
      // outbound broadcasts
      console.log(`ignoring message on WS port`, String(message));
    });
  }
  wss.on('connection', newConnection);

  function broadcastJSON(obj) {
    connections.forEach(c => {
      c.send(JSON.stringify(obj));
    });
  }

  return broadcastJSON;
}
