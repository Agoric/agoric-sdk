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
    ROLES.three_client = true;
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

          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          await E(vats.comms).init(vats.vattp);

          if (Object.getOwnPropertyNames(ROLES).length !== 1) {
            throw new Error(`must assign exactly one role, not ${ROLES}`);
          }

          // scenario #1: Cloud has: multi-node chain, controller solo node,
          // provisioning server (python). New clients run provisioning
          // client (python) on localhost, which creates client solo node on
          // localhost, with HTML frontend. Multi-player mode.

          if (ROLES.chain || ROLES.one_chain) {
            console.log(`scenario#1: chain bootstrap starting`);
            const host = await E(vats.host).makeHost();
            await E(vats.demo).startup(host);

            // provisioning vat can ask the demo server for bundles, and can
            // register client pubkeys with comms
            await E(vats.provisioning).register(vats.demo, vats.comms);

            // accept provisioning requests from the controller
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                console.log('Provisioning', nickname, pubkey);
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              },
            });
            // bootAddress holds the pubkey of controller
            await E(vats.comms).addEgress(bootAddress, 1, provisioner);
            console.log(`localchain vats initialized`);
            return;
          }

          if (ROLES.controller || ROLES.one_controller) {
            console.log(`scenario#1: controller bootstrap starting`);
            if (!GCI) {
              throw new Error(`controller must be given GCI`);
            }
            // Wire up the http server.
            await E(vats.http).setCommandDevice(devices.command, {controller: true});
            D(devices.command).registerInboundHandler(vats.http);

            // Create a presence for the on-chain provisioner.
            const chainProvisioner = await E(vats.comms).addIngress(GCI, 1);
            // Allow web requests from the provisioning server to call our
            // provisioner object.
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey);
              },
            });
            await E(vats.http).setProvisioner(provisioner);
            return;
          }

          if (ROLES.client || ROLES.one_client) {
            console.log(`scenario#1: client bootstrap starting`);
            await E(vats.http).setCommandDevice(devices.command, {client: true});
            D(devices.command).registerInboundHandler(vats.http);
            // todo: this should be the ingressIndex from the provisioner
            const INDEX = 1;
            const demoProvider = await E(vats.comms).addIngress(GCI, INDEX);
            const bundle = await E(demoProvider).getDemoBundle();
            await E(vats.http).setPresences(bundle);
            console.log(` vats initialized`);
            return;
          }

          // scenario #2: one-node chain running on localhost, solo node on
          // localhost, HTML frontend on localhost. Single-player mode.
          // ROLES.localchain, ROLES.localclient.

          const SC2_INDEX = 1;
          if (ROLES.two_chain) {
            console.log(`scenario#2: local chain bootstrap starting`);
            // bootAddress holds the pubkey of localclient
            const host = await E(vats.host).makeHost();
            await E(vats.demo).startup(host);
            const demoProvider = harden({
              async getDemoBundle(nickname) {
                return await E(vats.demo).createDemoClientBundle(nickname);
              },
            });
            await E(vats.comms).addEgress(bootAddress, SC2_INDEX, demoProvider);
            console.log(`localchain vats initialized`);
            return;
          }

          if (ROLES.two_client) {
            console.log(`scenario#2: local client bootstrap starting`);
            await E(vats.http).setCommandDevice(devices.command, {client: true});
            D(devices.command).registerInboundHandler(vats.http);
            const demoProvider = await E(vats.comms).addIngress(GCI, SC2_INDEX);
            const bundle = await E(demoProvider).getDemoBundle();
            await E(vats.http).setPresences(bundle);
            console.log(`localclient vats initialized`);
            return;
          }

          // scenario #3: no chain. solo node on localhost with HTML
          // frontend. Limited subset of demo runs inside the solo node.

          if (ROLES.three_client) {
            console.log(`scenario#3: local demo-server+client bootstrap starting`);
            const host = await E(vats.host).makeHost();
            await E(vats.demo).startup(host);
            const bundle = await E(vats.demo).createDemoClientBundle('localuser');
            await E(vats.http).setCommandDevice(devices.command, {client: true});
            D(devices.command).registerInboundHandler(vats.http);
            await E(vats.http).setPresences(bundle);
          }

          console.log('all vats initialized');
        },
      });
    },
    helpers.vatID,
  );
}
