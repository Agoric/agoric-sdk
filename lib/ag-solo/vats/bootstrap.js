import harden from '@agoric/harden';
// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { GCI } from './gci';

console.log(`loading bootstrap.js`);

// TODO(hibbert) return a single role
function parseArgs(argv) {
  const ROLES = {};
  let gotRoles = false;
  let bootAddress;
  const additionalAddresses = [];
  argv.forEach(arg => {
    const match = arg.match(/^--role=(.*)$/);
    if (match) {
      ROLES[match[1]] = true;
      gotRoles = true;
    } else if (!bootAddress && !arg.match(/^-/)) {
      bootAddress = arg;
    } else if (!arg.match(/^-/)) {
      additionalAddresses.push(arg);
    }
  });
  if (!gotRoles) {
    ROLES.three_client = true;
  }

  if (Object.getOwnPropertyNames(ROLES).length !== 1) {
    throw new Error(`must assign exactly one role, not ${ROLES}`);
  }

  return [ROLES, bootAddress, additionalAddresses];
}

const SCENARIO_2_INDEX = 1;

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => {
      async function createPrivateBundle(vats, contractHost, zoe, registrar) {
        const spawner = await E(vats.host).makeHost();
        E(vats.wallet).startup(contractHost, zoe, registrar);
        const wallet = await fillTwoPurses(vats, 'Moola purse', 'Simolean purse');
        return harden({
          uploads: await E(vats.uploads).getUploads(),
          spawner,
          http: {
            registerCommandHandler(handler) {
              return E(vats.http).registerCommandHandler(handler);
            },
          },
          wallet,
        });
      }

      async function setupCommandDevice(vats, devices, roles) {
        await E(vats.http).setCommandDevice(devices.command, roles);
        D(devices.command).registerInboundHandler(vats.http);
      }

      async function setupWalletVat(E, vats, devices) {
        await E(vats.http).registerCommandHandler(vats.wallet);
        await E(vats.wallet).setCommandDevice(devices.command);
        await E(vats.wallet).setPresences();
      }

      async function addLocalTimer(vats, devices) {
        await E(vats.timer).registerTimerDevice(devices.timer);
        return E(vats.timer).createTimerService();
      }

      async function fillTwoPurses(vats, moolahPurseName, simoleanPurseName) {
        const moola = E(vats.mints).getNewPurse('moola', moolahPurseName);
        const simolean = E(vats.mints).getNewPurse('simolean', simoleanPurseName);
        const wallet = await E(vats.wallet).getWallet();
        await E(wallet).addPurse(moola);
        await E(wallet).addPurse(simolean);
        return wallet;
      }

      function makeBundler(contractHost, vats) {
        return harden({
          async createDemoBundle(nickname, jackpot) {
            const sharingService = await E(vats.sharing).getSharingService();
            const registrar = await E(vats.registrar).getSharedRegistrar();
            const chainTimerService = await E(vats.timer).createTimerService();
            const pixelBundle = await E(vats.pixel).createPixelBundle(nickname);
            const exchange = await E(vats.exchange).getExchange();
            const zoe = await E(vats.zoe).getZoe();
            return harden({
              ...pixelBundle,
              chainTimerService,
              sharingService,
              contractHost,
              registrar,
              exchange,
              zoe,
            });
          },
        });
      }

      return harden({
        async bootstrap(argv, vats, devices) {
          console.log(`bootstrap(${argv.join(' ')}) called`);
          const [ROLES, bootAddress, additionalAddresses] = parseArgs(argv);

          async function addRemote(addr) {
            const { transmitter, setReceiver } = await E(vats.vattp).addRemote(addr);
            await E(vats.comms).addRemote(addr, transmitter, setReceiver);
          }

          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          if (bootAddress) {
            await Promise.all(
              [bootAddress, ...additionalAddresses].map(addr =>
                addRemote(addr),
              ),
            );
          }

          // scenario #1: Cloud has: multi-node chain, controller solo node,
          // provisioning server (python). New clients run provisioning
          // client (python) on localhost, which creates client solo node on
          // localhost, with HTML frontend. Multi-player mode.
          if (ROLES.chain || ROLES.one_chain) {
            console.log(`scenario#1: chain bootstrap starting`);
            const host = await E(vats.host).makeHost();
            await E(vats.pixel).startup(host);
            await E(vats.timer).registerTimerDevice(devices.timer);

            // provisioning vat can ask the demo server for bundles, and can
            // register client pubkeys with comms
            await E(vats.provisioning).register(
              makeBundler(host, vats),
              vats.comms,
              vats.vattp,
            );

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
          } else if (ROLES.controller || ROLES.one_controller) {
            console.log(`scenario#1: controller bootstrap starting`);
            if (!GCI) {
              throw new Error(`controller must be given GCI`);
            }
            // Wire up the http server.

            await setupCommandDevice(vats, devices, { controller: true });

            // Create a presence for the on-chain provisioner.
            await addRemote(GCI);
            const chainProvisioner = await E(vats.comms).addIngress(GCI, 1);
            // Allow web requests from the provisioning server to call our
            // provisioner object.
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey);
              },
            });
            await E(vats.http).setProvisioner(provisioner);
          } else if (ROLES.client || ROLES.one_client) {
            console.log(`scenario#1: client bootstrap starting`);
            if (!GCI) {
              throw new Error(`client must be given GCI`);
            }
            await setupCommandDevice(vats, devices, { client: true });
            const localTimerService = await addLocalTimer(vats, devices);
            await addRemote(GCI);
            // todo: this should be the ingressIndex from the provisioner
            const INDEX = 1;
            const demoProvider = await E(vats.comms).addIngress(GCI, INDEX);
            const bundle = await E(demoProvider).getDemoBundle();
            await E(vats.http).setPresences(
              { ...bundle, localTimerService },
              await createPrivateBundle(vats, bundle.contractHost, bundle.zoe, bundle.registrar),
            );
            console.log(` vats initialized`);
          } else if (ROLES.two_chain) {
            // scenario #2: one-node chain running on localhost, solo node on
            // localhost, HTML frontend on localhost. Single-player mode.
            // ROLES.localchain, ROLES.localclient.

            console.log(`scenario#2: local chain bootstrap starting`);
            // bootAddress holds the pubkey of localclient
            const host = await E(vats.host).makeHost();
            await E(vats.pixel).startup(host);
            await E(vats.timer).registerTimerDevice(devices.timer);
            const bundler = makeBundler(host, vats);
            const demoProvider = harden({
              async getDemoBundle(nickname) {
                return bundler.createDemoBundle(nickname);
              },
            });
            await Promise.all(
              [bootAddress, ...additionalAddresses].map(addr =>
                E(vats.comms).addEgress(addr, SCENARIO_2_INDEX, demoProvider),
              ),
            );
            console.log(`localchain vats initialized`);
          } else if (ROLES.two_client) {
            console.log(`scenario#2: local client bootstrap starting`);
            if (!GCI) {
              throw new Error(`client must be given GCI`);
            }
            await setupCommandDevice(vats, devices, { client: true });
            const localTimerService = await addLocalTimer(vats, devices);
            await addRemote(GCI);
            const demoProvider = await E(vats.comms).addIngress(GCI, SCENARIO_2_INDEX);
            const bundle = await E(demoProvider).getDemoBundle();
            await E(vats.http).setPresences(
              { ...bundle, localTimerService },
              await createPrivateBundle(vats, bundle.contractHost, bundle.zoe, bundle.registrar),
            );
            await setupWalletVat(E, vats, devices);
            console.log(`localclient vats initialized`);
          } else if (ROLES.three_client) {
            // scenario #3: no chain. solo node on localhost with HTML
            // frontend. Limited subset of demo runs inside the solo node.

            // Shared Setup (virtual chain side) ///////////////////////////
            console.log(`scenario#3: local demo-server+client bootstrap starting`);
            const host = await E(vats.host).makeHost();
            await E(vats.pixel).startup(host);
            await E(vats.timer).registerTimerDevice(devices.timer);
            const bundle = await makeBundler(host, vats).createDemoBundle('localuser');
            await E(vats.exchange).startup(host, bundle.zoe, bundle.registrar);

            // Setup of the Local part /////////////////////////////////////
            await E(vats.http).setPresences(
              bundle,
              await createPrivateBundle(vats, bundle.contractHost, bundle.zoe, bundle.registrar),
            );

            await setupCommandDevice(vats, devices, { client: true });
            await E(vats.http).registerCommandHandler(vats.exchange);
            await setupWalletVat(E, vats, devices);
          } else {
            throw new Error(`ROLES was not recognized: ${ROLES}`);
          }

          console.log('all vats initialized');
        },
      });
    },
    helpers.vatID,
  );
}
