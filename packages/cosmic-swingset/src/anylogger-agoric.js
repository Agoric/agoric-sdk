import { getEnvironmentOptionsList } from '@endo/env-options';
import anylogger from 'anylogger';

// Turn on debugging output with DEBUG=agoric

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

const isVatLogNameColon = nameColon =>
  ['SwingSet:ls:', 'SwingSet:vat:'].some(sel => nameColon.startsWith(sel));

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}

let selectedLevel = 'info';
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
const defaultLevel = anylogger.levels[selectedLevel];

const oldExt = anylogger.ext;
anylogger.ext = (l, o) => {
  l = oldExt(l, o);
  l.enabledFor = lvl => defaultLevel >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');

  const nameColon = `${l.name}:`;
  const logBelongsToVat = isVatLogNameColon(nameColon);

  const logMatchesSelector = DEBUG_LIST.some(selector => {
    const selectorColon = `${selector}:`;
    if (!logBelongsToVat) {
      return true;
    }

    // If this is a vat log, then it is enabled if it matches the selector.
    return nameColon.startsWith(selectorColon);
  });

  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (!logMatchesSelector || code > defaultLevel) {
      // Disable printing.
      l[level] = () => {};
    } else {
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
    }
  }
  return l;
};
