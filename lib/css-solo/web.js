
// Start a network service
const fs = require('fs');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const morgan = require('morgan');

// we remember all messages, so new connections get the full history
const allOutboundMessages = [];
let highestInbound = 0;
const connections = new Set();

export function makeHTTPDeliverator() {
  function deliver(newMessages, acknum) {
    newMessages.forEach(nm => {
      const [num, msg] = nm;
      allOutboundMessages.push(msg);
      connections.forEach(c => {
        c.send(JSON.stringify({ type: 'message', message: msg }));
      });
    });
    if (acknum > highestInbound) {
      highestInbound = acknum;
      connections.forEach(c => {
        c.send(JSON.stringify({ type: 'highestInbound', highestInbound }));
      });
    }
  }

  return deliver;
}

export function makeHTTPListener(basedir, port, inbound) {
  const app = express();
  // HTTP logging.
  app.use(morgan(`HTTP: :method :url :status :res[content-length] - :response-time ms`));
  const server = app.listen(port, _ => console.log('Listening on', port));

  // serve the static HTML for the UI
  const htmldir = path.join(basedir, 'html');
  console.log(`Serving static files from ${htmldir}`);
  app.use(express.static(htmldir));

  // accept WebSocket connections at the root path. TODO: I'm guessing that
  // this senses the Connection-Upgrade header to distinguish between plain
  // GETs (which should return index.html) and WebSocket requests.. it might
  // be better to move the WebSocket listener off to e.g. /ws with a 'path:
  // "ws"' option.
  const wss = new WebSocket.Server({server});

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
      try {
        const msg = String(message);
        console.log(`received`, msg);
        const messages = JSON.parse(msg);
        const ack = 0; // http client never acks anything
        inbound('http', messages, ack);
      } catch (e) {
        console.log(`error handling message`, e);
      }
    });

    allOutboundMessages.forEach(msg => {
      ws.send(JSON.stringify({ type: 'message', message: msg }));
    });
  }

  wss.on('connection', newConnection);
}
