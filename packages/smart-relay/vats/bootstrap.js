import harden from '@agoric/harden';

console.debug(`loading bootstrap.js`);

function buildRootObject(E, D) {
  // this receives HTTP requests, and can return JSONable objects in response

  async function doBootstrap(argv, vats, devices) {
    const GCI = argv[0];
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
      inbound(...args) {
        console.log(`bridge input`, ...args);
        E(vats.relayer).handle(bridgeSender, ...args);
      },
    });
    D(devices.bridge).registerInboundHandler(bridgeHandler);

    /*
    async function addRemote(addr) {
      const { transmitter, setReceiver } = await E(vats.vattp).addRemote(
        addr,
      );
      await E(vats.comms).addRemote(addr, transmitter, setReceiver);
    }

    D(devices.mailbox).registerInboundHandler(vats.vattp);
    await E(vats.vattp).registerMailboxDevice(devices.mailbox);
    addRemote(GCI);
    const chainObjectSomething = await E(vats.comms).addIngress(GCI, SOME_SMALL_INTEGER);
    */
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
