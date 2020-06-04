import { runClib, sendClib } from '@agoric/lib-cosmic-relayer';

let nodePort = 0;
let ticker;
export async function runWrappedProgram(initSwingSet, args) {
  let clibPort;
  let swingSetInited = false;
  if (!ticker) {
    // Make sure we don't exit before Go is done.
    ticker = setInterval(() => 4, 30000);
  }

  async function processRelayer(port, str) {
    // If we get here, that means the relayer plans to forward packets.
    console.error(`node relayer inbound ${port} ${str}`);
    const m = JSON.parse(str);
    if (!swingSetInited) {
      // Start the SwingSet proper.
      swingSetInited = true;
      await initSwingSet();
    }

    // TODO: arrange for the golang IBC/relayer packet receiver to call
    // queueInboundBridge(obj) with each handshake/packet/ack event
    const retstr = sendClib(
      clibPort,
      JSON.stringify({ type: 'RELAYER_UPCALL', msg: m }),
    );
    return retstr;
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

  nodePort += 1;
  clibPort = runClib(nodePort, fromClib, homeArgs);
}
