const harden = require('@agoric/harden');

function buildContractBundle(makeContractSrc, mainFnName) {
  const contractBundleSource = `
function getExport() {
  'use strict';
   function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }
   var harden = _interopDefault(require('@agoric/harden'));
   var Nat = _interopDefault(require('@agoric/nat'));

  ${makeContractSrc}

  return ${mainFnName};
}`;

  return harden({
    source: contractBundleSource,
    moduleFormat: 'module',
  });
}

const incrSrc = `const makeContract = harden({
  start: seed => {
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
  },
});
`;

const incrBundle = buildContractBundle(incrSrc, 'makeContract');

const serviceSrc = `const makeContract = harden({
  start: () => {
    return harden({
      getANumber() {
        return 13;
      },
    });
  },
});
`;

const serviceBundle = buildContractBundle(serviceSrc, 'makeContract');

const brokenServiceSrc = `const makeContract = harden({ start: 37 }); `;

const brokenSvcBundle = buildContractBundle(brokenServiceSrc, 'makeContract');

export default function setup(syscall, state, helpers) {
  const { log } = helpers;
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        async bootstrap(argv, vats, devices) {
          const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
            devices.vatAdmin,
          );
          switch (argv[0]) {
            case 'newVat':
              {
                log(`starting newVat test`);
                const { root } = await E(vatAdminSvc).createVat(serviceBundle);
                const c = E(root).start();
                log(await E(c).getANumber());
              }
              break;
            case 'counters':
              {
                log(`starting counter test`);
                const { root } = await E(vatAdminSvc).createVat(incrBundle);
                const c = E(root).start(1);
                log(await E(c).increment(3));
                log(await E(c).increment(5));
                log(await E(c).ticker());
              }
              break;
            case 'vatFromBundle':
              {
                log(`starting vat from Bundle test`);
                const { root } = await E(vatAdminSvc).createVat(incrBundle);
                const c = E(root).start(1);
                log(await E(c).increment(3));
                log(await E(c).increment(5));
                log(await E(c).ticker());
              }
              break;
            case 'brokenVat': {
              log(`starting brokenVat test`);
              E(vatAdminSvc)
                .createVat(brokenSvcBundle)
                .then(
                  result => log(`didn't expect success ${result}`),
                  rejection => log(`yay, rejected: ${rejection}`),
                );
              return;
            }
            case 'vatStats': {
              log(`starting stats test`);
              const { root, adminNode } = await E(vatAdminSvc).createVat(
                incrBundle,
              );
              log(await E(adminNode).adminData());
              const c = E(root).start(1);
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
