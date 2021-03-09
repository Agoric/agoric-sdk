#!/usr/bin/env node
/* global require, module */
// @ts-check
const esmRequire = require('esm')(module);
const process = require('process');
const { spawn } = require('child_process');
const { type: osType } = require('os');
const { promises } = require('fs');
const path = require('path');
const glob = require('glob');

esmRequire('@agoric/install-ses');
const bundleSource = esmRequire('@agoric/bundle-source').default;

const { main, makeBundleResolve } = esmRequire('./avaXS');

Promise.resolve()
  .then(_ =>
    main(process.argv.slice(2), {
      bundleSource,
      spawn,
      osType,
      readFile: promises.readFile,
      resolve: makeBundleResolve(path),
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
