#! /usr/bin/env node
/* global process */
import '@endo/init/pre.js';
import 'ts-blank-space/register';
import '@endo/init';

import * as dotenv from 'dotenv';

import('./main.ts')
  .then(({ main }) => {
    /** @type {{ [key: string]: string }} */
    const dotEnv = {};
    dotenv.config({ path: process.env.DOTENV || '.env', processEnv: dotEnv });
    // console.log('Loaded .env variables:', dotEnv);

    return main(process.argv.slice(1), {
      env: { ...process.env, ...dotEnv },
    });
  })
  .then(() => process.exit())
  .catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
  });
