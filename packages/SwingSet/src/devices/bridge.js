/* global require */
/*
  The 'bridge' devices provides bidirectional function calls between objects
  on the host and code within a swingset.

  The host should use buildBridge() to create a record that contains:

   * the `srcPath` and `endowments` which must be configured into the
     swingset, to create the device
   * a `deliverInbound` function, to send async inbound messages
     (host->swingset)
   * some additional objects for debugging and testing

  Once everything is configured, the host can call `deliverInbound(arg1,
  arg2..)`, and the handler vat's `inbound()` method will be called with the
  same arguments. The handler vat can then dispatch to whatever other objects
  it likes. The arguments passed into `deliverInbound()` must all be
  JSON-serializable, and the function immediately returns `undefined`. The
  handler vat will not see the `inbound` message until some future crank of
  the kernel run queue.

  Likewise, the handler vat (or any vat with access to the device node) can
  invoke the `outbound(arg1, arg2..)` method, and the host's
  `outboundCallback` function will be called with the same arguments. Unlike
  `inbound()`, the `outboundCallback` function will be called immediately,
  and it can return a value which will be given back to vat-side caller of
  `outbound()`. All arguments, and the return value, must be
  JSON-serializable.

  The host must provide the outbound callback during construction:

    function outboundCallback(arg1, arg2) {
      console.log(`swingset says hi ${arg1}`);
      return retval;
    }

    const bd = buildBridge(outboundCallback);

    config.devices = [];
    config.devices.push(['bridge', bd.srcPath, bd.endowments]);

    const c = await buildVatController(config);

    ...
    // when something happens outside, queue an inbound message
    bd.deliverInbound('hello swingset');
    // then cycle the swingset as usual

  The bootstrap function must connect the bridge device with a vat which will
  register an inbound handler. If the handler vat is named 'bridge-handler',
  its root object might look like:

    const inboundHandler = harden({
      inbound(...args) {
        console.log(`host says hi ${args}`);
        // no return value
      },
    });

    const root = harden({
      connect(bridgeDevice) {
        D(bridgeDevice).registerInboundHandler(inboundHandler);
      },
      sayHello() {
        const response = D(bridgeDevice).callOutbound('arg1', 'arg2');
        // 'response' is returned synchronously
        console.log(`host responded ${response}`);
      },
    });
    return root;

  Then the bootstrap function must wire them together like:

    E(vats['bridge-handler']).connect(devices['bridge']);

  The host must wait for the bootstrap phase to settle before it can call
  `deliverInbound()`, to give the vat a chance to register the inbound
  handler, and to give the inner half of the device a chance to register
  itself with the outer half.

*/

function sanitize(data) {
  // TODO: use @agoric/marshal:pureCopy when it exists.
  // Note: It exists.
  if (data === undefined) {
    return undefined;
  }
  if (data instanceof Error) {
    data = data.stack;
  }
  return JSON.parse(JSON.stringify(data));
}

export function buildBridge(outboundCallback) {
  const srcPath = require.resolve('./bridge-src');
  let inboundCallback;

  function registerInboundCallback(inbound) {
    if (inboundCallback) {
      throw new Error('inboundCallback already registered');
    }
    inboundCallback = inbound;
  }

  function deliverInbound(...args) {
    if (!inboundCallback) {
      throw new Error('inboundCallback not yet registered');
    }
    inboundCallback(...args);
  }

  function callOutbound(...args) {
    // TODO: prevent cross-Realm contamination by serializing/deserializing
    // all the data that crosses this boundary. Inside the device
    // (bridge-src.js), we know we're immediately serializaing this data, so
    // we don't need to sanitize it there. But here, we have no idea what
    // outboundCallback() might do, so we want to avoid confusion. When we
    // switch to new-SES, we can remove this protection.
    return outboundCallback(...sanitize(args));
  }

  return {
    srcPath,
    endowments: { registerInboundCallback, callOutbound },
    deliverInbound, // for external access
  };
}
