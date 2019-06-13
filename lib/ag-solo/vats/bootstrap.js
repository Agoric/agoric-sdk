import harden from '@agoric/harden';

// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { GCI } from './gci';

console.log(`loading bootstrap.js`);

function parseArgs(argv) {
  const ROLES = {};
  let gotRoles = false;
  let bootAddress;
  argv.forEach(arg => {
    const match = arg.match(/^--role=(.*)$/);
    if (match) {
      ROLES[match[1]] = true;
      gotRoles = true;
    } else if (!bootAddress && !arg.match(/^-/)) {
      bootAddress = arg;
    }
  });
  if (!gotRoles) {
    ['client', 'chain', 'controller'].forEach(role => {
      ROLES[role] = true;
    });
  }
  return [ROLES, bootAddress];
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
          console.log(`bootstrap(${argv.join(' ')}) called`);
          const [ROLES, bootAddress] = parseArgs(argv);
          console.log(`Have ROLES`, ROLES, bootAddress);

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
          let chainProvisioner;
          if (ROLES.chain) {
            // 'provisioning' vat lives in the chain instances.
            await E(vats.provisioning).register(demoRoot, vats.comms);
            await E(vats.provisioning).registerHTTP(vats.http);

            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                console.log('Provisioning', nickname, pubkey);
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              }
            });

            if (bootAddress) {
              // Publish the provisioner to our bootstrap address.
              await E(vats.comms).addEgress(bootAddress, 1, provisioner);
            }
            chainProvisioner = provisioner;
          } else if (GCI) {
            // This should create a presence for the published chain egress.
            chainProvisioner = await E(vats.comms).addIngress(GCI, 1);
          }

          if (ROLES.controller) {
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey);
              }
            });
            await E(vats.http).setProvisioner(provisioner);
          }

          if (ROLES.client && chainProvisioner) {
            // TODO: Should we maybe do something like:
            // const bundle = await E(chainProvisioner).getChainBundle();
            await E(vats.http).setChainPresence(chainProvisioner);
          }

          console.log('all vats initialized');
        },
      });
    },
    helpers.vatID,
  );
}
