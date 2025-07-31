#! /usr/bin/env node
/* global process */
import '@endo/init';
import 'ts-blank-space/register';

import * as dotenv from 'dotenv';

import('./main.ts')
  .then(({ main }) => {
    const dotEnvFile = process.env.DOTENV || '.env';

    /**
     * Object that dotenv.config() will mutate to add variables from the
     * dotEnvFile.
     * @type {{ [key: string]: string }}
     */
    const dotEnvAdditions = {};
    dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });
    // console.log('Loaded .env variables:', dotEnv);

    return main(process.argv.slice(1), {
      env: harden({ ...process.env, ...dotEnvAdditions }),
    });
  })
  .then(() => process.exit())
  .catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
  });
