#!/usr/bin/env node
/* eslint-env node */

const { sync: glob } = require('glob');
const { minify_sync: minify } = require('terser');
const { readFileSync: readFile, writeFileSync: writeFile } = require('node:fs');
const assert = require('node:assert/strict');

const sources = glob('dist/**/*.js');
for (const path of sources) {
  const code = readFile(path, 'utf-8');
  const { code: minCode } = minify(code, {
    module: true,
  });
  assert(minCode);
  writeFile(path, minCode, 'utf-8');
}
console.log('🍰 code minified by Terser');
