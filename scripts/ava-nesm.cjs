#! /usr/bin/env node
/* eslint-env node */

const fs = require('fs');

const packageJson = fs.readFileSync('package.json', 'utf-8');
const packageInfo = JSON.parse(packageJson);
const { ava: avaConfig } = packageInfo;
if (avaConfig.require) {
  const newRequire = avaConfig.require.filter(m => m !== 'esm');
  if (newRequire.length) {
    avaConfig.require = newRequire;
  } else {
    delete avaConfig.require;
  }
}
process.stdout.write(`\
export default ${JSON.stringify(avaConfig, undefined, 2)};
`);
