/* eslint-disable no-await-in-loop */
import builtinModules from 'builtin-modules';
import { evaluateProgram } from '@agoric/evaluate';
import { E, HandledPromise, makeCapTP } from '@agoric/captp';
import { producePromise } from '@agoric/produce-promise';

import bundleSource from '@agoric/bundle-source';

import path from 'path';

const RETRY_DELAY_MS = 1000;

export default async function deployMain(progname, rawArgs, powers, opts) {
  const { anylogger, makeWebSocket } = powers;
  const log = anylogger('agoric:deploy');

  const args = rawArgs.slice(1);

  if (args.length === 0) {
    log.error('you must specify at least one deploy.js to run');
    return 1;
  }

  const sendJSON = (ws, obj) => {
    if (ws.readyState !== ws.OPEN) {
      return;
    }
    log.debug('sending', obj);
    ws.send(JSON.stringify(obj));
  };

  const wsurl = `ws://${opts.hostport}/private/captp`;
  const exit = producePromise();
  let connected = false;
  let retries = 0;
  const retryWebsocket = () => {
    retries += 1;
    log.info(`Open CapTP connection to ${wsurl} (try=${retries})...`);
    const ws = makeWebSocket(wsurl, { origin: 'http://127.0.0.1' });
    ws.on('open', async () => {
      connected = true;
      try {
        log.info('Connected to CapTP!');
        const { dispatch, getBootstrap } = makeCapTP('bundle', obj =>
          sendJSON(ws, obj),
        );
        ws.on('message', data => {
          try {
            const obj = JSON.parse(data);
            log.debug('receiving', obj);
            if (obj.type === 'CTP_ERROR') {
              throw obj.error;
            }
            dispatch(obj);
          } catch (e) {
            log.error('server error processing message', data, e);
            exit.reject(e);
          }
        });

        // Wait for the chain to become ready.
        let bootP = getBootstrap();
        log.info('Chain loaded:', await E.G(bootP).LOADING);
        // Take a new copy, since the chain objects have been added to bootstrap.
        bootP = getBootstrap();

        for (const arg of args) {
          const moduleFile = path.resolve(process.cwd(), arg);
          const pathResolve = (...resArgs) =>
            path.resolve(path.dirname(moduleFile), ...resArgs);
          log('running', moduleFile);
          const { source, sourceMap } = await bundleSource(
            moduleFile,
            undefined,
            { externals: builtinModules },
          );

          const actualSource = `(${source}\n)\n${sourceMap}`;
          const nestedEvaluate = src =>
            evaluateProgram(src, {
              systemRequire: require,
              HandledPromise,
              nestedEvaluate,
            });
          const mainNS = nestedEvaluate(actualSource)();
          const main = mainNS.default;
          if (typeof main !== 'function') {
            log.error(
              `${moduleFile} does not have an export default function main`,
            );
          } else {
            await main(bootP, {
              bundleSource: file => bundleSource(pathResolve(file)),
              pathResolve,
            });
          }
        }

        log.info('Done!');
        ws.close();
        exit.resolve(0);
      } catch (e) {
        exit.reject(e);
      }
    });
    ws.on('close', (_code, _reason) => {
      log.debug('connection closed');
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
