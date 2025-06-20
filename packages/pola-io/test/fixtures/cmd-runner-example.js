// eslint-disable-next-line import/no-extraneous-dependencies
import { makeCmdRunner } from '@agoric/pola-io';
import { execFile as execFileNode } from 'node:child_process';
import { promisify } from 'node:util';

export const main = async ({ execFile = promisify(execFileNode) }) => {
  const npx = makeCmdRunner('npx', { execFile }); // TODO --no-install
  return miscTask(npx);
};

const miscTask = async npx => {
  const agoric = npx.subCommand('agoric');
  const { stdout } = await agoric.subCommand('run').exec(['builder.js']);
  return stdout.split('\n');
};
