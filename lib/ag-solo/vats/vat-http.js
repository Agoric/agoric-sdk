import evaluate from '@agoric/evaluate';
import harden from '@agoric/harden';

function build(E) {
  let httpPresence;
  const commands = {};
  const history = {};
  const homeObjects = {};


  function updateHistorySlot(histnum, s) {
    // don't wait on the response here, the http frontend won't ever resolve
    // this promise
    let t;
    E(httpPresence).update(histnum, `command[${histnum}] = ${commands[histnum]}\nhistory[${histnum}] = ${s}\n`);
  };

  const inboundHandler = harden({
    doREPL(req) {
      // when html/main.js does send(XYZ), we get s=XYZ
      const { histnum, s } = req;
      console.log(`doREPL`, histnum, s);
      commands[histnum] = s;
      updateHistorySlot(histnum, `working on eval(${s})`);
      const endowments = { console, E, history, home: homeObjects };
      let r;
      try {
        r = evaluate(s, endowments);
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
    },
  });

  return {
    getInboundHandler() {
        return inboundHandler;
    },
    setHomeObjects(home) {
      Object.assign(homeObjects, home);
    },
    setHTTPPresence(p) {
      httpPresence = p;
      E(httpPresence).connected();
    },
    setChainPresence(p) {
      homeObjects.chain = p;
    },
    async inboundFromBrowser(msg) {
      console.log(`vat-http.inboundFromBrowser ${msg}`);
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => harden(build(E)),
    helpers.vatID,
  );
}
