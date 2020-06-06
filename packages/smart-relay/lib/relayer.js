import { runClib, sendClib } from '@agoric/lib-cosmic-relayer';

let nodePort = 0;
let ticker;
let swingSetInited = false;

let queueInboundBridge;
let lastPromiseID = 0;
const idToPromise = new Map();

export async function runWrappedProgram(initSwingSet, args) {
  let clibPort;
  let startSwingSet = false;
  if (!ticker) {
    // Make sure we don't exit before Go is done.
    ticker = setInterval(() => 4, 30000);
  }

  async function processRelayer(port, str) {
    // If we get here, that means the relayer plans to forward packets.
    // console.error(`node relayer inbound ${port} ${str}`);
    if (!startSwingSet) {
      return true;
    }
    if (!swingSetInited) {
      // Start the SwingSet proper.
      swingSetInited = true;
      const bundle = await initSwingSet(obj => {
        switch (obj && obj.type) {
          case 'RESOLVE_UPCALL':
            idToPromise.get(obj.id).resolve(obj.value);
            break;
          case 'REJECT_UPCALL':
            idToPromise.get(obj.id).reject(obj.value);
            break;
          default:
            sendClib(clibPort, JSON.stringify(obj));
        }
      });
      queueInboundBridge = bundle.queueInboundBridge;
    }

    // arrange for the golang IBC/relayer packet receiver to call
    // queueInboundBridge('RELAYER_SEND', obj) with each handshake/packet/ack event

    const obj = JSON.parse(str);
    if (obj.type === 'RELAYER_SEND') {
      lastPromiseID += 1;
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

    // NOTE: The following continues normal control flow.
    return true;
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
  if (homeArgs.includes('link-then-start')) {
    startSwingSet = true;
  }

  nodePort += 1;
  clibPort = runClib(nodePort, fromClib, homeArgs);
}
