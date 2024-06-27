/* global globalThis */

import { isPromise } from '@endo/promise-kit';
import { Far } from '@endo/far';
import { heapVowE as E } from '@agoric/vow/vat.js';
import * as vowExports from '@agoric/vow/vat.js';
import * as farExports from '@endo/far';

import { Nat } from '@endo/nat';

const UNJSONABLES = new Map([
  [NaN, 'NaN'],
  [Infinity, 'Infinity'],
  [-Infinity, '-Infinity'],
  [undefined, 'undefined'],
]);

// A REPL-specific data dump-to-string.  This specifically is *not* JSON, but its
// output is unambiguous (even though it cannot be round-tripped).
export const dump = (value, spaces = 0) =>
  // eslint-disable-next-line no-use-before-define
  dump0(value, spaces, new WeakSet(), 0);

function dump0(value, spaces, inProgress, depth) {
  if (Object(value) !== value) {
    if (typeof value === 'bigint') {
      return `${value}n`;
    }
    if (typeof value === 'symbol') {
      return String(value);
    }
    const rawString = UNJSONABLES.get(value);
    if (rawString) {
      return rawString;
    }
    return JSON.stringify(value, null, spaces);
  }

  // Identify functions.
  if (typeof value === 'function') {
    return `[Function ${value.name || '<anon>'}]`;
  }

  // This dump attempts to show a little bit more of the structure.
  if (Promise.resolve(value) === value) {
    return `[Promise]`;
  }

  if (value instanceof Error) {
    return `[${value.name}: ${value.message}]`;
  }

  // Detect cycles.
  if (inProgress.has(value)) {
    return '[Circular]';
  }

  // Ensure we delete value on throw or return with the finally block below.
  try {
    inProgress.add(value);

    let ret = '';
    let spcs = spaces;
    if (!spcs) {
      spcs = '';
    } else if (typeof spcs === 'number') {
      spcs = ' '.repeat(spaces);
    }

    const singleSep = spaces ? ' ' : '';

    const stringTag = value[Symbol.toStringTag];
    if (stringTag !== undefined) {
      // Use stringification to get the string tag out.
      ret += `[Object ${stringTag}]${singleSep}`;
    }

    let sep = '';
    let closer;
    /** @type {(string | symbol)[]} */
    const names = Object.getOwnPropertyNames(value);
    const nonNumber = new Set(names);
    if (Array.isArray(value)) {
      ret += `[`;
      closer = ']';
      nonNumber.delete('length');

      for (let i = 0; i < value.length; i += 1) {
        ret += sep;
        if (spcs !== '') {
          ret += `\n${spcs.repeat(depth + 1)}`;
        }
        nonNumber.delete(String(i));
        ret += dump0(value[i], spaces, inProgress, depth + 1);
        sep = ',';
      }
    } else {
      ret += '{';
      closer = '}';
    }

    const props = names
      .filter(n => nonNumber.has(n))
      .concat(Object.getOwnPropertySymbols(value));

    for (const key of props) {
      ret += sep;
      if (spcs !== '') {
        ret += `\n${spcs.repeat(depth + 1)}`;
      }
      const keyDump = dump0(key, spaces, inProgress, depth + 1);
      ret += typeof key === 'string' ? keyDump : `[${keyDump}]`;
      ret += `:${singleSep}`;
      ret += dump0(value[key], spaces, inProgress, depth + 1);
      sep = ',';
    }
    if (sep !== '' && spcs !== '') {
      ret += `\n${spcs.repeat(depth)}`;
    }
    ret += closer;
    return ret;
  } finally {
    inProgress.delete(value);
  }
}

export function getReplHandler(replObjects, send) {
  let highestHistory = -1;
  const commands = {
    [highestHistory]: '',
  };
  const history = {
    [highestHistory]: '',
  };
  const display = {
    [highestHistory]: '',
  };
  const replHandles = new Set();
  let consoleOffset = highestHistory * 2 + 1;
  /** @type {Record<string, string[]>} */
  const consoleRegions = {
    [consoleOffset - 1]: [],
    [consoleOffset]: [],
  };

  // Create a message much like a console.log would.
  function joinMsg(...args) {
    let ret = '';
    let sep = '';
    for (const a of args) {
      let s;
      if (typeof a === 'string') {
        s = a;
      } else {
        s = dump(a, 2);
      }
      ret += `${sep}${s}`;
      sep = ' ';
    }
    return ret;
  }

  function updateHistorySlot(histnum) {
    // console.warn(`updateHistory ${histnum}`, histnum, consoleOffset);
    send(
      {
        type: 'updateHistory',
        histnum,
        command: commands[histnum],
        display: display[histnum],
        consoles: {
          command: consoleRegions[histnum * 2].join('\n'),
          display: consoleRegions[histnum * 2 + 1].join('\n'),
        },
      },
      [...replHandles.keys()],
    );
  }

  function writeToConsole(...args) {
    consoleRegions[consoleOffset].push(joinMsg(...args));
    updateHistorySlot(Math.floor(consoleOffset / 2));
  }

  const replConsole = harden({
    debug: writeToConsole,
    log: writeToConsole,
    info: writeToConsole,
    warn: writeToConsole,
    error: writeToConsole,
  });

  replConsole.log(`Welcome to Agoric!`);

  const endowments = {
    ...farExports,
    ...vowExports,
    E,
    // See https://github.com/Agoric/agoric-sdk/issues/9515
    assert: globalThis.assert,
    console: replConsole,
    commands,
    history,
    harden,
    ...replObjects,
  };
  const c = new Compartment(endowments);

  const handler = {
    getHighestHistory() {
      return { highestHistory };
    },

    rebroadcastHistory() {
      // console.debug(`rebroadcastHistory`, highestHistory);
      for (let histnum = -1; histnum <= highestHistory; histnum += 1) {
        updateHistorySlot(histnum);
      }
      return true;
    },

    doEval(obj, _meta) {
      const { number: histnum, body } = obj;
      console.debug(`doEval`, histnum, body);
      Nat(histnum);
      if (histnum <= highestHistory) {
        throw Error(
          `histnum ${histnum} is not larger than highestHistory ${highestHistory}`,
        );
      }

      highestHistory = histnum;

      commands[histnum] = body;

      // Need this concatenation to bypass direct eval test in realms-shim.

      consoleOffset = histnum * 2;
      consoleRegions[consoleOffset] = [];
      consoleRegions[consoleOffset + 1] = [];
      // eslint-disable-next-line no-useless-concat
      display[histnum] = `working on eval` + `(${body})`;
      updateHistorySlot(histnum);

      let r;
      try {
        r = c.evaluate(body, { sloppyGlobalsMode: true });
        history[histnum] = r;
        display[histnum] = dump(r);
      } catch (e) {
        console.log(`error in eval`, e);
        history[histnum] = e;
        display[histnum] = joinMsg('exception:', e);
      } finally {
        // Advance to the region after the display.
        consoleOffset += 1;
      }

      if (isPromise(r)) {
        display[histnum] = `unresolved Promise`;
        void E.when(
          r,
          res => {
            history[histnum] = res;
            display[histnum] = dump(res);
          },
          rej => {
            // leave history[] alone: leave the rejected promise in place
            display[histnum] = `Promise.reject(${dump(`${rej}`)})`;
          },
        ).then(_ => updateHistorySlot(histnum));
      }
      updateHistorySlot(histnum);
      return {};
    },
  };

  const commandHandler = Far('commandHandler', {
    onOpen(_obj, meta) {
      replHandles.add(meta.channelHandle);
    },
    onClose(_obj, meta) {
      replHandles.delete(meta.channelHandle);
    },

    onMessage(obj, meta) {
      if (!handler[obj.type]) {
        return false;
      }
      return handler[obj.type](obj, meta);
    },
  });

  return Far('replHandler', {
    getCommandHandler() {
      return commandHandler;
    },
  });
}
