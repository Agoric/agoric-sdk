#!/usr/bin/env node -r esm
// @ts-check
import process from 'process';
import { spawn } from 'child_process';
import { type as osType } from 'os';
import { promises } from 'fs';
import path from 'path';
import glob from 'glob';
import '@agoric/install-ses';
import bundleSource from '@agoric/bundle-source';

import { main, makeBundleResolve } from './avaXS';

main(process.argv.slice(2), {
  bundleSource,
  spawn,
  osType,
  readFile: promises.readFile,
  resolve: makeBundleResolve(path),
  dirname: path.dirname,
  glob,
})
  .then(status => {
    process.exit(status);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
