/* eslint-disable no-await-in-loop */
import parseArgs from 'minimist';
import { evaluateProgram } from '@agoric/evaluate';
import { E, HandledPromise, makeCapTP } from '@agoric/captp';
import makePromise from '@agoric/make-promise';

import bundleSource from '@agoric/bundle-source';

import path from 'path';

export default async function deployMain(progname, rawArgs, powers) {
  const { anylogger, makeWebSocket } = powers;
  const log = anylogger('agoric:deploy');
  const { _: args, hostport } = parseArgs(rawArgs, {
    default: {
      hostport: '127.0.0.1:8000',
    },
  });

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

  const wsurl = `ws://${hostport}/private/captp`;
  const ws = makeWebSocket(wsurl, { origin: 'http://127.0.0.1' });

  const exit = makePromise();
  ws.on('open', async () => {
    try {
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
          exit.rej(e);
        }
      });

      // Wait for the chain to become ready.
      let bootP = getBootstrap();
      log.error('Chain loaded:', await E.G(bootP).LOADING);
      // Take a new copy, since the chain objects have been added to bootstrap.
      bootP = getBootstrap();

      for (const arg of args) {
        const moduleFile = path.resolve(process.cwd(), arg);
        const pathResolve = (...resArgs) =>
          path.resolve(path.dirname(moduleFile), ...resArgs);
        log('running', moduleFile);
        const { source, sourceMap } = await bundleSource(moduleFile);

        const actualSource = `(${source}\n)\n${sourceMap}`;
        const mainNS = evaluateProgram(actualSource, {
          require,
          HandledPromise,
        })();
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

      log('Done!');
      ws.close();
      exit.res(0);
    } catch (e) {
      exit.rej(e);
    }
  });
  ws.on('close', (_code, _reason) => {
    log.debug('connection closed');
    exit.res(1);
  });
  return exit.p;
}
