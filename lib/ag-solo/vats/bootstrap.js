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
        await E(vats.demo).startup(vats.http);
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

          let chainProvisioner;
          if (ROLES.chain) {
            // 'provisioning' vat lives in the chain instances.
            await E(vats.provisioning).register(demoRoot, vats.comms);
            await E(vats.provisioning).registerHTTP(vats.http);

            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                console.log('Provisioning', nickname, pubkey);
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              },
            });

            if (bootAddress) {
              // Publish the provisioner to our bootstrap address.
              await E(vats.comms).addEgress(bootAddress, 1, provisioner);
            }
            chainProvisioner = provisioner;
          } else if (ROLES.controller && GCI) {
            // Create a presence for the on-chain provisioner.
            chainProvisioner = await E(vats.comms).addIngress(GCI, 1);
          }

          if (ROLES.controller) {
            // Allow web requests to call our provisioner.
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey);
              },
            });
            await E(vats.http).setProvisioner(provisioner);
          }

          if (ROLES.client) {
            // Set the chain presence.
            await E(vats.http).setPresences({ chain: chainProvisioner });

            let chainDemoRoot;
            if (ROLES.chain) {
              chainDemoRoot = demoRoot;
            } else {
              chainDemoRoot = await E(vats.comms).addIngress(GCI, 1);
            }
            const bundle = await E(chainDemoRoot).getChainBundle();
            await E(vats.http).setPresences(bundle);
          }

          console.log('all vats initialized');
        },
      });
    },
    helpers.vatID,
  );
}
