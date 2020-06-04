import harden from '@agoric/harden';

console.debug(`loading bootstrap.js`);

function buildRootObject(E, D) {
  async function handle(body) {
    return { response: `${body.path} is ok` };
  }

  const root = {
    bootstrap(argv, vats, devices) {
      console.log(`bootstrap() invoked`);
      const commandHandler = harden({
        inbound(count, body) {
          console.log(`command:`, body);
          const p = handle(body);
          p.then(ok => D(devices.command).sendResponse(count, false, ok),
                 err => D(devices.command).sendResponse(count, true, err));
        },
      });
      D(devices.command).registerInboundHandler(commandHandler);
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    buildRootObject,
    helpers.vatID,
  );
}
