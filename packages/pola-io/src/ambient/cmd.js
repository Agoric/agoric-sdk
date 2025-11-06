import { execFile as execFileAmbient } from 'child_process';
import { promisify } from 'node:util';
import * as cmd from '../cmd.js';

/**
 * @import {Environment} from '../cmd.js';
 */

/**
 * Access to run a command with flags appended.
 *
 * @example
 * const lsPlain = makeCmdRunner('ls', { execFile });
 * const ls = ls.withFlags('-F')
 * await ls.exec('/tmp') // runs: ls /tmp -F
 *
 * TODO? .withPath('/opt') or .withEnv({PATH: `${env.PATH}:/opt`})
 *
 * @param {string} file
 * @param {{ execFile?: any, defaultEnv?: Environment }} [io]
 */
export const makeCmdRunner = (
  file,
  { execFile = promisify(execFileAmbient), defaultEnv = process.env } = {},
) => cmd.makeCmdRunner(file, { execFile, defaultEnv });
