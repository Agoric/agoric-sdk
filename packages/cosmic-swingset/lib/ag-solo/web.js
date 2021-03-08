/* global require setTimeout clearTimeout setInterval clearInterval */
// Start a network service
import path from 'path';
import http from 'http';
import { createConnection } from 'net';
import express from 'express';
import WebSocket from 'ws';
import anylogger from 'anylogger';

import { getAccessToken } from './access-token';

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

const verifyToken = (actual, expected) => {
  // TODO: This should be a constant-time operation so that
  // the caller cannot tell the difference between initial characters
  // that match vs. ones that don't.
  return actual === expected;
};

export async function makeHTTPListener(basedir, port, host, rawInboundCommand) {
  // Enrich the inbound command with some metadata.
  const inboundCommand = (
    body,
    { channelID, dispatcher, url, headers: { origin } = {} } = {},
    id = undefined,
  ) => {
    // Strip away the query params, as the inbound command device can't handle
    // it and the accessToken is there.
    const parsedURL = new URL(url, 'http://some-host');
    const query = { isQuery: true };
    for (const [key, val] of parsedURL.searchParams.entries()) {
      if (key !== 'accessToken') {
        query[key] = val;
      }
    }

    const obj = {
      ...body,
      meta: {
        channelID,
        dispatcher,
        origin,
        query,
        url: parsedURL.pathname,
        date: Date.now(),
      },
    };
    return rawInboundCommand(obj).catch(err => {
      const idpfx = id ? `${id} ` : '';
      log.error(
        `${idpfx}inbound error:`,
        err,
        'from',
        JSON.stringify(obj, undefined, 2),
      );
      throw (err && err.message) || err;
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

  // serve the static HTML for the UI
  const htmldir = path.join(basedir, 'html');
  log(`Serving static files from ${htmldir}`);
  app.use(express.static(htmldir));

  // The rules for validation:
  //
  // path outside /private: always accept
  //
  // all paths within /private: origin-based access control: reject anything except
  // chrome-extension:, moz-extension:, and http:/https: localhost/127.0.0.1
  //
  // path in /private but not /private/wallet-bridge: also require correct
  // accessToken= in query params
  const validateOriginAndAccessToken = async req => {
    const { origin } = req.headers;
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}:`;

    const parsedUrl = new URL(req.url, 'http://some-host');
    const fullPath = parsedUrl.pathname;

    if (!fullPath.startsWith('/private/')) {
      // Allow any origin that's not marked private, without a accessToken.
      return true;
    }

    // Bypass accessToken just for the wallet bridge.
    if (fullPath !== '/private/wallet-bridge') {
      // Validate the private accessToken.
      const accessToken = await getAccessToken(port);
      const reqToken = parsedUrl.searchParams.get('accessToken');

      if (!verifyToken(reqToken, accessToken)) {
        log.error(
          id,
          `Invalid access token ${JSON.stringify(
            reqToken,
          )}; try running "agoric open"`,
        );
        return false;
      }
    }

    if (!origin) {
      log.error(id, `Missing origin header`);
      return false;
    }
    const originUrl = new URL(origin);
    const isLocalhost = hostname =>
      hostname.match(/^(localhost|127\.0\.0\.1)$/);

    if (['chrome-extension:', 'moz-extension:'].includes(originUrl.protocol)) {
      // Extensions such as metamask are local and can access the wallet.
      // Especially since the access token has been supplied.
      return true;
    }

    if (!isLocalhost(originUrl.hostname)) {
      log.error(id, `Invalid origin host ${origin} is not localhost`);
      return false;
    }

    if (!['http:', 'https:'].includes(originUrl.protocol)) {
      log.error(id, `Invalid origin protocol ${origin}`, originUrl.protocol);
      return false;
    }
    return true;
  };

  // accept POST messages to arbitrary endpoints
  app.post('*', async (req, res) => {
    if (!(await validateOriginAndAccessToken(req))) {
      res.json({ ok: false, rej: 'Unauthorized' });
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
  server.on('upgrade', async (req, socket, head) => {
    if (!(await validateOriginAndAccessToken(req))) {
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

  const wsActions = {
    noop() {
      // do nothing.
    },
    heartbeat() {
      this.isAlive = true;
    },
  };

  const pingInterval = setInterval(function ping() {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping(wsActions.noop);
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  let lastChannelID = 0;

  function newChannel(ws, req) {
    lastChannelID += 1;
    const channelID = lastChannelID;
    const meta = { ...req, channelID };
    const id = `${req.socket.remoteAddress}:${req.socket.remotePort}[${channelID}]:`;

    log(id, `new WebSocket ${req.url}`);

    // Manage connection pings.
    ws.isAlive = true;
    ws.on('pong', wsActions.heartbeat);

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

    // Close and throw if the open handler gives an error.
    inboundCommand(
      { type: 'ws/meta' },
      { ...meta, dispatcher: 'onOpen' },
      id,
    ).catch(e => {
      log(id, 'error opening connection:', e);
      ws.close();
    });

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
