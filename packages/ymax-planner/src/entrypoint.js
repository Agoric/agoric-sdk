#! /usr/bin/env node

// We need the shims...
import '@endo/init/pre.js';
import './shims.cjs';

// UNTIL(https://github.com/nodejs/node/pull/58315)
// (Also tracked in https://github.com/endojs/endo/issues/2037#issuecomment-3142004849)
//
// The WebSocket shim uses Node.js EventEmitter, which fails after:
// TypeError#1: Cannot assign to read only property '_events' of object '[object Object]'
//  at EventEmitter.init (node:events:345:18)
//  at new EventEmitter (node:events:220:21)
//  at new CosmosRPCClient (packages/ymax-planner/src/cosmos-rpc.ts:27:16)
//
// The read only property appears to be `Promise.prototype`.
//
// Not safe, but we need to do this for now instead of using `import '@endo/init'`:
import '@endo/init/unsafe-fast.js';

import 'ts-blank-space/register';

import('./main.ts')
  .then(async ({ main }) => {
    const dotEnvFile = process.env.DOTENV || '.env';

    // Capture our current env so that we can use them to override dotenv.
    const processEnv = { ...process.env };

    const dotenv = await import('dotenv');

    /**
     * Object that dotenv.config() will mutate to add variables from the
     * dotEnvFile.
     * @type {{ [key: string]: string }}
     */
    const dotEnvAdditions = {};
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
