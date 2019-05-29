
function run() {
  const loc = window.location;
  const protocol = loc.protocol.replace(/^http/, 'ws');
  const socketEndpoint = `${protocol}//${loc.host}/api/swingset`;
  const ws = new WebSocket(socketEndpoint);
  let queue = [];
  let send = obj => queue.push(JSON.stringify(obj));

  ws.addEventListener('error', (ev) => {
    console.log(`Error ${ev}`);
  });

  ws.addEventListener('open', (ev) => {
    console.log(`Connected!`);

    send = (obj) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
      }
    };

    while (queue.length > 0) {
      send(queue.shift());
    }
  });

  function handleMessage(obj) {
  }
  ws.addEventListener('message', (ev) => {
      try {
        console.log('Received:', ev.data);
        const obj = JSON.parse(ev.data);
        handleMessage(obj);
      } catch(e) {
        console.log(`error handling message`, e);
      }
  });

  send({action: 'frontend_ready'});
}



run();
