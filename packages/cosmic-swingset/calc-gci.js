#!/usr/bin/env node

import fs from 'node:fs';
import djson from 'deterministic-json';
import { createHash } from 'node:crypto';
import process from 'node:process';

const g = fs.readFileSync(process.argv[2]).toString();
const s = djson.stringify(JSON.parse(g));
const gci = createHash('sha256').update(s).digest('hex');
console.log(gci);
