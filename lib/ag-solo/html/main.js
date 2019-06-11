/* global WebSocket fetch */

function run() {
  let nextHistNum = 0;

  async function call(req) {
    const res = await fetch('/vat', {
      method: 'POST',
      body: JSON.stringify(req),
      headers: { 'Content-Type': 'application/json' },
    });
    const j = await res.json();
    if (j.ok) {
      return j.res;
    }
    throw new Error(`server error: ${JSON.stringify(j.rej)}`);
  }

  call({ type: 'getHighestHistory' }).then(res => {
    nextHistNum = res.highestHistory + 1;
    // console.log(`nextHistNum is now ${nextHistNum}`, res);
  });

  const loc = window.location;
  const protocol = loc.protocol.replace(/^http/, 'ws');
  const socketEndpoint = `${protocol}//${loc.host}/`;
  const ws = new WebSocket(socketEndpoint);

  ws.addEventListener('error', ev => {
    console.log(`ws.error ${ev}`);
  });

  ws.addEventListener('open', ev => {
    console.log(`ws.open!`);
  });

  function escapeLines(s) {
    return s
      .split('\n')
      .map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
      .join('<br/>');
  }
  function addHistory(histnum, s) {
    const h = document.createElement('div');
    h.setAttribute('id', `history-${histnum}`);
    h.innerHTML = escapeLines(s);
    document.getElementById('history').append(h);
  }

  function updateHistory(histnum, s) {
    // console.log(`updateHistory`, histnum, s);
    if (histnum >= nextHistNum) {
      nextHistNum = histnum + 1;
    }
    const h = document.getElementById(`history-${histnum}`);
    if (h) {
      h.innerHTML = escapeLines(s);
    } else {
      addHistory(histnum, s);
    }
  }

  function handleMessage(obj) {
    // we receive commands to update result boxes
    if (obj.type === 'updateHistory') {
      // these args come from calls to vat-http.js updateHistorySlot()
      updateHistory(obj.histnum, obj.result);
    } else {
      console.log(`unknown WS type in:`, obj);
    }
  }

  // history updates (promises being resolved) are delivered by websocket
  // broadcasts
  ws.addEventListener('message', ev => {
    try {
      // console.log('ws.message:', ev.data);
      const obj = JSON.parse(ev.data);
      handleMessage(obj);
    } catch (e) {
      console.log(`error handling message`, e);
    }
  });

  const inp = document.getElementById('input');
  function submitEval() {
    const s = inp.value;
    console.log('submitEval', s);
    const number = nextHistNum;
    nextHistNum += 1;
    addHistory(number, `Promise.resolve(eval(${JSON.stringify(s)}))`);
    inp.value = '';
    call({ type: 'doEval', number, body: s });
  }

  inp.addEventListener('keypress', ev => {
    if (ev.keyCode === 13) {
      submitEval();
    }
  });
  inp.focus();
  document.getElementById('go').onclick = submitEval;
}

run();
