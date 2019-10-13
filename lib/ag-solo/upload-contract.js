/* eslint-disable no-await-in-loop */
import parseArgs from 'minimist';
import WebSocket from 'ws';
import { E } from '@agoric/eventual-send';
import makeCapTP from '@agoric/captp';
import fs from 'fs';
import path from 'path';

import buildSourceBundle from './build-source-bundle';

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

export default async function upload(basedir, args) {
  const { _: namePaths, target, 'ag-solo': agSolo } = parseArgs(args, {
    default: {
      target: 'contractHost',
    },
    stopEarly: true,
  });
  if (namePaths.length === 0) {
    console.error('You must specify NAME=PATH pairs to upload');
    return 1;
  }

  console.log(`Uploading ${target} contracts...`);

  let wsurl = agSolo;
  if (!agSolo) {
    const cjson = await fs.promises.readFile(
      path.join(basedir, 'connections.json'),
    );
    for (const conn of JSON.parse(cjson)) {
      if (conn.type === 'http') {
        wsurl = `ws://${conn.host}:${conn.port}/captp`;
      }
    }
  }

  const ws = new WebSocket(wsurl);
  const exit = makePromise();
  ws.on('open', async () => {
    try {
      const [handler, bootstrap] = makeCapTP('upload', obj =>
        sendJSON(ws, obj),
      );
      ws.on('message', data => {
        // console.log(data);
        try {
          const obj = JSON.parse(data);
          if (obj.type === 'CTP_ERROR') {
            throw obj.error;
          }
          handler[obj.type](obj);
        } catch (e) {
          console.log('server error processing message', data, e);
          exit.rej(e);
        }
      });

      let bootC;
      for (;;) {
        bootC = E.C(bootstrap());
        if (!(await bootC.G.LOADING.P)) {
          break;
        }
        console.log(`waiting for chain to become ready`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const targetObj = await bootC.G[target].P;
      if (!targetObj) {
        console.error(
          `Contract installation target object ${target} is not available; skipping...`,
        );
        ws.close();
        exit.res(0);
        return;
      }

      const ids = await Promise.all(
        namePaths.map(async namePath => {
          const match = namePath.match(/^([^=]+)=(.+)$/);
          if (!match) {
            throw Error(`${namePath} isn't NAME=PATH`);
          }
          const name = match[1];
          const filepath = match[2];
          const { source, moduleFormat } = await buildSourceBundle(filepath);
          // console.log(`Uploading ${source}`);

          return E(targetObj).install(source, moduleFormat).then(
            res => bootC.G.registry.M.set(name, res).P,
          );
        }),
      );

      console.log('Success!');
      setTimeout(() => {
        switch (target) {
          case 'zoe':
            console.log(`\

To create a contract instance, use:
  home.zoe~.makeInstance(home.registry~.get(ID), ...)
where ID is the registered installation id, one of:
  ${ids.join('\n  ')}`);
            break;

          case 'contractHost':
            console.log(`\

To create a contract instance, use:
  home.registry~.get(ID)~.spawn(TERMS)
where ID is the registered installation id, one of:
  ${ids.join('\n  ')}`);
            break;

          default:
            console.log(`\
            
Unrecognized contract target ${target}.  To use the uploaded instances, use:
  home.registry~.get(ID)...
where ID is the registered installation id, one of:
  ${ids.join('\n  ')}`);
        }
      }, 1000);
      ws.close();
      exit.res(0);
    } catch (e) {
      exit.rej(e);
    }
  });
  ws.on('close', (_code, _reason) => {
    console.log('connection closed');
    exit.res(1);
  });
  return exit.p;
}
