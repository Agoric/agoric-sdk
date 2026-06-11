#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';
import djson from 'deterministic-json';

const g = fs.readFileSync(process.argv[2]).toString();
const s = djson.stringify(JSON.parse(g));
const gci = createHash('sha256').update(s).digest('hex');
console.log(gci);
