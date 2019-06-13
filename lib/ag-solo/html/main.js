/* global WebSocket fetch document window */

function run() {
  let nextHistNum = -1;
  const historyNumberElements = document.querySelectorAll('.historyNumber');

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
    setNextHistNum(res.highestHistory + 1);
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

  function setNextHistNum(max = 0) {
    const thisHistNum = nextHistNum;
    nextHistNum = Math.max(nextHistNum, max);
    for (const el of historyNumberElements) {
      el.textContent = nextHistNum;
    }
    return thisHistNum;
  }

  function updateHistory(histnum, s) {
    // console.log(`updateHistory`, histnum, s);
    setNextHistNum(histnum + 1);
    const h = document.getElementById(`history-${histnum}`);
    if (h) {
      h.innerHTML = escapeLines(s);
    } else {
      addHistory(histnum, s);
    }
  }

  const canvas = document.getElementById('myCanvas');
  const ctx = canvas.getContext('2d');
  const PIXEL_SIZE = 50; // actual pixels per pixel

  function updateCanvas(state) {
    console.log(state);
    function renderPixel(x, y, color) {
      ctx.beginPath();
      ctx.rect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.closePath();
    }
    for (let x = 0; x < state.length; x += 1) {
      for (let y = 0; y < state.length; y += 1) {
        renderPixel(x, y, state[x][y]);
      }
    }
  }

  function handleMessage(obj) {
    // we receive commands to update result boxes
    if (obj.type === 'updateHistory') {
      // these args come from calls to vat-http.js updateHistorySlot()
      updateHistory(obj.histnum, obj.result);
    } else if (obj.type === 'updateCanvas') {
      updateCanvas(JSON.parse(obj.state));
    } else {
      console.log(`unknown WS type in:`, obj);
    }
  }

  // history updates (promises being resolved) and canvas updates
  // (pixels being colored) are delivered by websocket
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
    const number = setNextHistNum(nextHistNum + 1);
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
