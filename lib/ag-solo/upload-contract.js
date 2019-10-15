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
  const { _: namePaths, 'ag-solo': agSolo } = parseArgs(args, {
    default: {
      target: 'contractHost',
    },
    stopEarly: true,
  });
  if (namePaths.length === 0) {
    console.error('You must specify TARGET-NAME=PATH arguments to upload');
    return 1;
  }

  console.log(`Uploading contracts...`);

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

  const originurl = new URL('/', wsurl);
  originurl.protocol = 'https:';
  const ws = new WebSocket(wsurl, { origin: originurl.href });
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

      await Promise.all(
        namePaths.map(async namePath => {
          const match = namePath.match(/^(([^\W-]+)-[^=]+)=(.+)$/);
          if (!match) {
            throw Error(`${namePath} isn't TARGET-NAME=PATH`);
          }
          const name = match[1];
          const target = match[2];
          const filepath = match[3];
          const { source, moduleFormat } = await buildSourceBundle(filepath);
          // console.log(`Uploading ${source}`);

          const targetObj = await bootC.G[target].P;
          if (!targetObj) {
            console.error(
              `Contract installation target object ${target} is not available for ${name}; skipping...`,
            );
            return null;
          }

          // Install the contract, then save it in home.uploads.
          return bootC.G.uploads.M.set(
            name,
            E(targetObj).install(source, moduleFormat),
          ).P;
        }),
      );

      console.log('Success!  See home.uploads~.list()');
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
