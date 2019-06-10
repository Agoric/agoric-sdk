import evaluate from '@agoric/evaluate';
import harden from '@agoric/harden';

// This vat contains the HTTP request handler.

// This vat is blacklisted in launch-chain.js, to prevent it from loading
// on the chain nodes (just controller and solo vat machines).

function stringify(value, spaces) {
  if (typeof value !== 'object') {
    return JSON.stringify(value, spaces);
  }

  // This stringify attempts to show a little bit more of the structure.
  if (Promise.resolve(value) === value) {
    return '[Promise]';
  }

  if (Array.isArray(value)) {
    let ret = '[', sep = '';
    for (let i = 0; i < value.length; i ++) {
      ret += sep + stringify(value[i]);
      sep = ',';
    }
    ret += ']';
    return ret;
  }

  let ret = '{', sep = '';
  for (const key of Object.keys(value)) {
    const match = key.match(/^_importID_(\d+)$/);
    if (match && typeof value[key] === 'function') {
      return `[Presence ${match[1]}]`;
    }
    ret += `${sep}${JSON.stringify(key, undefined, spaces)}:${stringify(value[key], spaces)}`;
    sep = ',';
  }
  ret += '}';
  return ret;
}

function build(E, D) {
  let commandDevice;
  const command = {};
  const history = {};
  const homeObjects = {};
  let highestHistory = -1;;

  function updateHistorySlot(histnum, s) {
    const result = `command[${histnum}] = ${stringify(command[histnum])};\nhistory[${histnum}] = ${s};\n`;
    D(commandDevice).sendBroadcast({ type: 'updateHistory', histnum, result });
  };

  function addException(histnum, e) {
    // We stringify so that exceptions do not leak.
    const s = `${e}`;
    updateHistorySlot(histnum, `Promise.reject(${stringify(s)})`);
    return history[histnum] = Promise.reject(s); 
  }

  const handler = {
    getHighestHistory() {
      return { highestHistory };
    },

    doEval(obj) {
      const { number: histnum, body } = obj;
      //console.log(`doEval`, histnum, body);
      if (histnum <= highestHistory) {
        throw new Error(`histnum ${histnum} is not larger than highestHistory ${highestHistory}`);
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

      r.then(res => {
        history[histnum] = res;
        updateHistorySlot(histnum, stringify(res));
      }, rej => addException(histnum, rej))
        .catch(_ => undefined);
      return {};
    },
  };

  return {
    setCommandDevice(d) {
      commandDevice = d;
    },

    async registerFetch(fetch) {
      const chainBundle = await E(fetch).getChainBundle();
      Object.assign(homeObjects, chainBundle);
    },

    setChainPresence(p) {
      homeObjects.chain = p;
    },

    // devices.command invokes our inbound() because we passed to
    // registerInboundHandler()
    inbound(count, obj) {
      //console.log(`vat-http.inbound (from browser) ${count}`, obj);
      const p = Promise.resolve(handler[obj.type](obj));
      p.then(res => D(commandDevice).sendResponse(count, false, harden(res)),
             rej => D(commandDevice).sendResponse(count, true, harden(rej)));
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E,D) => harden(build(E,D)),
    helpers.vatID,
  );
}
