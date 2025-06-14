import { makeCmdRunner } from '@agoric/pola-io';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runLs = makeCmdRunner('/bin/ls', { execFile: promisify(execFile) });
await runLs(['-la']); // Only runs ls, nothing else
