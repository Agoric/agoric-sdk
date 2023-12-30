/* eslint-env node */
import {
  getEnvironmentOptionsList,
  getEnvironmentOption,
} from '@endo/env-options';
import anylogger from 'anylogger';

// Turn on debugging output with DEBUG=agoric

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

const isVatLogNameColon = nameColon =>
  ['SwingSet:ls:', 'SwingSet:vat:'].some(sel => nameColon.startsWith(sel));

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}
let selectedLevel =
  DEBUG_LIST.length || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const selector of DEBUG_LIST) {
  const parts = selector.split(':');
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

  const nameColon = `${l.name}:`;
  const logBelongsToVat = isVatLogNameColon(nameColon);

  // If this is a vat log, then it is enabled by a selector in DEBUG_LIST.
  const logMatchesSelector =
    !logBelongsToVat ||
    DEBUG_LIST.some(selector => {
      const selectorColon = `${selector}:`;
      return nameColon.startsWith(selectorColon);
    });

  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (logMatchesSelector && globalCode >= code) {
      // Enable the printing with a prefix.
      const doLog = l[level];
      if (doLog) {
        l[level] = (...args) => {
          // Add a timestamp.
          const now = new Date().toISOString();
          doLog(`${now} ${prefix}:`, ...args);
        };
      } else {
        l[level] = () => {};
      }
    } else {
      // Disable printing.
      l[level] = () => {};
    }
  }
  return l;
};
