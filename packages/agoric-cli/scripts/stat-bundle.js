#!/usr/bin/env node
import assert from 'node:assert';
import process from 'node:process';
import { statBundle } from '../src/lib/bundles.js';

const filename = process.argv[2];
assert(filename, 'usage: stat-bundle.js <filename>');

await statBundle(filename);
