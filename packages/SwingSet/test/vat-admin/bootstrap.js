const harden = require('@agoric/harden');

const serviceHolder = {
  build: E => {
    // eslint-disable-next-line no-shadow,global-require
    const harden = require('@agoric/harden');
    function rcvrMaker(seed) {
      let count = 0;
      let sum = seed;
      return harden({
        increment(val) {
          sum += val;
          count += 1;
          return sum;
        },
        ticker() {
          return count;
        },
      });
    }
    return harden({
      getANumber() {
        return 13;
      },
      sendMsg(obj, arg) {
        return E(obj).message(arg);
      },
      createRcvr(init) {
        return rcvrMaker(init);
      },
    });
  },
};

const brokenServiceHolder = {
  build: () => {
    return harden({});
  },
};

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        async bootstrap(argv, vats, devices) {
          switch (argv[0]) {
            case 'newVat':
              {
                log(`starting newVat test`);
                const src = `${serviceHolder.build}`;
                const vatAdminSvc = await E(
                  vats.vatAdmin,
                ).createVatAdminService(devices.vatAdmin);
                const { root } = await E(vatAdminSvc).createVat(src);
                const n = await E(root).getANumber();
                log(n);
              }
              break;
            case 'counters': {
              log(`starting counter test`);
              const src = `${serviceHolder.build}`;
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              const { root } = await E(vatAdminSvc).createVat(src);
              const c = E(root).createRcvr(1);
              log(await E(c).increment(3));
              log(await E(c).increment(5));
              log(await E(c).ticker());
              return;
            }
            case 'brokenVat': {
              log(`starting brokenVat test`);
              const src = `${brokenServiceHolder.build}`;
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              log(await E(vatAdminSvc).createVat(src));
              return;
            }
            case 'vatStats': {
              log(`starting stats test`);
              const src = `${serviceHolder.build}`;
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              const { adminNode } = await E(vatAdminSvc).createVat(src);
              log(await E(adminNode).adminData());
              return;
            }
            default:
              throw new Error(`unknown argv mode '${argv[0]}'`);
          }
        },
      }),
    helpers.vatID,
  );
}
