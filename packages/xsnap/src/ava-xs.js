#!/usr/bin/env node
import '@endo/init';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { type as osType } from 'node:os';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import globCallback from 'glob';
import bundleSource from '@endo/bundle-source';

import { main, makeBundleResolve } from './avaXS.js';

/** @type {(pattern: string) => Promise<string[]>} */
const glob = pattern =>
  new Promise((resolve, reject) => {
    globCallback(pattern, (err, matches) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(matches);
    });
  });

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
