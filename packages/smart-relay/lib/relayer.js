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
    if (!swingSetInited) {
      // Start the SwingSet proper.
      swingSetInited = true;
      await initSwingSet();
    }

    // TODO: arrange for the golang IBC/relayer packet receiver to call
    // queueInboundBridge(obj) with each handshake/packet/ack event

    const obj = JSON.parse(str);
    if (false && obj.type === 'RELAYER_SEND') {
      // FIXME: Decoupled send functionality doesn't yet work.
      // All we can do is observe the packets.
      console.log('sending downcall');
      const ret = sendClib(clibPort, JSON.stringify(obj));
      console.log('send downcall result', ret);
      if (!JSON.parse(ret)) {
        throw Error(`Unexpected downcall failure ${ret}`);
      }
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

  nodePort += 1;
  clibPort = runClib(nodePort, fromClib, homeArgs);
}
