#!/usr/bin/env node
/* eslint-env node */

const { sync: glob } = require('glob');
const { minify_sync: minify } = require('terser');
const { readFileSync: readFile, writeFileSync: writeFile } = require('fs');

const sources = glob('dist/**/*.js');
for (const path of sources) {
  const code = readFile(path, 'utf-8');
  const { code: minCode } = minify(code);
  writeFile(path, minCode, 'utf-8');
}
console.log('🍰 code minified by Terser');
