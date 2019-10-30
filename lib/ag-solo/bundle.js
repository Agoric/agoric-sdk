/* eslint-disable no-await-in-loop */
import parseArgs from 'minimist';
import WebSocket from 'ws';
import { E } from '@agoric/eventual-send';
import { evaluateProgram } from '@agoric/evaluate';
import { makeCapTP } from '@agoric/captp';
import fs from 'fs';
import path from 'path';

import buildSourceBundle from '@agoric/bundle-source';

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

export default async function bundle(insistIsBasedir, args) {
  const { _: a, evaluate, once, output, 'ag-solo': agSolo } = parseArgs(args, {
    boolean: ['once', 'evaluate'],
    alias: {o: 'output', e: 'evaluate'},
    stopEarly: true,
  });

  const [mainModule, ...namePaths] = a;
  if (!mainModule) {
    console.error('You must specify a main module to bundle');
    return 1;
  }

  if (!output && !evaluate) {
    console.error(`You must specify at least one of '--output' or '--evaluate'`);
    return 1;
  }

  const bundled = {};
  
  const moduleFile = `${__dirname}/${mainModule}.js`;
  await Promise.all([`main=${moduleFile}`, ...namePaths].map(async namePath => {
    const match = namePath.match(/^([^=]+)=(.+)$/);
    if (!match) {
      throw Error(`${namePath} isn't NAME=PATH`);
    }
    const name = match[1];
    const filepath = match[2];
    bundled[name] = await buildSourceBundle(filepath);
  }));

  if (output) {
    await fs.promises.writeFile(output, JSON.stringify(bundled));
  }

  if (!evaluate) {
    return 0;
  }
  const actualSources = `(${bundled.main.source}\n)\n${bundled.main.sourceMap}`;
  // console.log(actualSources);
  const mainNS = evaluateProgram(actualSources, { require })();
  const main = mainNS.default;
  if (typeof main !== 'function') {
    console.error(`Bundle main does not have an export default function`);
    return 1;
  }

  let wsurl = agSolo;
  if (!agSolo) {
    const basedir = insistIsBasedir();
    const cjson = await fs.promises.readFile(
      path.join(basedir, 'connections.json'),
    );
    for (const conn of JSON.parse(cjson)) {
      if (conn.type === 'http') {
        wsurl = `ws://${conn.host}:${conn.port}/captp`;
      }
    }
  }

  const ws = new WebSocket(wsurl, { origin: 'http://127.0.0.1' });
  const exit = makePromise();
  ws.on('open', async () => {
    try {
      const { dispatch, getBootstrap } = makeCapTP('bundle', obj =>
        sendJSON(ws, obj),
      );
      ws.on('message', data => {
        // console.log(data);
        try {
          const obj = JSON.parse(data);
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
      if (once) {
        if (await bootC.G.READY.M.isReady().P) {
          console.error('Singleton bundle already installed');
          ws.close();
          exit.res(0);
          return;
        }
      }

      console.error(`Running bundle main entry point...`);
      await main({ bundle: bundled, home: bootC.P });
      console.error('Success!');
      if (once) {
        await bootC.G.READY.M.resolve('initialized').P;
      }
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
