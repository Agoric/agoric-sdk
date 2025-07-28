#! /usr/bin/env node
/* global process */
import 'ts-blank-space/register';

import('./main.ts')
  .then(({ main }) => main(process.argv.slice(1)))
  .then(() => process.exit())
  .catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
  });
