import evaluate from '@agoric/evaluate';

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
    const match = key.match(/^_importID_(\d+)$/);
    if (match && typeof value[key] === 'function') {
      return `[Presence ${match[1]}]`;
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

export function addReplHandler(handler, E, homeObjects, sendBroadcast) {
  const command = {};
  const history = {};
  let highestHistory = -1;

  function updateHistorySlot(histnum, s) {
    const result = `command[${histnum}]> ${command[histnum]}\nhistory[${histnum}] = ${s};\n`;
    sendBroadcast({ type: 'updateHistory', histnum, result });
  }

  function addException(histnum, e) {
    // We stringify so that exceptions do not leak.
    const s = `${e}`;
    updateHistorySlot(histnum, `Promise.reject(${stringify(s)})`);
    return (history[histnum] = Promise.reject(s));
  }

  return Object.assign(handler, {
    getHighestHistory() {
      return { highestHistory };
    },

    doEval(obj) {
      const { number: histnum, body } = obj;
      // console.log(`doEval`, histnum, body);
      if (histnum <= highestHistory) {
        throw new Error(
          `histnum ${histnum} is not larger than highestHistory ${highestHistory}`,
        );
      }
      highestHistory = histnum;

      command[histnum] = body;
      updateHistorySlot(histnum, `eval(${stringify(body)})`);
      const endowments = { console, E, command, history, home: homeObjects };
      let r;
      try {
        r = evaluate(body, endowments);
        updateHistorySlot(histnum, stringify(r));
        history[histnum] = r;
        if (Promise.resolve(r) !== r) {
          return {};
        }
        updateHistorySlot(histnum, `Promise.resolve(eval(${stringify(body)}))`);
      } catch (e) {
        console.log(`error in eval`, e);
        r = addException(histnum, e);
      }

      r.then(
        res => {
          history[histnum] = res;
          updateHistorySlot(histnum, stringify(res));
        },
        rej => addException(histnum, rej),
      ).catch(_ => undefined);
      return {};
    },
  });
}
