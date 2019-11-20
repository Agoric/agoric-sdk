import harden from '@agoric/harden';
import { allComparable } from '@agoric/ertp/util/sameStructure';
// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { GCI } from './gci';

console.log(`loading bootstrap.js`);

function parseArgs(argv) {
  let ROLE;
  let gotRoles = false;
  let bootAddress;
  const additionalAddresses = [];
  argv.forEach(arg => {
    const match = arg.match(/^--role=(.*)$/);
    if (match) {
      if (gotRoles) {
        throw new Error(`must assign only one role, saw ${ROLE}, ${match[1]}`);
      }
      [, ROLE] = match;
      gotRoles = true;
    } else if (!arg.match(/^-/)) {
      if (!bootAddress) {
        bootAddress = arg;
      } else {
        additionalAddresses.push(arg);
      }
    }
  });
  if (!gotRoles) {
    ROLE = 'three_client';
  }

  return [ROLE, bootAddress, additionalAddresses];
}

// Used in scenario 1 for coordinating on an index for registering public keys
// while requesting provisioning.
const KEY_REG_INDEX = 1;
// Used for coordinating on an index in comms for the provisioning service
const PROVISIONER_INDEX = 1;

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => {
      async function setupCommandDevice(httpVat, cmdDevice, roles) {
        await E(httpVat).setCommandDevice(cmdDevice, roles);
        D(cmdDevice).registerInboundHandler(httpVat);
      }

      async function setupWalletVat(commandDevice, httpVat, walletVat) {
        await E(httpVat).registerCommandHandler(walletVat);
        await E(walletVat).setCommandDevice(commandDevice);
        await E(walletVat).setPresences();
      }

      // Make services that are provided on the real or virtual chain side
      async function makeChainBundler(vats, timerDevice) {
        // Remember the assayIds to pass to the wallet
        const assayIdMap = new Map();

        async function registerAssay(registrar, assayNameP, assayP) {
          const [assayName, assay] = await Promise.all([assayNameP, assayP]);
          const assayId = await E(registrar).register(assayName, assay);
          assayIdMap.set(assayName, assayId);
        }

        async function registerAssays(mintVat, registrar, assayNames) {
          for (const assayName of assayNames) {
            const mint = E(mintVat).getMint(assayName);
            const assay = E(mint).getAssay();
            registerAssay(registrar, assayName, assay);
          }
        }

        // Create singleton instances.
        const sharingService = await E(vats.sharing).getSharingService();
        const registrar = await E(vats.registrar).getSharedRegistrar();
        const chainTimerService = await E(vats.timer).createTimerService(
          timerDevice,
        );
        const zoe = await E(vats.zoe).getZoe();
        const contractHost = await E(vats.host).makeHost();

        // dustAssay is built and registered in the pixel vat. Wallet needs it.
        const dustAssay = E(vats.pixel).startup(contractHost);
        await registerAssay(registrar, 'dust', dustAssay);

        // Two purses were created in vats.mint
        const assayNames = ['moola', 'simolean'];
        await registerAssays(vats.mints, registrar, assayNames);

        return harden({
          async createUserBundle(nickname) {
            const pBundle = await E(vats.pixel).createPixelBundle(nickname);
            const { purse: dust, bundle: pixelBundle } = pBundle;
            const bundle = harden({
              ...pixelBundle,
              chainTimerService,
              sharingService,
              contractHost,
              registrar,
              zoe,
            });

            // assayNames mapped to [assayId, purse] for building wallet
            const purses = {};
            for (const assayName of assayNames) {
              const purseName = `${assayName} purse`;
              const purse = E(vats.mints).getNewPurse(assayName, purseName);
              purses[assayName] = [assayIdMap.get(assayName), purse];
            }

            purses.dust = [assayIdMap.get('dust'), dust];

            // return purses separately so they can be added to local wallet
            return harden({ purses, bundle });
          },
        });
      }

      function addPursesToWallet(purses, walletVat) {
        const wallet = E(walletVat).getWallet();
        for (const assayName of Object.keys(purses)) {
          const [assayId, purse] = purses[assayName];
          E(wallet).addPurse(purse, assayId);
        }
        return wallet;
      }

      // objects that live in the client's solo vat. Some services should only
      // be in the DApp environment (or only in end-user), but we're not yet
      // making a distinction, so the user also gets them.
      async function createLocalBundle(vats, userBundle, purses) {
        const { contractHost, zoe, registrar } = userBundle;
        // This will eventually be a vat spawning service. Only needed by dev
        // environments.
        const spawner = E(vats.host).makeHost();

        // Needed for DApps, maybe for user clients.
        const uploads = E(vats.uploads).getUploads();

        // Wallet for both end-user client and dapp dev client
        E(vats.wallet).startup(contractHost, zoe, registrar);
        const wallet = addPursesToWallet(purses, vats.wallet);

        // exchange is used for autoswap. Only needed for the dapp's Swingset
        await E(vats.exchange).startup(contractHost, zoe, registrar);
        await E(vats.http).registerCommandHandler(vats.exchange);
        const exchange = E(vats.exchange).getExchange();

        // This will allow Dapp developers to register in their dapp.js
        const httpRegCallback = {
          registerCommandHandler(handler) {
            return E(vats.http).registerCommandHandler(handler);
          },
        };

        return allComparable(
          harden({
            uploads,
            spawner,
            wallet,
            exchange,
            http: httpRegCallback,
          }),
        );
      }

      return harden({
        async bootstrap(argv, vats, devices) {
          const [ROLE, bootAddress, additionalAddresses] = parseArgs(argv);

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

          console.log(`${ROLE} bootstrap starting`);
          // scenario #1: Cloud has: multi-node chain, controller solo node,
          // provisioning server (python). New clients run provisioning
          // client (python) on localhost, which creates client solo node on
          // localhost, with HTML frontend. Multi-player mode.
          switch (ROLE) {
            case 'chain':
            case 'one_chain': {
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
                  return E(vats.provisioning).pleaseProvision(
                    nickname,
                    pubkey,
                    PROVISIONER_INDEX,
                  );
                },
              });
              // bootAddress holds the pubkey of controller
              await E(vats.comms).addEgress(
                bootAddress,
                KEY_REG_INDEX,
                provisioner,
              );
              break;
            }
            case 'controller':
            case 'one_controller': {
              if (!GCI) {
                throw new Error(`controller must be given GCI`);
              }
              // Wire up the http server.

              await setupCommandDevice(vats.http, devices.command, {
                controller: true,
              });
              // Create a presence for the on-chain provisioner.
              await addRemote(GCI);
              const chainProvisioner = await E(vats.comms).addIngress(
                GCI,
                KEY_REG_INDEX,
              );
              // Allow web requests from the provisioning server to call our
              // provisioner object.
              const provisioner = harden({
                pleaseProvision(nickname, pubkey) {
                  return E(chainProvisioner).pleaseProvision(nickname, pubkey);
                },
              });
              await E(vats.http).setProvisioner(provisioner);
              break;
            }
            case 'client':
            case 'one_client': {
              if (!GCI) {
                throw new Error(`client must be given GCI`);
              }
              await setupCommandDevice(vats.http, devices.command, {
                client: true,
              });
              const localTimerService = await E(vats.timer).createTimerService(
                devices.timer,
              );
              await addRemote(GCI);
              // addEgress(..., index, ...) is called in vat-provisioning.
              const demoProvider = await E(vats.comms).addIngress(
                GCI,
                PROVISIONER_INDEX,
              );
              const { purses, bundle } = await E(demoProvider).getDemoBundle();
              await E(vats.http).setPresences(
                { ...bundle, localTimerService },
                await createLocalBundle(vats, bundle, purses),
              );
              await setupWalletVat(devices.command, vats.http, vats.wallet);
              break;
            }
            case 'two_chain': {
              // scenario #2: one-node chain running on localhost, solo node on
              // localhost, HTML frontend on localhost. Single-player mode.

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
                  E(vats.comms).addEgress(
                    addr,
                    PROVISIONER_INDEX,
                    demoProvider,
                  ),
                ),
              );
              break;
            }
            case 'two_client': {
              if (!GCI) {
                throw new Error(`client must be given GCI`);
              }
              await setupCommandDevice(vats.http, devices.command, {
                client: true,
              });
              const localTimerService = await E(vats.timer).createTimerService(
                devices.timer,
              );
              await addRemote(GCI);
              // addEgress(..., PROVISIONER_INDEX) is called in case two_chain
              const demoProvider = E(vats.comms).addIngress(
                GCI,
                PROVISIONER_INDEX,
              );
              // Get the demo bundle from the chain-side provider
              const b = await E(demoProvider).getDemoBundle('client');
              const { purses, bundle } = b;
              await E(vats.http).setPresences(
                { ...bundle, localTimerService },
                await createLocalBundle(vats, bundle, purses),
              );
              await setupWalletVat(devices.command, vats.http, vats.wallet);
              break;
            }
            case 'three_client': {
              // scenario #3: no chain. solo node on localhost with HTML
              // frontend. Limited subset of demo runs inside the solo node.

              // Shared Setup (virtual chain side) ///////////////////////////
              await setupCommandDevice(vats.http, devices.command, {
                client: true,
              });
              const { purses, bundle } = await E(
                makeChainBundler(vats, devices.timer),
              ).createUserBundle('localuser');

              // Setup of the Local part /////////////////////////////////////
              await E(vats.http).setPresences(
                { ...bundle, localTimerService: bundle.chainTimerService },
                await createLocalBundle(vats, bundle, purses),
              );

              setupWalletVat(devices.command, vats.http, vats.wallet);
              break;
            }
            default:
              throw new Error(`ROLE was not recognized: ${ROLE}`);
          }

          console.log(`all vats initialized for ${ROLE}`);
        },
      });
    },
    helpers.vatID,
  );
}
