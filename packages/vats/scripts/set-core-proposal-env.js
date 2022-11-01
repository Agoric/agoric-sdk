#! /usr/bin/env node
import fs from 'fs';
import process from 'process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const spec = process.argv[2];
if (!spec) {
  process.exit(0);
}

const vatConfigFile = require.resolve(spec);
const configJson = fs.readFileSync(vatConfigFile);
const config = JSON.parse(configJson);

const envs = new Map();
if (Array.isArray(config?.coreProposals)) {
  config.coreProposals.forEach(
    ({ env }) =>
      env &&
      Object.entries(env).forEach(([key, val]) => {
        const oldVal = envs.get(key);
        if (envs.has(key) && oldVal !== val) {
          throw Error(
            `Duplicate env key: ${key}, but value is ${val} not ${oldVal}`,
          );
        }
        envs.set(key, val);
      }),
  );
}

for (const [key, val] of envs.entries()) {
  process.stdout.write(
    `${key}="${val.replace(/(\\)/g, '\\$1').replace(/(")/g, '\\$1')}"\n`,
  );
}
