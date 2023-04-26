/* global process */
import anylogger from 'anylogger';
import chalk from 'chalk';

// Turn on debugging output with DEBUG=agoric
const { DEBUG } = process.env;
let selectedLevel = 'info';
if (DEBUG === undefined) {
  selectedLevel = 'log';
} else if (DEBUG.includes('agoric')) {
  selectedLevel = 'debug';
}
const defaultLevel = anylogger.levels[selectedLevel];

const oldExt = anylogger.ext;
anylogger.ext = (l, o) => {
  l = oldExt(l, o);
  l.enabledFor = lvl => defaultLevel >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (code > defaultLevel) {
      // Disable printing.
      l[level] = () => {};
    } else {
      // Enable the printing with a prefix.
      const doLog = l[level] || (() => {});
      l[level] = (...args) => doLog(chalk.bold.blue(`${prefix}:`), ...args);
    }
  }
  return l;
};
