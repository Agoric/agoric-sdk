/* eslint-disable no-await-in-loop */
import parseArgs from 'minimist';
import WebSocket from 'ws';
import { E } from '@agoric/eventual-send';
import { evaluateProgram } from '@agoric/evaluate';
import { makeCapTP } from '@agoric/captp';

import bundleSource from '@agoric/bundle-source';

import path from 'path';

const makePromise = () => {
  const pr = {};
  pr.p = new Promise((resolve, reject) => {
    pr.res = resolve;
    pr.rej = reject;
  });
  return pr;
};

const sendJSON = (ws, obj) => {
  if (ws.readyState !== ws.OPEN) {
    return;
  }
  // console.log('sending', obj);
  ws.send(JSON.stringify(obj));
};

export default async function deployMain(progname, rawArgs, priv) {
  const { console, error } = priv;
  const { _: args, hostport } = parseArgs(rawArgs, {
    default: {
      hostport: '127.0.0.1:8000',
    },
  });

  if (args.length === 0) {
    error('you must specify at least one deploy.js to run');
    return 1;
  }

  const wsurl = `ws://${hostport}/captp`;
  const ws = new WebSocket(wsurl, { origin: 'http://127.0.0.1' });

  const exit = makePromise();
  ws.on('open', async () => {
    try {
      const { dispatch, getBootstrap } = makeCapTP('bundle', obj =>
        sendJSON(ws, obj),
      );
      ws.on('message', data => {
        try {
          const obj = JSON.parse(data);
          // console.log('receiving', obj);
          if (obj.type === 'CTP_ERROR') {
            throw obj.error;
          }
          dispatch(obj);
        } catch (e) {
          console.error('server error processing message', data, e);
          exit.rej(e);
        }
      });

      // Wait for the chain to become ready.
      let bootC = E.C(getBootstrap());
      console.error('Chain loaded:', await bootC.G.LOADING.P);
      // Take a new copy, since the chain objects have been added to bootstrap.
      bootC = E.C(getBootstrap());

      for (const arg of args) {
        const moduleFile = path.resolve(process.cwd(), arg);
        const pathResolve = (...resArgs) =>
          path.resolve(path.dirname(moduleFile), ...resArgs);
        console.log('running', moduleFile);
        const { source, sourceMap } = await bundleSource(moduleFile);

        const actualSource = `(${source}\n)\n${sourceMap}`;
        const mainNS = evaluateProgram(actualSource, { require })();
        const main = mainNS.default;
        if (typeof main !== 'function') {
          console.error(
            `${moduleFile} does not have an export default function main`,
          );
        } else {
          await main(bootC.P, {
            bundleSource: file => bundleSource(pathResolve(file)),
            pathResolve,
          });
        }
      }

      console.error('Done!');
      ws.close();
      exit.res(0);
    } catch (e) {
      exit.rej(e);
    }
  });
  ws.on('close', (_code, _reason) => {
    // console.log('connection closed');
    exit.res(1);
  });
  return exit.p;
}
