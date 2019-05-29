/* global WebSocket */

function run() {
  const loc = window.location;
  const protocol = loc.protocol.replace(/^http/, 'ws');
  const socketEndpoint = `${protocol}//${loc.host}/`;
  let highestInbound = 0;
  let highestHistory = 0;

  const ws = new WebSocket(socketEndpoint);
  let queue = [];
  let send = obj => queue.push(JSON.stringify(obj));

  ws.addEventListener('error', (ev) => {
    console.log(`ws.error ${ev}`);
  });

  ws.addEventListener('open', (ev) => {
    console.log(`ws.open!`);

    send = (obj) => {
      if (ws.readyState === WebSocket.OPEN) {
        const num = highestInbound + 1;
        const commsbody = {
          target: { type: 'your-egress', id: 1 },
          methodName: 'doREPL',
          args: [obj], slots: [],
          // TODO: can we omit resultSlot to get a sendOnly?
          //resultSlot: { type: 'your-resolver', id: 1},
        };
        ws.send(JSON.stringify([[num, JSON.stringify(commsbody)]]));
      }
    };

    while (queue.length > 0) {
      send(queue.shift());
    }
  });

  function addHistory(histnum, s) {
    const h = document.createElement('div');
    h.setAttribute('id', `history-${histnum}`);
    h.appendChild(document.createTextNode(s));
    document.getElementById('history').append(h);
  }

  function updateHistory(histnum, s) {
    if (histnum > highestHistory) {
      highestHistory = histnum;
    }
    const h = document.getElementById(`history-${histnum}`);
    if (h) {
        h.textContent = s;
    } else {
      addHistory(histnum, s);
    }
  }

  function handleMessage(obj) {
    // we receive commands to update result boxes and our seqnum
    if (obj.type === 'highestInbound') {
      console.log(`rx highestInbound=${obj}`);
      let { highestInbound } = obj;
    } else if (obj.type === 'message') {
      // obj.message will be JSON.stringify({target, methodName, args, slots, resultSlot})
      // we ignore the target, as we only export one object
      const msg = JSON.parse(obj.message);
      if (msg.methodName === 'connected') {
        console.log(`css-solo machine says we're connected`);
      } else if (msg.methodName === 'update') {
        const [histnum, s] = msg.args;
        // these args come from calls to vat-http.js updateHistorySlot()
        updateHistory(histnum, s);
      } else {
        console.log(`unknown methodName in ${obj.message}`);
      }
    }
  }

  ws.addEventListener('message', (ev) => {
      try {
        console.log('ws.message:', ev.data);
        const obj = JSON.parse(ev.data);
        handleMessage(obj);
      } catch(e) {
        console.log(`error handling message`, e);
      }
  });

  function submitEval() {
    const s = document.getElementById('input').value;
    console.log('submitEval', s);
    const histnum = highestHistory;
    highestHistory += 1;
    addHistory(histnum, `pending eval(${s})`);
    send({ histnum, s });
  }
  document.getElementById('go').onclick = submitEval;

}



run();
