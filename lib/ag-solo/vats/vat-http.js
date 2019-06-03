import evaluate from '@agoric/evaluate';
import harden from '@agoric/harden';

function build(E, D) {
  let commandDevice;
  const commands = {};
  const history = {};
  const homeObjects = {};
  let highestHistory = -1;;

  function updateHistorySlot(histnum, s) {
    const result = `command[${histnum}] = ${commands[histnum]}\nhistory[${histnum}] = ${s}\n`;
    D(commandDevice).sendBroadcast({ type: 'updateHistory', histnum, result });
  };

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

      commands[histnum] = body;
      updateHistorySlot(histnum, `working on eval(${body})`);
      const endowments = { console, E, history, home: homeObjects };
      let r;
      try {
        r = evaluate(body, endowments);
        updateHistorySlot(histnum, JSON.stringify(r));
      } catch (e) {
        console.log(`error in eval`, e);
        updateHistorySlot(histnum, `exception: ${e}`);
      }
      history[histnum] = r;
      if (Promise.resolve(r) === r) {
        updateHistorySlot(histnum, 'unresolved Promise');
        r.then(res => {
          history[histnum] = res;
          updateHistorySlot(histnum, `${res}`);
        },
               rej => updateHistorySlot(histnum, `rejected Promise: ${rej}`));
      }
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
