const harden = require('@agoric/harden');

const serviceHolder = {
  build: E => {
    // eslint-disable-next-line no-shadow,global-require
    const harden = require('@agoric/harden');
    return harden({
      getANumber() {
        return 13;
      },
      sendMsg(obj, arg) {
        return E(obj).message(arg);
      },
    });
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
          if (argv[0] === 'newVat') {
            log(`starting wake test`);
            const src = `${serviceHolder.build}`;
            const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
              devices.vatAdmin,
            );
            const { root } = await E(vatAdminSvc).createVat(src);
            const n = await E(root).getANumber();
            log(n);

            return n;
          }
          throw new Error(`unknown argv mode '${argv[0]}'`);
        },
      }),
    helpers.vatID,
  );
}
