const portsToTasks = new Map();
const tasks = new Map();

const unicast = (port, obj) => {
  try {
    port.postMessage(obj);
  } catch (e) {
    const myTasks = portsToTasks.get(port);
    if (myTasks) {
      portsToTasks.delete(port);
      myTasks.forEach(task => {
        if (task.port === port) {
          task.port = null;
        }
      });
    }
  }
};

const broadcast = obj => {
  for (const port of portsToTasks.keys()) {
    unicast(port, obj);
  }
};

let count = 0;

// eslint-disable-next-line no-restricted-globals
self.addEventListener('connect', connectEv => {
  const clientPort = connectEv.ports[0];
  const myTasks = new Set();
  portsToTasks.set(clientPort, myTasks);
  unicast(clientPort, { type: 'SCHED_OUTBOUND', msg: count });
  clientPort.start();
  clientPort.addEventListener('message', ev => {
    const obj = ev.data;
    console.log('scheduler got', obj);
    switch (obj && obj.type) {
      case 'SCHED_REGISTER': {
        const { id, script } = obj;
        let task = tasks.get(id);
        if (!task) {
          const port = null;
          task = { port, script };
          tasks.set(id, task);
        }
        break;
      }
      case 'SCHED_INBOUND': {
        const { id, msg } = obj;
        const task = tasks.get(id);
        let port = task.port;
        const deliver = { type: 'SCHED_DELIVER', id, script: task.script, msg };
        // unicast(port, deliver);
        if (1 || task.port === null) {
          console.log('first choice for delivery failed');
          port = clientPort;
          myTasks.add(task);
          port.postMessage(deliver);
        }
        task.port = port;
        break;
      }
      case 'SCHED_CRANK_DONE': {
        const { id, isReject } = obj;
        const task = tasks.get(id);
        if (task.port !== clientPort) {
          throw Error(`Nacho port`, id);
        }
        if (isReject) {
          unicast(task.port, { type: 'SCHED_KILL', id });
          task.port = null;
        } else {
          count += 1;
          broadcast({ type: 'SCHED_OUTBOUND', msg: count });
        }
        break;
      }
      default: {
        console.log('unrecognized sched message');
      }
    }
  });
});
