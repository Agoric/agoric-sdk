#!/usr/bin/env node
import process from 'node:process';
import { statPlans } from '../src/lib/bundles.js';

await statPlans(process.cwd());
