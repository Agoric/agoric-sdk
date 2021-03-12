#!/usr/bin/env node
/* global require */

const fs = require('fs');
const djson = require('deterministic-json');
const { createHash } = require('crypto');
const process = require('process');

const g = fs.readFileSync(process.argv[2]).toString();
const s = djson.stringify(JSON.parse(g));
const gci = createHash('sha256')
  .update(s)
  .digest('hex');
console.log(gci);
