/* global WebSocket fetch document window */

function run() {
  let nextHistNum = 0;
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
    call({ type: 'rebroadcastHistory' });
  });

  function addEntry(histnum, command, display) {
    const c = document.createElement('div');
    c.setAttribute('id', `command-${histnum}`);
    c.appendChild(document.createTextNode(''));
    document.getElementById('history').append(c);

    const d = document.createElement('div');
    d.setAttribute('id', `history-${histnum}`);
    d.appendChild(document.createTextNode(''));
    document.getElementById('history').append(d);
  }

  function updateHistory(histnum, command, display) {
    if (histnum >= nextHistNum) {
      nextHistNum = histnum+1;
    }
    let c = document.getElementById(`command-${histnum}`);
    if (!c) {
      addEntry(histnum, command, display);
    }
    c = document.getElementById(`command-${histnum}`);
    const h = document.getElementById(`history-${histnum}`);
    c.textContent = `command[${histnum}] = ${command}`;
    h.textContent = `history[${histnum}] = ${display}`;
  }

  function setNextHistNum(max = 0) {
    const thisHistNum = nextHistNum;
    nextHistNum = Math.max(nextHistNum, max);
    for (const el of historyNumberElements) {
      el.textContent = nextHistNum;
    }
    return thisHistNum;
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
      updateHistory(obj.histnum, obj.command, obj.display);
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
    const command = inp.value;
    console.log('submitEval', command);
    const number = setNextHistNum(nextHistNum + 1);
    updateHistory(number, command, `sending for eval`);
    inp.value = '';
    call({ type: 'doEval', number, body: command });
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
