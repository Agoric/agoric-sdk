/* global __dirname setTimeout clearTimeout process */
// Start a network service
import http from 'http';
import { createConnection } from 'net';
import express from 'express';
import anylogger from 'anylogger';
import * as morganStar from 'morgan';

const STATIC_DIR = process.argv[2] || `${__dirname}/../public`;

// We need to CommonJS require morgan or else it warns, until:
// https://github.com/expressjs/morgan/issues/190
// is fixed.
const morgan = morganStar.default || morganStar;

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
// Enable performance.now() and true SharedArrayBuffers.
const enableCrossOriginIsolated = prefix => (req, res, next) => {
  if (req.path.startsWith(prefix)) {
    res.set('Cross-Origin-Embedder-Policy', 'require-corp');
    res.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
  next();
};

app.use(enableCrossOriginIsolated('/web-solo/'));
app.use(express.json()); // parse application/json

const server = http.createServer(app);

// serve the static HTML
app.use(express.static(STATIC_DIR));

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
    log.info('Listening on', `http://${host}:${port}`),
  );
};

doListen('localhost', process.env.PORT || '3000');
