import harden from '@agoric/harden';

console.debug(`loading bootstrap.js`);

function buildRootObject(E, D) {
  // this receives HTTP requests, and can return JSONable objects in response

  function doBootstrap(argv, vats, devices) {
    E(vats.relayer).setTimerManager(
      E(vats.timer).createTimerService(devices.timer),
    );

    async function handleCommand(req) {
      if (req.path === '/install') {
        return E(vats.relayer).install(req.body);
      }
      return { response: `${req.path} is ok` };
    }

    const commandHandler = harden({
      inbound(count, body) {
        console.log(`command:`, body);
        const p = handleCommand(body);
        p.then(
          ok => D(devices.command).sendResponse(count, false, ok),
          err => D(devices.command).sendResponse(count, true, err),
        );
      },
    });
    D(devices.command).registerInboundHandler(commandHandler);

    const bridgeSender = harden({
      send(arg) {
        D(devices.bridge).callOutbound(arg);
      },
    });

    const bridgeHandler = harden({
      inbound(arg) {
        console.log(`bridge input`, arg);
        E(vats.relayer).handle(bridgeSender, arg);
      },
    });
    D(devices.bridge).registerInboundHandler(bridgeHandler);
  }

  const root = {
    bootstrap(...args) {
      console.log(`bootstrap() invoked`);
      try {
        doBootstrap(...args);
        console.log(`bootstrap() successful`);
      } catch (e) {
        console.log(`error during bootstrap`);
        console.log(e);
        throw e;
      }
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
}
