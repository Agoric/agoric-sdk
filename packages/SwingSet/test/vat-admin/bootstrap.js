import harden from '@agoric/harden';

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
                const vatAdminSvc = await E(
                  vats.vatAdmin,
                ).createVatAdminService(devices.vatAdmin);
                const { root } = await E(vatAdminSvc).createVat(argv[1]);
                const n = await E(root).getANumber();
                log(n);
              }
              break;
            case 'counters': {
              log(`starting counter test`);
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              const { root } = await E(vatAdminSvc).createVat(argv[1]);
              const c = E(root).createRcvr(1);
              log(await E(c).increment(3));
              log(await E(c).increment(5));
              log(await E(c).ticker());
              return;
            }
            case 'brokenVat': {
              log(`starting brokenVat test`);
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              E(vatAdminSvc)
                .createVat(argv[1])
                .then(
                  result => log(`didn't expect success ${result}`),
                  rejection => log(`yay, rejected: ${rejection}`),
                );
              return;
            }
            case 'vatStats': {
              log(`starting stats test`);
              const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
                devices.vatAdmin,
              );
              const { root, adminNode } = await E(vatAdminSvc).createVat(
                argv[1],
              );
              log(await E(adminNode).adminData());
              const c = E(root).createRcvr(1);
              log(await E(c).increment(3));
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
