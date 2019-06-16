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

          // scenario #1: Cloud has: multi-node chain, controller solo node,
          // provisioning server (python). New clients run provisioning
          // client (python) on localhost, which creates client solo node on
          // localhost, with HTML frontend. Multi-player mode.

          // scenario #2: one-node chain running on localhost, solo node on
          // localhost, HTML frontend on localhost. Single-player mode.
          // ROLES.localchain, ROLES.localclient.

          if (ROLES.localchain) {
            console.log(`localchain bootstrap starting`);
            // bootAddress holds the pubkey of localclient
            const fakeHTTP = harden({
              updateCanvas(newState) {},
            });
            await E(vats.demo).startup(fakeHTTP);
            const demoProvider = harden({
              async getDemoBundle(nickname) {
                return await E(vats.demo).getChainBundle(nickname);
              },
            });
            await E(vats.comms).addEgress(bootAddress, 1, demoProvider);
            console.log(`localchain vats initialized`);
            return;
          }
          if (ROLES.localclient) {
            console.log(`localclient bootstrap starting`);
            await E(vats.http).setCommandDevice(devices.command, {client: true});
            D(devices.command).registerInboundHandler(vats.http);
            const demoProvider = await E(vats.comms).addIngress(GCI, 1);
            const bundle = await E(demoProvider).getDemoBundle('nickname');
            await E(vats.http).setPresences(bundle);
            //await E(vats.http).setPresences({ chain: chainProvisioner });
            console.log(`localclient vats initialized`);
            return;
          }

          // scenario #3: no chain. solo node on localhost with HTML
          // frontend. Limited subset of demo runs in the solo node.

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
            await E(vats.provisioning).registerHTTP(vats.http); // wrong+unused

            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                console.log('Provisioning', nickname, pubkey);
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              },
            });

            if (bootAddress) {
              // make our provisioner available to the controller's pubkey
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
