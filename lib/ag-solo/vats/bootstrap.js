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

const SCENARIO_1_INDEX = 1;
const SCENARIO_2_INDEX = 1;

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => {
      function addPursesToWallet(purses, walletVat) {
        const wallet = E(walletVat).getWallet();
        for (const purse of purses) {
          E(wallet).addPurse(purse);
        }
        return wallet;
      }

      // objects that live in the client's solo vat.
      async function createLocalBundle(vats, userBundle, purses) {
        const { contractHost, zoe, registrar } = userBundle;
        // like contract host, but only trusted by owner. can spawn contracts
        const spawner = E(vats.host).makeHost();
        const uploads = E(vats.uploads).getUploads();

        // Wallet for both end-user client and dapp dev client
        E(vats.wallet).startup(contractHost, zoe, registrar);
        const wallet = addPursesToWallet(purses, vats.wallet);

        // exchange is used for autoswap. It should only be in the dapp's
        // Swingset, but we make no distinction now, so the user also gets it
        await E(vats.exchange).startup(contractHost, zoe, registrar);
        await E(vats.http).registerCommandHandler(vats.exchange);
        const exchange = await E(vats.exchange).getExchange();

        // This will allow Dapp developers to register in their dapp.js
        const httpRegCallback = {
          registerCommandHandler(handler) {
            console.log(`HTTP registerCommandHandler ${vats.http}`);
            return E(vats.http).registerCommandHandler(handler);
          },
        };
        return { uploads, spawner, wallet, exchange, http: httpRegCallback };
      }

      async function setupCommandDevice(httpVat, cmdDevice, roles) {
        await E(httpVat).setCommandDevice(cmdDevice, roles);
        D(cmdDevice).registerInboundHandler(httpVat);
      }

      async function setupWalletVat(commandDevice, httpVat, walletVat) {
        await E(httpVat).registerCommandHandler(walletVat);
        await E(walletVat).setCommandDevice(commandDevice);
        await E(walletVat).setPresences();
      }

      async function addTimerService(timerDevice, timerVat) {
        E(timerVat).registerTimerDevice(timerDevice);
        return E(timerVat).createTimerService();
      }

      // Make services that are provided on the real or virtual chain side
      async function makeChainBundler(vats, timerDevice) {
        // Create singleton instances.
        const sharingService = await E(vats.sharing).getSharingService();
        const registrar = await E(vats.registrar).getSharedRegistrar();
        const chainTimerService = await addTimerService(
          timerDevice,
          vats.timer,
        );
        const contractHost = await E(vats.host).makeHost();
        await E(vats.pixel).startup(contractHost);
        const zoe = await E(vats.zoe).getZoe();

        return harden({
          async createUserBundle(nickname) {
            const pixelBundle = await E(vats.pixel).createPixelBundle(nickname);
            const bundle = harden({
              ...pixelBundle,
              chainTimerService,
              sharingService,
              contractHost,
              registrar,
              zoe,
            });

            // return purses separately so they can be added to local wallet
            const moola = E(vats.mints).getNewPurse('moola', 'Moola purse');
            const simolean = E(vats.mints).getNewPurse(
              'simolean',
              'Simolean purse',
            );
            return { purses: [moola, simolean], bundle };
          },
        });
      }

      return harden({
        async bootstrap(argv, vats, devices) {
          console.log(`bootstrap(${argv.join(' ')}) called`);
          const [ROLES, bootAddress, additionalAddresses] = parseArgs(argv);

          async function addRemote(addr) {
            const { transmitter, setReceiver } = await E(vats.vattp).addRemote(
              addr,
            );
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

            // provisioning vat can ask the demo server for bundles, and can
            // register client pubkeys with comms
            await E(vats.provisioning).register(
              await makeChainBundler(vats, devices.timer),
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
            await E(vats.comms).addEgress(bootAddress, SCENARIO_1_INDEX, provisioner);
            console.log(`localchain vats initialized`);
          } else if (ROLES.controller || ROLES.one_controller) {
            // todo(hibbert) make this consistent with the bundle distinction
            console.log(`scenario#1: controller bootstrap starting`);
            if (!GCI) {
              throw new Error(`controller must be given GCI`);
            }
            // Wire up the http server.

            await setupCommandDevice(vats.http, devices.command, {
              controller: true,
            });

            // Create a presence for the on-chain provisioner.
            await addRemote(GCI);
            const chainProvisioner = await E(vats.comms).addIngress(GCI, SCENARIO_1_INDEX);
            // Allow web requests from the provisioning server to call our
            // provisioner object.
            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(chainProvisioner).pleaseProvision(nickname, pubkey);
              },
            });
            await E(vats.http).setProvisioner(provisioner);
          } else if (ROLES.client || ROLES.one_client) {
            // todo(hibbert) make this consistent with the bundle distinction
            console.log(`scenario#1: client bootstrap starting`);
            if (!GCI) {
              throw new Error(`client must be given GCI`);
            }
            await setupCommandDevice(vats.http, devices.command, {
              client: true,
            });
            const localTimerService = await addTimerService(
              devices.timer,
              vats.timer,
            );
            await addRemote(GCI);
            // todo: this should be the ingressIndex from the provisioner
            const INDEX = 1;
            const demoProvider = await E(vats.comms).addIngress(GCI, INDEX);
            const { purses, bundle } = await E(demoProvider).getDemoBundle();
            await E(vats.http).setPresences(
              { ...bundle, localTimerService },
              await createLocalBundle(
                vats,
                bundle,
                purses,
              ),
            );
            console.log(` vats initialized`);
          } else if (ROLES.two_chain) {
            // scenario #2: one-node chain running on localhost, solo node on
            // localhost, HTML frontend on localhost. Single-player mode.
            // ROLES.localchain, ROLES.localclient.

            console.log(`scenario#2: local chain bootstrap starting`);
            // bootAddress holds the pubkey of localclient
            const chainBundler = await makeChainBundler(vats, devices.timer);
            const demoProvider = harden({
              // build a chain-side bundle for a client.
              async getDemoBundle(nickname) {
                return chainBundler.createUserBundle(nickname);
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
            await setupCommandDevice(vats.http, devices.command, {client: true});
            const localTimerService = await addTimerService(devices.timer, vats.timer);
            await addRemote(GCI);
            const demoProvider = await E(vats.comms).addIngress(
              GCI,
              SCENARIO_2_INDEX,
            );
            // Get the demo bundle from the chain-side provider
            const { purses, bundle } = await E(demoProvider).getDemoBundle();
            const localBundle = await createLocalBundle(vats, bundle, purses);
            await E(vats.http).setPresences(
              { ...bundle, localTimerService },
              localBundle,
            );
            await setupWalletVat(devices.command, vats.http, vats.wallet);
          } else if (ROLES.three_client) {
            // scenario #3: no chain. solo node on localhost with HTML
            // frontend. Limited subset of demo runs inside the solo node.

            // Shared Setup (virtual chain side) ///////////////////////////
            console.log(
              `scenario#3: local demo-server+client bootstrap starting`);
            await setupCommandDevice(vats.http, devices.command, {
              client: true});
            const { purses, bundle } = await E(makeChainBundler(
              vats,
              devices.timer,
            )).createUserBundle('localuser');

            // Setup of the Local part /////////////////////////////////////
            const localBundle = await createLocalBundle(vats, bundle, purses);
            E(vats.http).setPresences(bundle, localBundle);

            setupWalletVat(devices.command, vats.http, vats.wallet);
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
