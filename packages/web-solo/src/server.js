/* global __dirname require setTimeout clearTimeout process */
// Start a network service
import http from 'http';
import https from 'https';
import fs from 'fs';
import { createConnection } from 'net';
import express from 'express';
import anylogger from 'anylogger';

// We need to CommonJS require morgan or else it warns, until:
// https://github.com/expressjs/morgan/issues/190
// is fixed.
const morgan = require('morgan');

const log = anylogger('web');

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

let server;

const lh = `${process.env.HOME}/Library/Application Support/https-localhost/localhost`;
let IS_HTTPS = false;
if (0 && fs.existsSync(`${lh}.key`) && fs.existsSync(`${lh}.crt`)) {
  IS_HTTPS = true;
  const cert = fs.readFileSync(`${lh}.crt`).toString('utf-8');
  const key = fs.readFileSync(`${lh}.key`).toString('utf-8');
  server = https.createServer({ cert, key }, app);
} else {
  server = http.createServer(app);
}

// serve the static HTML
app.use(express.static(`${__dirname}/../public`));

const doListen = async (host, port) => {
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

  server.listen(port, host, () =>
    log.info(
      'Listening on',
      `${IS_HTTPS ? 'https' : 'http'}://${host}:${port}`,
    ),
  );
};

doListen('localhost', process.env.PORT || '3000');
