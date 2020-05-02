// Start a network service
import path from 'path';
import http from 'http';
import { createConnection } from 'net';
import express from 'express';
import WebSocket from 'ws';
import fs from 'fs';

import anylogger from 'anylogger';

// We need to CommonJS require morgan or else it warns, until:
// https://github.com/expressjs/morgan/issues/190
// is fixed.
const morgan = require('morgan');

const log = anylogger('web');

const channels = new Map();

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(msg);
  }
};

export async function makeHTTPListener(basedir, port, host, rawInboundCommand) {
  // Enrich the inbound command with some metadata.
  const inboundCommand = (
    body,
    { channelID, dispatcher, url, headers: { origin } = {} } = {},
    id = undefined,
  ) => {
    const obj = {
      ...body,
      meta: { channelID, dispatcher, origin, url, date: Date.now() },
    };
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
          log(msg.trimRight());
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

    if (!req.url.startsWith('/private/')) {
      // Allow any origin that's not marked private.
      return true;
    }

    if (!origin) {
      log.error(id, `Missing origin header`);
      return false;
    }
    const url = new URL(origin);
    const isLocalhost = hostname =>
      hostname.match(/^(localhost|127\.0\.0\.1)$/);

    if (['chrome-extension:', 'moz-extension:'].includes(url.protocol)) {
      // Extensions such as metamask can access the wallet.
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

  // accept POST messages to arbitrary endpoints
  app.post('*', (req, res) => {
    if (!validateOrigin(req)) {
      res.json({ ok: false, rej: 'Unauthorized Origin' });
      return;
    }

    // console.debug(`POST ${ep} got`, req.body); // should be jsonable
    inboundCommand(req.body, req, `POST`)
      .then(
        r => res.json({ ok: true, res: r }),
        rej => res.json({ ok: false, rej }),
      )
      .catch(_ => {});
  });

  // accept WebSocket channels at the root path.
  // This senses the Upgrade header to distinguish between plain
  // GETs (which should return index.html) and WebSocket requests.
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

  // Test to see if the listener already exists.
  await new Promise((resolve, reject) => {
    const to = setTimeout(
      () =>
        reject(
          Error(`Something is listening (but suspended) on ${host}:${port}`),
        ),
      3000,
    );
    const existing = createConnection(port, host, _c => {
      clearTimeout(to);
      reject(Error(`Something is aready listening on ${host}:${port}`));
    });
    existing.on('error', err => {
      clearTimeout(to);
      if (err.code === 'ECONNREFUSED') {
        // Success! host:port is not currently listening.
        resolve();
      } else {
        reject(err);
      }
    });
  });

  server.listen(port, host, () => log.info('Listening on', `${host}:${port}`));

  let lastChannelID = 0;

  function newChannel(ws, req) {
    lastChannelID += 1;
    const channelID = lastChannelID;
    const meta = { ...req, channelID };
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}[${channelID}]:`;

    log(id, `new WebSocket ${req.url}`);

    // Register the point-to-point channel.
    channels.set(channelID, ws);

    ws.on('error', err => {
      log.error(id, 'client error', err);
    });

    ws.on('close', (_code, _reason) => {
      log(id, 'client closed');
      inboundCommand(
        { type: 'ws/meta' },
        { ...meta, dispatcher: 'onClose' },
        id,
      ).finally(() => channels.delete(channelID));
    });

    inboundCommand({ type: 'ws/meta' }, { ...meta, dispatcher: 'onOpen' }, id);

    ws.on('message', async message => {
      let obj = {};
      try {
        obj = JSON.parse(message);
        const res = await inboundCommand(obj, meta, id);

        // eslint-disable-next-line no-use-before-define
        sendJSON({ ...res, meta });
      } catch (error) {
        inboundCommand(
          { ...obj, error },
          { ...meta, dispatcher: 'onError' },
          id,
        ).catch(_ => {});
      }
    });
  }
  wss.on('connection', newChannel);

  function sendJSON(rawObj) {
    const { meta: { channelID } = {} } = rawObj;
    const obj = { ...rawObj };
    delete obj.meta;

    // Point-to-point.
    const c = channels.get(channelID);
    if (c) {
      send(c, JSON.stringify(obj));
    } else {
      // They probably just hung up.  On replay, we don't
      // want to be noisy.
      // TODO: Somehow coordinate with the inbound vat that
      // we no longer have active connections.
      log.debug(`[${channelID}]: channel not found`);
    }
  }

  return sendJSON;
}
