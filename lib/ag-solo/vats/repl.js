import { makeEvaluators } from '@agoric/evaluate';
import harden from '@agoric/harden';

// A REPL-specific JSON stringify.
export function stringify(value, spaces) {
  if (Object(value) !== value) {
    return JSON.stringify(value, spaces);
  }

  // Identify functions.
  if (typeof value === 'function') {
    return `[Function ${value.name || '<anon>'}]`;
  }

  // This stringify attempts to show a little bit more of the structure.
  if (Promise.resolve(value) === value) {
    return '[Promise]';
  }

  if (Array.isArray(value)) {
    let ret = '[';
    let sep = '';
    for (let i = 0; i < value.length; i++) {
      ret += sep + stringify(value[i]);
      sep = ',';
    }
    ret += ']';
    return ret;
  }

  let ret = '{';
  let sep = '';
  for (const key of Object.keys(value)) {
    if (key === 'toString' && typeof value[key] === 'function') {
      return value[key]();
    }
    ret += `${sep}${JSON.stringify(key, undefined, spaces)}:${stringify(
      value[key],
      spaces,
    )}`;
    sep = ',';
  }
  ret += '}';
  return ret;
}

export function getReplHandler(E, homeObjects, sendBroadcast) {
  const commands = {};
  const history = {};
  const display = {};
  let highestHistory = -1;

  function updateHistorySlot(histnum, s) {
    //console.log(`sendBroadcast ${histnum}`);
    sendBroadcast({ type: 'updateHistory', histnum,
                    command: commands[histnum],
                    display: display[histnum],
                    });
  }

  function addException(histnum, e) {
    // We stringify so that exceptions do not leak.
    const s = `${e}`;
    display[histnum] = `Promise.reject(${stringify(s)})`;
    updateHistorySlot(histnum);
  }

  const { evaluateProgram } = makeEvaluators({ sloppyGlobals: true });

  return {
    getHighestHistory() {
      return { highestHistory };
    },

    rebroadcastHistory() {
      //console.log(`rebroadcastHistory`, highestHistory);
      for (let histnum = 0; histnum <= highestHistory; histnum++) {
        updateHistorySlot(histnum);
      }
    },

    doEval(obj) {
      const { number: histnum, body } = obj;
      console.log(`doEval`, histnum, body);
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

      const endowments = { console, E, commands, history, home: homeObjects, harden };
      let r;
      try {
        r = evaluateProgram(body, endowments);
        history[histnum] = r;
        display[histnum] = stringify(r);
      } catch (e) {
        console.log(`error in eval`, e);
        history[histnum] = e;
        display[histnum] = `exception: ${e}`;
      }

      if (Promise.resolve(r) === r) {
        display[histnum] = `unresolved Promise`;
        r.then(
          res => {
            history[histnum] = res;
            display[histnum] = stringify(res);
          },
          rej => {
            // leave history[] alone: leave the rejected promise in place
            display[histnum] = `Promise.reject(${stringify(`${rej}`)})`;
          }).then(_ => updateHistorySlot(histnum));
      }
      updateHistorySlot(histnum);
      return {};
    },
  };
}
