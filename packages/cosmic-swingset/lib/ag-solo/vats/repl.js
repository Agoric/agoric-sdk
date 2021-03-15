import { isPromise } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import { getInterfaceOf, Remotable, Far } from '@agoric/marshal';

import { Nat } from '@agoric/nat';
import makeUIAgentMakers from './ui-agent';

// A REPL-specific JSON stringify.
export function stringify(
  value,
  spaces,
  gio = getInterfaceOf,
  inProgress = new WeakSet(),
  depth = 0,
) {
  if (Object(value) !== value) {
    if (typeof value === 'bigint') {
      return `${value}n`;
    }
    return JSON.stringify(value, null, spaces);
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
  if (inProgress.has(value)) {
    return '[Circular]';
  }
  inProgress.add(value);

  let ret = '';
  const spcs = spaces === undefined ? '' : ' '.repeat(spaces);
  if (gio && gio(value) !== undefined) {
    ret += `${value}`;
  } else if (Array.isArray(value)) {
    ret += `[`;

    let sep = '';
    for (let i = 0; i < value.length; i += 1) {
      ret += sep;
      if (spcs !== '') {
        ret += `\n${spcs.repeat(depth + 1)}`;
      }
      ret += stringify(value[i], spaces, gio, inProgress, depth + 1);
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
    ret += stringify(value[key], spaces, gio, inProgress, depth + 1);
    sep = ',';
  }
  if (sep !== '' && spcs !== '') {
    ret += `\n${spcs.repeat(depth)}`;
  }
  ret += '}';
  inProgress.delete(value);
  return ret;
}

export function getReplHandler(replObjects, send, vatPowers) {
  // transformTildot is baked into the Compartment we use to evaluate REPL
  // inputs. We provide getInterfaceOf and Remotable to REPL input code., but
  // import them from @agoric/marshal directly
  const { transformTildot } = vatPowers;
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
        s = stringify(a, 2, getInterfaceOf);
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

  // TODO: Remove
  const agentMakers = makeUIAgentMakers({ harden, console: replConsole });

  const endowments = {
    Remotable,
    Far,
    getInterfaceOf,
    console: replConsole,
    E,
    commands,
    history,
    harden,
    agent: agentMakers, // TODO: Remove
    ...replObjects,
  };
  const modules = {};
  const transforms = [];
  if (typeof transformTildot === 'function') {
    transforms.push(transformTildot);
  } else {
    console.log(`REPL was not given working transformTildot, disabled`);
  }
  const options = { transforms };
  const c = new Compartment(endowments, modules, options);

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

      let r;
      try {
        r = c.evaluate(body, { sloppyGlobalsMode: true });
        history[histnum] = r;
        display[histnum] = stringify(r, undefined, getInterfaceOf);
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
            display[histnum] = stringify(res, undefined, getInterfaceOf);
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
      if (!handler[obj.type]) {
        return false;
      }
      return handler[obj.type](obj, meta);
    },
  });

  return harden({
    getCommandHandler() {
      return commandHandler;
    },
  });
}
