#!/usr/bin/env node
import '@endo/init';

import bundleSource from '@endo/bundle-source';
import { spawn } from 'child_process';
import { promises as fsp } from 'fs';
import glob from 'glob';
import { type as osType } from 'os';
import path from 'path';
import process from 'process';

import { main, makeBundleResolve } from './avaXS.js';

Promise.resolve()
  .then(_ =>
    main(process.argv.slice(2), {
      bundleSource,
      spawn,
      osType,
      readFile: fsp.readFile,
      resolve: makeBundleResolve(path),
      basename: path.basename,
      dirname: path.dirname,
      glob,
    }),
  )
  .then(status => {
    process.exit(status);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
