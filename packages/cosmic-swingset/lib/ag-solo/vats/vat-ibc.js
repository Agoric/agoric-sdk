import harden from '@agoric/harden';

function build(E, D) {
  function inbound(arg1, arg2) {
    console.log(`bridge inbound received ${arg1} ${arg2}`);
    // the most useful thing to do here is E(something).notify(args)

    // no return value
  }

  const handler = harden({ inbound });

  let bridgeDevice;

  function callOutbound(arg1, arg2) {
    if (!bridgeDevice) {
      throw Error(`bridge device not yet connected`);
    }
    const retval = D(bridgeDevice).callOutbound(arg1, arg2);
    // note: *we* get this return value synchronously, but any callers (in
    // separate vats) only get a Promise, and will receive the value in some
    // future turn
    return retval;
  }

  const outbound = harden({ callOutbound });

  // the bootstrap function calls this
  function connectToDevice(bd) {
    bridgeDevice = bd;
    D(bridgeDevice).registerInboundHandler(handler);
    return outbound;
  }

  const root = harden({ connectToDevice });

  return root;
}



export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
