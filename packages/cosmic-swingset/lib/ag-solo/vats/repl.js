import { makeEvaluators } from '@agoric/evaluate';
import harden from '@agoric/harden';
import { isPromise } from '@agoric/produce-promise';

// A REPL-specific JSON stringify.
export function stringify(
  value,
  spaces,
  getInterfaceOf,
  already = new WeakSet(),
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

  // Detect cycles.
  if (already.has(value)) {
    return '[Circular]';
  }
  already.add(value);

  let ret = '';
  if (getInterfaceOf && getInterfaceOf(value) !== undefined) {
    ret += `${value}`;
  } else if (Array.isArray(value)) {
    ret += `[`;

    let sep = '';
    for (let i = 0; i < value.length; i += 1) {
      ret += sep + stringify(value[i], spaces, getInterfaceOf, already);
      sep = ',';
    }
    ret += ']';
    return ret;
  }

  ret += '{';
  let sep = '';
  for (const key of Object.keys(value)) {
    ret += `${sep}${JSON.stringify(key, undefined, spaces)}:${stringify(
      value[key],
      spaces,
      getInterfaceOf,
      already,
    )}`;
    sep = ',';
  }
  ret += '}';
  return ret;
}

export function getReplHandler(E, homeObjects, send, vatPowers) {
  const commands = {};
  const history = {};
  const display = {};
  let highestHistory = -1;
  const replHandles = new Set();

  function updateHistorySlot(histnum) {
    // console.debug(`sendBroadcast ${histnum}`);
    send(
      {
        type: 'updateHistory',
        histnum,
        command: commands[histnum],
        display: display[histnum],
      },
      [...replHandles.keys()],
    );
  }

  const { evaluateProgram } = makeEvaluators({ sloppyGlobals: true });

  const handler = {
    getHighestHistory() {
      return { highestHistory };
    },

    rebroadcastHistory() {
      // console.debug(`rebroadcastHistory`, highestHistory);
      for (let histnum = 0; histnum <= highestHistory; histnum += 1) {
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
      display[histnum] = `working on eval` + `(${body})`;
      updateHistorySlot(histnum);

      const endowments = {
        ...vatPowers,
        console,
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
        display[histnum] = `exception: ${e}`;
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
