import { makeEvaluators } from '@agoric/evaluate';
import harden from '@agoric/harden';
import { isPromise } from '@agoric/produce-promise';
import { makeConsole } from '@agoric/swingset-vat/src/makeConsole';

import makeUIAgentMakers from './ui-agent';

// A REPL-specific JSON stringify.
export function stringify(
  value,
  spaces,
  getInterfaceOf,
  already = new WeakSet(),
  depth = 0,
) {
  if (Object(value) !== value) {
    return JSON.stringify(value, spaces);
  }

  // Identify functions.
  if (typeof value === 'function') {
    return `[Function ${value.name || '<anon>'}]`;
  }

  // This stringify attempts to show a little bit more of the structure.
  if (isPromise(value)) {
    return '[Promise]';
  }

  if (value instanceof Error) {
    return JSON.stringify(`${value.name}: ${value.message}`);
  }

  // Detect cycles.
  if (already.has(value)) {
    return '[Circular]';
  }
  already.add(value);

  let ret = '';
  const spcs = spaces === undefined ? '' : ' '.repeat(spaces);
  if (getInterfaceOf && getInterfaceOf(value) !== undefined) {
    ret += `${value}`;
  } else if (Array.isArray(value)) {
    ret += `[`;

    let sep = '';
    for (let i = 0; i < value.length; i += 1) {
      ret += sep;
      if (spcs !== '') {
        ret += `\n${spcs.repeat(depth + 1)}`;
      }
      ret += stringify(value[i], spaces, getInterfaceOf, already, depth + 1);
      sep = ',';
    }
    if (sep !== '' && spcs !== '') {
      ret += `\n${spcs.repeat(depth)}`;
    }
    ret += ']';
    return ret;
  }

  ret += '{';
  let sep = '';
  for (const key of Object.keys(value)) {
    ret += sep;
    if (spcs !== '') {
      ret += `\n${spcs.repeat(depth + 1)}`;
    }
    ret += `${JSON.stringify(key)}:${spaces > 0 ? ' ' : ''}`;
    ret += stringify(value[key], spaces, getInterfaceOf, already, depth + 1);
    sep = ',';
  }
  if (sep !== '' && spcs !== '') {
    ret += `\n${spcs.repeat(depth)}`;
  }
  ret += '}';
  return ret;
}

export function getReplHandler(E, homeObjects, send, vatPowers) {
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
        s = stringify(a, 2, vatPowers.getInterfaceOf);
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

  const replConsole = makeConsole({
    debug: writeToConsole,
    log: writeToConsole,
    info: writeToConsole,
    warn: writeToConsole,
    error: writeToConsole,
  });

  replConsole.log(`Welcome to Agoric!`);
  const { evaluateProgram } = makeEvaluators({ sloppyGlobals: true });

  const agentMakers = makeUIAgentMakers({ harden, console: replConsole });
  homeObjects.agent = agentMakers;

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
      if (histnum <= highestHistory) {
        throw new Error(
          `histnum ${histnum} is not larger than highestHistory ${highestHistory}`,
        );
      }

      highestHistory = histnum;

      commands[histnum] = body;

      // Need this concatenation to bypass direct eval test in realms-shim.
      // eslint-disable-next-line no-useless-concat
      consoleOffset = histnum * 2;
      consoleRegions[consoleOffset] = [];
      consoleRegions[consoleOffset + 1] = [];
      // eslint-disable-next-line no-useless-concat
      display[histnum] = `working on eval` + `(${body})`;
      updateHistorySlot(histnum);

      const endowments = {
        ...vatPowers,
        console: replConsole,
        E,
        commands,
        history,
        home: homeObjects,
        harden,
      };
      let r;
      try {
        r = evaluateProgram(body, endowments);
        history[histnum] = r;
        display[histnum] = stringify(r, undefined, vatPowers.getInterfaceOf);
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
        r.then(
          res => {
            history[histnum] = res;
            display[histnum] = stringify(
              res,
              undefined,
              vatPowers.getInterfaceOf,
            );
          },
          rej => {
            // leave history[] alone: leave the rejected promise in place
            display[histnum] = `Promise.reject(${stringify(`${rej}`)})`;
          },
        ).then(_ => updateHistorySlot(histnum));
      }
      updateHistorySlot(histnum);
      return {};
    },
  };

  const commandHandler = harden({
    onOpen(_obj, meta) {
      replHandles.add(meta.channelHandle);
    },
    onClose(_obj, meta) {
      replHandles.delete(meta.channelHandle);
    },

    onMessage(obj, meta) {
      if (handler[obj.type]) {
        return handler[obj.type](obj, meta);
      }
      return false;
    },
  });

  return harden({
    getCommandHandler() {
      return commandHandler;
    },
  });
}
