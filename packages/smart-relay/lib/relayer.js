import { runClib, sendClib } from '@agoric/lib-cosmic-relayer';

let nodePort = 0;
let ticker;

let lastPromiseID = 0;
const idToPromise = new Map();

let queueInboundBridge;

export async function makeStartRelayer(initSwingSet = undefined) {
  if (!ticker) {
    // Make sure we don't exit before Go is done.
    ticker = setInterval(() => 4, 30000);
  }

  async function startRelayer(args) {
    let clibPort;

    async function processRelayer(port, str) {
      // arrange for the golang IBC/relayer packet receiver to call
      // queueInboundBridge('RELAYER_SEND', obj) with each handshake/packet/ack event
      const obj = JSON.parse(str);
      if (obj.type !== 'RELAYER_SEND' || !initSwingSet) {
        // Just indicate we want the default behaviour.
        return true;
      }

      lastPromiseID += 1;
      // Mark this message to be dispatched to our instance.
      obj.clibPort = clibPort;
      const promiseID = lastPromiseID;
      const prec = {};
      prec.promise = new Promise((resolve, reject) => {
        prec.resolve = res => {
          idToPromise.delete(promiseID);
          resolve(res);
        };
        prec.reject = rej => {
          idToPromise.delete(promiseID);
          reject(rej);
        };
      });
      idToPromise.set(promiseID, prec);
      queueInboundBridge(obj.type, obj, promiseID);
      await prec.promise;

      // Declare that we decided/will decide what to send.
      return false;
    }

    function fromClib(port, str, replier) {
      // Resolve or reject the inbound call according to processRelayer.
      return processRelayer(port, str).then(
        res => replier.resolve(`${res}`),
        rej => replier.reject(`${(rej && rej.stack) || rej}`),
      );
    }

    // Run the relayer command line.
    if (process.env.RLY_HOME === undefined) {
      process.env.RLY_HOME = `${process.cwd()}/state/rly`;
    }
    if (args[1] === 'config' && args[2] === 'show-home') {
      console.log(process.env.RLY_HOME);
      process.exit(0);
    }

    const homeArgs = [...args];
    homeArgs.splice(1, 0, `--home=${process.env.RLY_HOME}`);

    clibPort = runClib(nodePort, fromClib, homeArgs);
  }

  if (initSwingSet) {
    const { queueInboundBridge: qib } = await initSwingSet(obj => {
      switch (obj && obj.type) {
        case 'RESOLVE_UPCALL':
          idToPromise.get(obj.id).resolve(obj.value);
          break;
        case 'REJECT_UPCALL':
          idToPromise.get(obj.id).reject(obj.value);
          break;
        case 'START_RELAYER':
          startRelayer(obj.args).catch(e =>
            console.error(`Error running`, obj.args, e),
          );
          break;
        default:
          sendClib(obj.clibPort, JSON.stringify(obj));
      }
      // eslint-disable-next-line no-use-before-define
    }, startRelayer);
    queueInboundBridge = qib;
  }

  return startRelayer;
}

export async function runWrappedProgram(initSwingSet, args) {
  if (args.includes('link-then-start')) {
    // SwingSet + relayer.
    const startRelayer = await makeStartRelayer(initSwingSet);
    // Run the combination.
    await startRelayer(args);
  } else if (args.includes('daemon')) {
    // SwingSet, wait for connections.
    await makeStartRelayer(initSwingSet);
  } else {
    // No SwingSet, just relayer.
    const startRelayer = await makeStartRelayer();
    await startRelayer(args);
  }
}
