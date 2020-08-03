/* eslint-disable no-await-in-loop */
import { E, makeCapTP } from '@agoric/captp';
import { makePromiseKit } from '@agoric/promise-kit';
import bundleSource from '@agoric/bundle-source';
import path from 'path';

// note: CapTP has it's own HandledPromise instantiation, and the contract
// must use the same one that CapTP uses. We achieve this by not bundling
// captp, and doing a (non-isolated) dynamic import of the deploy script
// below, so everything uses the same module table. The eventual-send that
// our captp uses will the same as the one the deploy script imports, so
// they'll get identical HandledPromise objects.

// TODO: clean this up: neither captp nor eventual-send will export
// HandledPromise, eventual-send should behave a shims, whoever imports it
// first will cause HandledPromise to be added to globalThis. And actually
// HandledPromise will go away in favor of globalThis.Promise.delegate

const RETRY_DELAY_MS = 1000;

export default async function deployMain(progname, rawArgs, powers, opts) {
  const { anylogger, makeWebSocket } = powers;
  const console = anylogger('agoric:deploy');

  const args = rawArgs.slice(1);

  if (args.length === 0) {
    console.error('you must specify at least one deploy.js to run');
    return 1;
  }

  const sendJSON = (ws, obj) => {
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    const body = JSON.stringify(obj);
    console.debug('sendJSON', body.slice(0, 200));
    ws.send(body);
  };

  const wsurl = `ws://${opts.hostport}/private/captp`;
  const exit = makePromiseKit();
  let connected = false;
  let retries = 0;
  const retryWebsocket = () => {
    retries += 1;
    console.info(`Open CapTP connection to ${wsurl} (try=${retries})...`);
    const ws = makeWebSocket(wsurl, { origin: 'http://127.0.0.1' });
    ws.on('open', async () => {
      connected = true;
      try {
        console.debug('Connected to CapTP!');
        const { dispatch, getBootstrap } = makeCapTP('bundle', obj =>
          sendJSON(ws, obj),
        );
        ws.on('message', data => {
          try {
            const obj = JSON.parse(data);
            console.debug('receiving', data.slice(0, 200));
            if (obj.type === 'CTP_ERROR') {
              throw obj.error;
            }
            dispatch(obj);
          } catch (e) {
            console.error('server error processing message', data, e);
            exit.reject(e);
          }
        });

        // Wait for the chain to become ready.
        let bootP = getBootstrap();
        const loaded = await E.G(bootP).LOADING;
        console.debug('Chain loaded:', loaded);
        // Take a new copy, since the chain objects have been added to bootstrap.
        bootP = getBootstrap();

        for (const arg of args) {
          const moduleFile = path.resolve(process.cwd(), arg);
          const pathResolve = (...resArgs) =>
            path.resolve(path.dirname(moduleFile), ...resArgs);
          console.log('running', moduleFile);

          // use a dynamic import to load the deploy script, it is unconfined
          // eslint-disable-next-line import/no-dynamic-require,global-require
          const mainNS = require(pathResolve(moduleFile));
          const main = mainNS.default;
          if (typeof main !== 'function') {
            console.error(
              `${moduleFile} does not have an export default function main`,
            );
          } else {
            await main(bootP, {
              bundleSource: file => bundleSource(pathResolve(file)),
              pathResolve,
            });
          }
        }

        console.debug('Done!');
        ws.close();
        exit.resolve(0);
      } catch (e) {
        exit.reject(e);
      }
    });
    ws.on('close', (_code, _reason) => {
      console.debug('connection closed');
      if (connected) {
        exit.resolve(1);
      }
    });
    ws.on('error', e => {
      if (e.code === 'ECONNREFUSED' && !connected) {
        // Retry in a little bit.
        setTimeout(retryWebsocket, RETRY_DELAY_MS);
        return;
      }
      exit.reject(e);
    });
  };
  // Start the retry process.
  retryWebsocket();
  return exit.promise;
}
