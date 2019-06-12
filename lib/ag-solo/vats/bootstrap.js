import harden from '@agoric/harden';

// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { GCI } from './gci';

console.log(`loading bootstrap.js`);

function findRoles(argv) {
  const ROLES = {};
  let gotRoles = false;
  argv.forEach(arg => {
    const match = arg.match(/^--role=(.*)$/);
    if (match) {
      ROLES[match[1]] = true;
      gotRoles = true;
    }
  });
  if (!gotRoles) {
    ['client', 'chain', 'controller'].forEach(role => {
      ROLES[role] = true;
    });
  }
  return ROLES;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => {
      // TODO: Any wiring necessary to make the demo work.
      async function startDemo(vats) {
        await E(vats.demo).startup(vats.mint);
        return vats.demo;
      }

      return harden({
        async bootstrap(argv, vats, devices) {
          console.log('bootstrap() called');
          const ROLES = findRoles(argv);
          console.log(`Have ROLES`, ROLES);

          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          await E(vats.comms).init(vats.vattp);

          const demoRoot = await startDemo(vats);

          if (ROLES.client || ROLES.controller) {
            // Allow http access.
            await E(vats.http).setCommandDevice(devices.command, ROLES);
            D(devices.command).registerInboundHandler(vats.http);
          }

          if (ROLES.controller || ROLES.client) {
            // We give the REPL direct access to the fetcher object.
            const fetch = harden({
              getChainBundle(nickname) {
                  return E(demoRoot).getChainBundle(nickname);
              },
            });
            await E(vats.http).registerFetch(fetch);
          }

          let provisioner;
          if (ROLES.chain) {
            // 'provisioning' vat lives in the chain instances.
            await E(vats.provisioning).register(demoRoot, vats.comms);
            await E(vats.provisioning).registerHTTP(vats.http);

            provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              }
            });

            if (GCI) {
              // Publish the provisioner.
              await E(vats.comms).addEgress(GCI, 1, provisioner);
            }
          }

          if (!ROLES.chain && GCI) {
            // Find the chain's root object.
            provisioner = await E(vats.comms).addIngress(GCI, 1);
          }

          if (ROLES.controller) {
            await E(vats.http).setProvisioner(provisioner);
          }

          if (ROLES.client && !GCI) {
            // Register the demo for our REPL.
            await E(vats.comms).addEgress('solo', 1, demoRoot);
          }
          console.log('all vats initialized');
        },
      });
    },
    helpers.vatID,
  );
}
