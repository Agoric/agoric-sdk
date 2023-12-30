/* eslint-env node */
import {
  getEnvironmentOption,
  getEnvironmentOptionsList,
} from '@endo/env-options';
import anylogger from 'anylogger';
import chalk from 'chalk';

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}
let selectedLevel =
  DEBUG_LIST.length || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const level of DEBUG_LIST) {
  const parts = level.split(':');
  if (parts[0] !== 'agoric') {
    continue;
  }
  if (parts.length > 1) {
    selectedLevel = parts[1];
  } else {
    selectedLevel = 'debug';
  }
}
const selectedCode = anylogger.levels[selectedLevel];
const globalCode = selectedCode === undefined ? -Infinity : selectedCode;

const oldExt = anylogger.ext;
anylogger.ext = (l, o) => {
  l = oldExt(l, o);
  l.enabledFor = lvl => globalCode >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (globalCode >= code) {
      // Enable the printing with a prefix.
      const doLog = l[level] || (() => {});
      l[level] = (...args) => doLog(chalk.bold.blue(`${prefix}:`), ...args);
    } else {
      // Disable printing.
      l[level] = () => {};
    }
  }
  return l;
};
