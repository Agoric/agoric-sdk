#!/usr/bin/env -S node --import ts-blank-space/register
/* global globalThis */
/* eslint-env node */

// We need some pre-lockdown shimming.
import '@endo/init/pre-remoting.js';
import './shims.cjs';
import '@endo/lockdown/commit.js';

// ...but the WebSocket shim must be loaded *after* lockdown, seemingly because
// of a dependency upon EventEmitter that is otherwise broken:
// TypeError#1: Cannot assign to read only property '_events' of object '[object Object]'
//  at EventEmitter.init (node:events:345:18)
//  at new EventEmitter (node:events:220:21)
//  at new CosmosRPCClient (packages/ymax-planner/src/cosmos-rpc.ts:27:16)
//
// The read only property appears to be on `Promise.prototype`.
//
// See also https://github.com/nodejs/node/pull/58315 and
// https://github.com/endojs/endo/issues/2037#issuecomment-3142004849
const shimmedP = (async () => {
  if (typeof WebSocket !== 'undefined') return;
  const ws = await import('ws');
  // @ts-expect-error
  globalThis.WebSocket = ws.WebSocket;
})();

shimmedP
  .then(() => import('./main.ts'))
  .then(async ({ main }) => {
    const dotEnvFile = process.env.DOTENV || '.env';

    // Capture our current env so that we can use them to override dotenv.
    const processEnv = { ...process.env };

    const dotenv = await import('dotenv');

    /**
     * Object that dotenv.config() will mutate to add variables from the
     * dotEnvFile.
     */
    const dotEnvAdditions = {} as { [key: string]: string };
    dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });
    // console.log('Loaded .env variables:', dotEnv);

    return main(process.argv.slice(1), {
      env: harden({ ...dotEnvAdditions, ...processEnv }),
    });
  })
  .then(() => process.exit())
  .catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
  });
