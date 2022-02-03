import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;
  return Far('root', {
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      const bundles = argv[1];
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      switch (argv[0]) {
        case 'newVat':
          {
            log(`starting newVat test`);
            const { root } = await E(vatAdminSvc).createVat(
              bundles.newVatBundle,
            );
            const n = await E(root).getANumber();
            log(n);
          }
          break;
        case 'counters': {
          log(`starting counter test`);
          const { root } = await E(vatAdminSvc).createVat(bundles.newVatBundle);
          const c = E(root).createRcvr(1);
          log(await E(c).increment(3));
          log(await E(c).increment(5));
          log(await E(c).ticker());
          return;
        }
        case 'brokenVat': {
          log(`starting brokenVat test`);
          E(vatAdminSvc)
            .createVat(bundles.brokenVatBundle)
            .then(
              result => log(`didn't expect success ${result}`),
              rejection => log(`yay, rejected: ${rejection}`),
            );
          return;
        }
        case 'non-bundle': {
          log(`starting non-bundle test`);
          E(vatAdminSvc)
            .createVat(bundles.nonBundle)
            .then(
              result => log(`didn't expect success ${result}`),
              rejection => log(`yay, rejected: ${rejection}`),
            );
          return;
        }
        default:
          assert.fail(X`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}
