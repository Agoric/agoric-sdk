import evaluate from '@agoric/evaluate';
import harden from '@agoric/harden';

function build(E) {
  let httpPresence;
  function updateHistorySlot(histnum, s) {
    // don't wait on the response here, the http frontend won't ever resolve
    // this promise
    E(httpPresence).update(histnum, s);
  };

  const inboundHandler = harden({
    doREPL(req) {
      // when html/main.js does send(XYZ), we get s=XYZ
      const { histnum, s } = req;
      console.log(`doREPL`, histnum, s);
      updateHistorySlot(histnum, `working on eval(${s})`);
      const endowments = { console, E };
      const p = Promise.resolve(evaluate(s, endowments));
      p.then(res => updateHistorySlot(histnum, `${res}`),
             rej => updateHistorySlot(histnum, `failed: ${rej}`));
    },
  });

  return {
    getInboundHandler() {
        return inboundHandler;
    },
    setHTTPPresence(p) {
      httpPresence = p;
      E(httpPresence).connected();
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
