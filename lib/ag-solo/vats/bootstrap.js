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
      return harden({
        async bootstrap(argv, vats, devices) {
          console.log(`bootstrap(${argv.join(' ')}) called`);
          const [ROLES, bootAddress] = parseArgs(argv);
          console.log(`Have ROLES`, ROLES, bootAddress);

          // Wiring necessary to make the demo work.
          async function startDemo() {
            const saver = harden({
              saveCanvas(canvasState) {
                if (ROLES.client) {
                  return E(vats.http).updateCanvasState(canvasState);
                }
                if (devices.storage) {
                  D(devices.storage).set('canvas', canvasState);
                }
              },
            });
            await E(vats.demo).startup(saver);
            return vats.demo;
          }

          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          await E(vats.comms).init(vats.vattp);

          if (ROLES.client || ROLES.controller) {
            // Allow http access.
            await E(vats.http).setCommandDevice(devices.command, ROLES);
            D(devices.command).registerInboundHandler(vats.http);
          }

          const demoRoot = await startDemo();

          let chainProvisioner;
          if (ROLES.chain) {
            // 'provisioning' vat lives in the chain instances.
            await E(vats.provisioning).register(demoRoot, vats.comms);
            await E(vats.provisioning).registerHTTP(vats.http);

            const provisioner = harden({
              pleaseProvision(nickname, pubkey, ingress) {
                ingress = ingress || 1;
                console.log('Provisioning', nickname, pubkey, ingress);
                return E(vats.provisioning).pleaseProvision(nickname, pubkey, ingress);
              },
            });

            if (bootAddress) {
              // Publish the provisioner to our bootstrap address.
              await E(vats.comms).addEgress(bootAddress, 1, provisioner);
            }
            chainProvisioner = provisioner;
          } else if (GCI) {
            // Create a presence for the on-chain provisioner.
            chainProvisioner = await E(vats.comms).addIngress(GCI, 1);
          }

          if (ROLES.controller) {
            // Allow web requests to call our provisioner.
            const provisioner = harden({
              pleaseProvision(nickname, pubkey, ingress) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey, ingress);
              },
            });
            await E(vats.http).setProvisioner(provisioner);
          }

          if (ROLES.client) {
            // Set the chain presence.
            await E(vats.http).setPresences({ chain: chainProvisioner });

            let chainDemoRoot;
            if (GCI) {
              const { ingressIndex } = await E(
                chainProvisioner,
              ).pleaseProvision('client', bootAddress, 2);
              chainDemoRoot = await E(vats.comms).addIngress(GCI, ingressIndex);
            } else {
              chainDemoRoot = demoRoot;
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
