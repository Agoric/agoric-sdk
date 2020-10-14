// @ts-nocheck
import { allComparable } from '@agoric/same-structure';
import {
  makeLoopbackProtocolHandler,
  makeEchoConnectionHandler,
} from '@agoric/swingset-vat/src/vats/network';
import { E } from '@agoric/eventual-send';

// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { makePluginManager } from '@agoric/swingset-vat/src/vats/plugin-manager';
import { GCI } from './gci';
import { makeBridgeManager } from './bridge';
import { makeRendezvousNamespace } from './rendezvous';

const NUM_IBC_PORTS = 3;
const CENTRAL_ISSUER_NAME = 'Testnet.$USD';
const QUOTE_INTERVAL = 30;

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
    /**
     * @typedef {Object} IssuerRecord
     * @property {Array<any>} [issuerArgs]
     * @property {string} pursePetname
     * @property {number} mintValue
     * @property {Array<[number, number]>} [fakeTradesGivenCentral]
     */
    /** @type {Map<string, IssuerRecord>} */
    const issuerNameToRecord = new Map(
      harden([
        [
          CENTRAL_ISSUER_NAME,
          {
            issuerArgs: [undefined, { decimalPlaces: 3 }],
            mintValue: 20000,
            pursePetname: 'Local currency',
            fakeTradesGivenCentral: [[1, 1]],
          },
        ],
        [
          'Testnet.$LINK',
          {
            issuerArgs: [undefined, { decimalPlaces: 6 }],
            mintValue: 7 * 10 ** 6,
            pursePetname: 'Oracle fee',
            fakeTradesGivenCentral: [
              [1000, 3000000],
              [1000, 2500000],
              [1000, 2750000],
            ],
          },
        ],
        [
          'moola',
          {
            mintValue: 1900,
            pursePetname: 'Fun budget',
            fakeTradesGivenCentral: [
              [10, 1],
              [13, 1],
              [12, 1],
              [18, 1],
              [15, 1],
            ],
          },
        ],
        [
          'simolean',
          {
            mintValue: 1900,
            pursePetname: 'Nest egg',
            fakeTradesGivenCentral: [
              [2135, 50],
              [2172, 50],
              [2124, 50],
            ],
          },
        ],
      ]),
    );
    const issuerNames = [...issuerNameToRecord.keys()];
    const centralIssuerIndex = issuerNames.findIndex(
      issuerName => issuerName === CENTRAL_ISSUER_NAME,
    );
    if (centralIssuerIndex < 0) {
      throw Error(`Cannot find issuer ${CENTRAL_ISSUER_NAME}`);
    }
    const issuers = await Promise.all(
      issuerNames.map(issuerName =>
        E(vats.mints).makeMintAndIssuer(
          issuerName,
          ...(issuerNameToRecord.get(issuerName).issuerArgs || []),
        ),
      ),
    );

    const centralIssuer = issuers[centralIssuerIndex];

    /**
     * @param {ERef<Issuer>} issuerIn
     * @param {ERef<Issuer>} issuerOut
     * @param {Array<[number, number]>} tradeList
     */
    const makeFakePriceAuthority = async (issuerIn, issuerOut, tradeList) => {
      const [brandIn, brandOut, pa] = await Promise.all([
        E(issuerIn).getBrand(),
        E(issuerOut).getBrand(),
        E(vats.priceAuthority).makeFakePriceAuthority({
          issuerIn,
          issuerOut,
          tradeList,
          timer: chainTimerService,
          quoteInterval: QUOTE_INTERVAL,
        }),
      ]);
      return E(priceAuthorityAdmin).registerPriceAuthority(
        pa,
        brandIn,
        brandOut,
      );
    };
    await Promise.all(
      issuers.map(async (issuer, i) => {
        // Create priceAuthority pairs for centralIssuerIndex based on the
        // FakePriceAuthority.
        console.debug(`Creating ${issuerNames[i]}-${CENTRAL_ISSUER_NAME}`);
        const { fakeTradesGivenCentral } = issuerNameToRecord.get(
          issuerNames[i],
        );
        if (!fakeTradesGivenCentral) {
          return;
        }
        const fakeTradesGivenOther =
          centralIssuer !== issuer &&
          fakeTradesGivenCentral.map(([valueCentral, valueOther]) => [
            valueOther,
            valueCentral,
          ]);
        await Promise.all([
          makeFakePriceAuthority(centralIssuer, issuer, fakeTradesGivenCentral),
          fakeTradesGivenOther &&
            makeFakePriceAuthority(issuer, centralIssuer, fakeTradesGivenOther),
        ]);
      }),
    );

    const makeRendezvous = makeRendezvousNamespace();

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

        const payments = await E(vats.mints).mintInitialPayments(
          issuerNames,
          issuerNames.map(
            issuerName => issuerNameToRecord.get(issuerName).mintValue,
          ),
        );

        const paymentInfo = issuerNames.map((issuerName, i) => ({
          issuer: issuers[i],
          issuerPetname: issuerName,
          payment: payments[i],
          pursePetname: issuerNameToRecord.get(issuerName).pursePetname,
        }));

        const faucet = {
          // A method to reap the spoils of our on-chain provisioning.
          async tapFaucet() {
            return paymentInfo;
          },
        };

        const rendezvous = makeRendezvous(addr);
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
        makeLoopbackProtocolHandler(),
      ),
    );
    if (bridgeMgr) {
      // We have access to the bridge, and therefore IBC.
      const callbacks = harden({
        downcall(method, obj) {
          return bridgeMgr.toBridge('dibc', {
            ...obj,
            type: 'IBC_METHOD',
            method,
          });
        },
      });
      const ibcHandler = await E(vats.ibc).createInstance(callbacks);
      bridgeMgr.register('dibc', ibcHandler);
      ps.push(
        E(vats.network).registerProtocolHandler(
          ['/ibc-port', '/ibc-hop'],
          ibcHandler,
        ),
      );
    } else {
      const loHandler = makeLoopbackProtocolHandler(E);
      ps.push(
        E(vats.network).registerProtocolHandler(['/ibc-port'], loHandler),
      );
    }
    await Promise.all(ps);

    if (bridgeMgr) {
      // Add an echo listener on our ibc-port network.
      const port = await E(vats.network).bind('/ibc-port/echo');
      E(port).addListener(
        harden({
          async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
            return harden(makeEchoConnectionHandler());
          },
        }),
      );
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
      bridgeMgr.register('provision', handler);
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
      plugin = makePluginManager(devices.plugin, vatPowers);
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
        devices.bridge && makeBridgeManager(E, D, devices.bridge);
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
