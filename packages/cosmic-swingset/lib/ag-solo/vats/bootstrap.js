import { allComparable } from '@agoric/same-structure';
import { E } from '@agoric/eventual-send';

// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { GCI } from './gci';

const NUM_IBC_PORTS = 3;

console.debug(`loading bootstrap.js`);

// Used for coordinating on an index in comms for the provisioning service
const PROVISIONER_INDEX = 1;

function makeVattpFrom(vats) {
  const { vattp, comms } = vats;
  return harden({
    makeNetworkHost(allegedName, console = undefined) {
      return E(vattp).makeNetworkHost(allegedName, comms, console);
    },
  });
}

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  async function setupCommandDevice(httpVat, cmdDevice, roles) {
    await E(httpVat).setCommandDevice(cmdDevice, roles);
    D(cmdDevice).registerInboundHandler(httpVat);
  }

  // Make services that are provided on the real or virtual chain side
  async function makeChainBundler(vats, timerDevice, vatAdminSvc) {
    // Create singleton instances.
    const [
      sharingService,
      registry,
      board,
      chainTimerService,
      zoe,
      contractHost,
      { priceAuthority, adminFacet: priceAuthorityAdmin },
    ] = await Promise.all([
      E(vats.sharing).getSharingService(),
      E(vats.registrar).getSharedRegistrar(),
      E(vats.board).getBoard(),
      E(vats.timer).createTimerService(timerDevice),
      E(vats.zoe).buildZoe(vatAdminSvc),
      E(vats.host).makeHost(),
      E(vats.priceAuthority).makePriceAuthority(),
    ]);

    // Make the other demo mints
    const issuerNames = ['moola', 'simolean'];
    const issuers = await Promise.all(
      issuerNames.map(issuerName =>
        E(vats.mints).makeMintAndIssuer(issuerName),
      ),
    );

    // TODO: Create priceAuthority pairs for moola-simolean based on the
    // FakePriceAuthority.

    // Register the moola and simolean issuers
    const issuerInfo = await Promise.all(
      issuerNames.map(async (issuerName, i) =>
        harden({
          issuer: issuers[i],
          petname: issuerName,
        }),
      ),
    );

    return harden({
      async createUserBundle(_nickname, addr, powerFlags = []) {
        // Bind to some fresh ports (unspecified name) on the IBC implementation
        // and provide them for the user to have.
        const ibcport = [];
        for (let i = 0; i < NUM_IBC_PORTS; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          ibcport.push(await E(vats.network).bind('/ibc-port/'));
        }

        const additionalPowers = {};
        if (powerFlags && powerFlags.includes('agoric.vattp')) {
          // Give the authority to create a new host for vattp to share objects with.
          additionalPowers.vattp = makeVattpFrom(vats);
        }
        if (powerFlags && powerFlags.includes('agoric.priceAuthorityAdmin')) {
          additionalPowers.priceAuthorityAdmin = priceAuthorityAdmin;
        }

        const pursePetnames = {
          moola: 'Fun budget',
          simolean: 'Nest egg',
        };

        const payments = await E(vats.mints).mintInitialPayments(
          issuerNames,
          harden([1900, 1900]),
        );

        const paymentInfo = issuerInfo.map(
          ({ petname: issuerPetname, issuer }, i) => ({
            issuerPetname,
            issuer,
            payment: payments[i],
            pursePetname:
              pursePetnames[issuerPetname] || `${issuerPetname} purse`,
          }),
        );

        const faucet = {
          // A method to reap the spoils of our on-chain provisioning.
          async tapFaucet() {
            return paymentInfo;
          },
        };

        const rendezvous = await E(vats.rendezvous).rendezvousServiceFor(addr);
        const bundle = harden({
          ...additionalPowers,
          chainTimerService,
          sharingService,
          contractHost,
          faucet,
          ibcport,
          priceAuthority,
          registrar: registry,
          registry,
          rendezvous,
          board,
          zoe,
        });

        return bundle;
      },
    });
  }

  async function registerNetworkProtocols(vats, bridgeMgr) {
    const ps = [];
    // Every vat has a loopback device.
    ps.push(
      E(vats.network).registerProtocolHandler(
        ['/local'],
        E(vats.network).makeLoopbackProtocolHandler(),
      ),
    );
    if (bridgeMgr) {
      // We have access to the bridge, and therefore IBC.
      const callbacks = harden({
        downcall(method, obj) {
          return E(bridgeMgr).toBridge('dibc', {
            ...obj,
            type: 'IBC_METHOD',
            method,
          });
        },
      });
      const ibcHandler = await E(vats.ibc).createInstance(callbacks);
      E(bridgeMgr).register('dibc', ibcHandler);
      ps.push(
        E(vats.network).registerProtocolHandler(
          ['/ibc-port', '/ibc-hop'],
          ibcHandler,
        ),
      );
    } else {
      const loHandler = E(vats.network).makeLoopbackProtocolHandler();
      ps.push(
        E(vats.network).registerProtocolHandler(['/ibc-port'], loHandler),
      );
    }
    await Promise.all(ps);

    if (bridgeMgr) {
      // Add an echo listener on our ibc-port network.
      const port = await E(vats.network).bind('/ibc-port/echo');
      E(port).addListener(E(vats.network).makeEchoListener());
    }

    if (bridgeMgr) {
      // Register a provisioning handler over the bridge.
      const handler = harden({
        async fromBridge(_srcID, obj) {
          switch (obj.type) {
            case 'PLEASE_PROVISION': {
              const { nickname, address, powerFlags } = obj;
              return E(vats.provisioning)
                .pleaseProvision(nickname, address, powerFlags)
                .catch(e =>
                  console.error(
                    `Error provisioning ${nickname} ${address}:`,
                    e,
                  ),
                );
            }
            default:
              throw Error(`Unrecognized request ${obj.type}`);
          }
        },
      });
      E(bridgeMgr).register('provision', handler);
    }
  }

  // objects that live in the client's solo vat. Some services should only
  // be in the DApp environment (or only in end-user), but we're not yet
  // making a distinction, so the user also gets them.
  async function createLocalBundle(vats, devices) {
    // This will eventually be a vat spawning service. Only needed by dev
    // environments.
    const spawner = E(vats.host).makeHost();

    // Needed for DApps, maybe for user clients.
    const uploads = E(vats.uploads).getUploads();

    // Only create the plugin manager if the device exists.
    let plugin;
    if (devices.plugin) {
      plugin = E(vats.plugin).makePluginManager(devices.plugin);
    }

    // This will allow dApp developers to register in their api/deploy.js
    const httpRegCallback = {
      doneLoading(subsystems) {
        return E(vats.http).doneLoading(subsystems);
      },
      send(obj, connectionHandles) {
        return E(vats.http).send(obj, connectionHandles);
      },
      registerURLHandler(handler, path) {
        return E(vats.http).registerURLHandler(handler, path);
      },
      registerAPIHandler(handler) {
        return E(vats.http).registerURLHandler(handler, '/api');
      },
      async registerWallet(wallet, privateWallet, privateWalletBridge) {
        await Promise.all([
          E(vats.http).registerURLHandler(privateWallet, '/private/wallet'),
          E(vats.http).registerURLHandler(
            privateWalletBridge,
            '/private/wallet-bridge',
          ),
          E(vats.http).setWallet(wallet),
        ]);
      },
    };

    return allComparable(
      harden({
        ...(plugin ? { plugin } : {}),
        // TODO: Our preferred name is "scratch", but there are many Dapps
        // that use "uploads".
        scratch: uploads,
        uploads,
        spawner,
        network: vats.network,
        http: httpRegCallback,
        vattp: makeVattpFrom(vats),
      }),
    );
  }

  return harden({
    async bootstrap(vats, devices) {
      const bridgeManager =
        devices.bridge && E(vats.bridge).makeBridgeManager(devices.bridge);
      const {
        ROLE,
        giveMeAllTheAgoricPowers,
        hardcodedClientAddresses,
      } = vatParameters.argv;

      async function addRemote(addr) {
        const { transmitter, setReceiver } = await E(vats.vattp).addRemote(
          addr,
        );
        await E(vats.comms).addRemote(addr, transmitter, setReceiver);
      }

      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);

      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );

      console.debug(`${ROLE} bootstrap starting`);
      // scenario #1: Cloud has: multi-node chain, controller solo node,
      // provisioning server (python). New clients run provisioning
      // client (python) on localhost, which creates client solo node on
      // localhost, with HTML frontend. Multi-player mode.
      switch (ROLE) {
        // REAL VALIDATORS run this.
        case 'chain': {
          // provisioning vat can ask the demo server for bundles, and can
          // register client pubkeys with comms
          await E(vats.provisioning).register(
            await makeChainBundler(vats, devices.timer, vatAdminSvc),
            vats.comms,
            vats.vattp,
          );

          // Must occur after makeChainBundler.
          await registerNetworkProtocols(vats, bridgeManager);
          break;
        }

        // ag-setup-solo runs this.
        case 'client': {
          if (!GCI) {
            throw new Error(`client must be given GCI`);
          }

          const localTimerService = await E(vats.timer).createTimerService(
            devices.timer,
          );
          await registerNetworkProtocols(vats, bridgeManager);

          await setupCommandDevice(vats.http, devices.command, {
            client: true,
          });
          await addRemote(GCI);
          // addEgress(..., index, ...) is called in vat-provisioning.
          const demoProvider = await E(vats.comms).addIngress(
            GCI,
            PROVISIONER_INDEX,
          );
          const localBundle = await createLocalBundle(vats, devices);
          await E(vats.http).setPresences(localBundle);
          const bundle = await E(demoProvider).getDemoBundle();
          await E(vats.http).setPresences(localBundle, bundle, {
            localTimerService,
          });
          break;
        }

        // fake-chain runs this
        case 'sim-chain': {
          const chainBundler = await makeChainBundler(
            vats,
            devices.timer,
            vatAdminSvc,
          );

          // Allow manual provisioning requests via `agoric cosmos`.
          await E(vats.provisioning).register(
            chainBundler,
            vats.comms,
            vats.vattp,
          );

          await registerNetworkProtocols(vats, bridgeManager);

          // Allow some hardcoded client address connections into the chain.
          // This is necessary for fake-chain, which does not have Cosmos SDK
          // transactions to provision its client.
          await Promise.all(
            hardcodedClientAddresses.map(async addr => {
              const { transmitter, setReceiver } = await E(
                vats.vattp,
              ).addRemote(addr);
              await E(vats.comms).addRemote(addr, transmitter, setReceiver);

              const demoProvider = harden({
                // build a chain-side bundle for a client.
                async getDemoBundle(nickname) {
                  if (giveMeAllTheAgoricPowers) {
                    // NOTE: This is a special exception to the security model,
                    // to give capabilities to all clients (since we are running
                    // locally with the `--give-me-all-the-agoric-powers` flag).
                    return chainBundler.createUserBundle(nickname, addr, [
                      'agoric.priceAuthorityAdmin',
                      'agoric.vattp',
                    ]);
                  }
                  return chainBundler.createUserBundle(nickname, addr, []);
                },
              });

              await E(vats.comms).addEgress(
                addr,
                PROVISIONER_INDEX,
                demoProvider,
              );
            }),
          );

          break;
        }
        default:
          throw new Error(`ROLE was not recognized: ${ROLE}`);
      }

      console.debug(`all vats initialized for ${ROLE}`);
    },
  });
}
