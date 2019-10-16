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
  const { _: namePaths, once, 'ag-solo': agSolo } = parseArgs(args, {
    boolean: ['once'],
    default: {
      target: 'contractHost',
    },
    stopEarly: true,
  });
  if (namePaths.length === 0) {
    console.error('You must specify TARGET-NAME=PATH arguments to upload');
    return 1;
  }

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

  const ws = new WebSocket(wsurl, { origin: 'http://127.0.0.1' });
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

      // Wait for the chain to become ready.
      let bootC = E.C(bootstrap());
      console.log('Chain loaded:', await bootC.G.LOADING.P);
      // Take a new copy, since the contract targets should exist.
      bootC = E.C(bootstrap());
      if (once) {
        if (await bootC.G.READY.M.isReady().P) {
          console.log('Contracts already uploaded');
          ws.close();
          exit.res(0);
          return;
        }
      }
      const uploadsC = bootC.G.uploads;

      console.log(`Uploading contracts...`);

      const names = [];
      const contractsAP = [];
      for (const namePath of namePaths) {
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
        } else {
          // Install the contract, then save it in home.uploads.
          console.log(`Uploading ${name}`)
          contractsAP.push(E(targetObj).install(source, moduleFormat));
          names.push(name);
        }
      }

      const contracts = await Promise.all(contractsAP);
      for (let i = 0; i < contracts.length; i ++) {
        await uploadsC.M.set(names[i], contracts[i]).P;
      }

      console.log('Success!  See home.uploads~.list()');
      if (once) {
        await bootC.G.READY.M.resolve('contracts uploaded').P;
      }
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
