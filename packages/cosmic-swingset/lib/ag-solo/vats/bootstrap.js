// @ts-nocheck
import { allComparable } from '@agoric/same-structure';
import {
  makeLoopbackProtocolHandler,
  makeEchoConnectionHandler,
} from '@agoric/swingset-vat/src/vats/network';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeStore } from '@agoric/store';
import { installOnChain as installEconomyOnChain } from '@agoric/treasury/bundles/install-on-chain';

// this will return { undefined } until `ag-solo set-gci-ingress`
// has been run to update gci.js
import { makePluginManager } from '@agoric/swingset-vat/src/vats/plugin-manager';
import { assert, details as X } from '@agoric/assert';
import { makeRatio } from '@agoric/zoe/src/contractSupport';
import { amountMath } from '@agoric/ertp';
import { GCI } from './gci';
import { makeBridgeManager } from './bridge';
import { makeNameHubKit } from './nameHub';
import {
  CENTRAL_ISSUER_NAME,
  fakeIssuerEntries,
  fromCosmosIssuerEntries,
  fromPegasusIssuerEntries,
} from './issuers';

const NUM_IBC_PORTS = 3;
const QUOTE_INTERVAL = 30;

const BASIS_POINTS_DENOM = 10000n;

console.debug(`loading bootstrap.js`);

// Used for coordinating on an index in comms for the provisioning service
const PROVISIONER_INDEX = 1;

function makeVattpFrom(vats) {
  const { vattp, comms } = vats;
  return Far('vattp', {
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
  async function makeChainBundler(
    vats,
    timerDevice,
    vatAdminSvc,
    noFakeCurrencies,
  ) {
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
      /** @type {ZoeService} */ (E(vats.zoe).buildZoe(vatAdminSvc)),
      E(vats.host).makeHost(),
      E(vats.priceAuthority).makePriceAuthority(),
    ]);

    const {
      nameHub: agoricNames,
      nameAdmin: agoricNamesAdmin,
    } = makeNameHubKit();
    const {
      nameHub: namesByAddress,
      nameAdmin: namesByAddressAdmin,
    } = makeNameHubKit();

    async function installEconomy() {
      // Create a mapping from all the nameHubs we create to their corresponding
      // nameAdmin.
      /** @type {Store<NameHub, NameAdmin>} */
      const nameAdmins = makeStore();
      await Promise.all(
        ['brand', 'installation', 'issuer', 'instance', 'uiConfig'].map(
          async nm => {
            const { nameHub, nameAdmin } = makeNameHubKit();
            await E(agoricNamesAdmin).update(nm, nameHub);
            nameAdmins.init(nameHub, nameAdmin);
            if (nm === 'uiConfig') {
              // Reserve the Treasury's config until we've populated it.
              nameAdmin.reserve('Treasury');
            }
          },
        ),
      );

      // Install the economy, giving it access to the name admins we made.
      return installEconomyOnChain({
        agoricNames,
        board,
        centralName: CENTRAL_ISSUER_NAME,
        chainTimerService,
        nameAdmins,
        priceAuthority,
        zoe,
      });
    }

    // Now we can bootstrap the economy!
    const treasuryCreator = await installEconomy();
    const [centralIssuer, centralBrand, ammInstance] = await Promise.all([
      ...['issuer', 'brand'].map(hub =>
        E(agoricNames).lookup(hub, CENTRAL_ISSUER_NAME),
      ),
      E(agoricNames).lookup('instance', 'autoswap'),
    ]);

    // [string, import('./issuers').IssuerInitializationRecord]
    const CENTRAL_ISSUER_ENTRY = [
      CENTRAL_ISSUER_NAME,
      {
        issuer: centralIssuer,
        defaultPurses: [['Agoric RUN currency', 0]],
        tradesGivenCentral: [[1, 1]],
      },
    ];

    /** @type {Store<string, import('./issuers').IssuerInitializationRecord>} */
    const issuerNameToRecord = makeStore();
    /** @type {Array<[string, import('./issuers').IssuerInitializationRecord]>} */
    const issuerEntries = [
      CENTRAL_ISSUER_ENTRY,
      ...fromCosmosIssuerEntries,
      ...fromPegasusIssuerEntries,
    ];
    if (!noFakeCurrencies) {
      issuerEntries.push(...fakeIssuerEntries);
    }
    issuerEntries.forEach(entry => issuerNameToRecord.init(...entry));

    const issuerNames = [...issuerNameToRecord.keys()];
    await Promise.all(
      issuerNames.map(async issuerName => {
        const record = issuerNameToRecord.get(issuerName);
        if (record.issuer !== undefined) {
          return record.issuer;
        }
        /** @type {Issuer} */
        const issuer = await E(vats.mints).makeMintAndIssuer(
          issuerName,
          ...(record.issuerArgs || []),
        );
        const brand = await E(issuer).getBrand();
        issuerNameToRecord.set(
          issuerName,
          harden({ ...record, brand, issuer }),
        );
        return issuer;
      }),
    );

    async function addAllCollateral() {
      const govBrand = await E(agoricNames).lookup(
        'brand',
        'TreasuryGovernance',
      );
      return Promise.all(
        issuerNames.map(async issuerName => {
          const record = issuerNameToRecord.get(issuerName);
          const config = record.collateralConfig;
          if (!config) {
            return undefined;
          }
          assert(record.tradesGivenCentral);
          const initialPrice = record.tradesGivenCentral[0];
          assert(initialPrice);
          const rates = {
            initialPrice: makeRatio(
              initialPrice[0],
              centralBrand,
              initialPrice[1],
              record.brand,
            ),
            initialMargin: makeRatio(config.initialMarginPercent, centralBrand),
            liquidationMargin: makeRatio(
              config.liquidationMarginPercent,
              centralBrand,
            ),
            interestRate: makeRatio(
              config.interestRateBasis,
              centralBrand,
              BASIS_POINTS_DENOM,
            ),
            loanFee: makeRatio(
              config.loanFeeBasis,
              centralBrand,
              BASIS_POINTS_DENOM,
            ),
          };

          const addTypeInvitation = E(treasuryCreator).makeAddTypeInvitation(
            record.issuer,
            config.keyword,
            rates,
          );

          const payments = E(vats.mints).mintInitialPayments(
            [issuerName],
            [config.collateralValue],
          );
          const payment = E.get(payments)[0];

          const amount = await E(record.issuer).getAmountOf(payment);
          const proposal = harden({
            give: {
              Collateral: amount,
            },
            want: {
              // We just throw away our governance tokens.
              Governance: amountMath.make(0n, govBrand),
            },
          });
          const paymentKeywords = harden({
            Collateral: payment,
          });
          const seat = E(zoe).offer(
            addTypeInvitation,
            proposal,
            paymentKeywords,
          );
          const vaultManager = E(seat).getOfferResult();
          return vaultManager;
        }),
      );
    }
    // await addAllCollateral();

    /**
     * @param {ERef<Issuer>} issuerIn
     * @param {ERef<Issuer>} issuerOut
     * @param {ERef<Brand>} brandIn
     * @param {ERef<Brand>} brandOut
     * @param {Array<[number, number]>} tradeList
     */
    const makeFakePriceAuthority = (
      issuerIn,
      issuerOut,
      brandIn,
      brandOut,
      tradeList,
    ) =>
      E(vats.priceAuthority).makeFakePriceAuthority({
        issuerIn,
        issuerOut,
        actualBrandIn: brandIn,
        actualBrandOut: brandOut,
        tradeList,
        timer: chainTimerService,
        quoteInterval: QUOTE_INTERVAL,
      });

    const ammPublicFacet = E(zoe).getPublicFacet(ammInstance);
    await addAllCollateral();

    await Promise.all(
      issuerNames.map(async issuerName => {
        // Create priceAuthority pairs for centralIssuer based on the
        // AMM or FakePriceAuthority.
        console.debug(`Creating ${issuerName}-${CENTRAL_ISSUER_NAME}`);
        const record = issuerNameToRecord.get(issuerName);
        assert(record);
        const { tradesGivenCentral, issuer } = record;

        const brand = await E(issuer).getBrand();
        let { toCentral, fromCentral } = await E(ammPublicFacet)
          .getPriceAuthorities(brand)
          .catch(_e => {
            // console.warn('could not get AMM priceAuthorities', _e);
            return {};
          });

        if (!fromCentral && tradesGivenCentral) {
          // We have no amm from-central price authority, make one from trades.
          if (issuerName !== CENTRAL_ISSUER_NAME) {
            console.log(
              `Making fake price authority for ${CENTRAL_ISSUER_NAME}-${issuerName}`,
            );
          }
          fromCentral = makeFakePriceAuthority(
            centralIssuer,
            issuer,
            centralBrand,
            brand,
            tradesGivenCentral,
          );
        }

        if (!toCentral && centralIssuer !== issuer && tradesGivenCentral) {
          // We have no amm to-central price authority, make one from trades.
          console.log(
            `Making fake price authority for ${issuerName}-${CENTRAL_ISSUER_NAME}`,
          );
          const tradesGivenOther = tradesGivenCentral.map(
            ([valueCentral, valueOther]) => [valueOther, valueCentral],
          );
          toCentral = makeFakePriceAuthority(
            issuer,
            centralIssuer,
            brand,
            centralBrand,
            tradesGivenOther,
          );
        }

        // Register the price pairs.
        await Promise.all(
          [
            [fromCentral, centralBrand, brand],
            [toCentral, brand, centralBrand],
          ].map(async ([pa, fromBrand, toBrand]) => {
            const paPresence = await pa;
            if (!paPresence) {
              return;
            }
            await E(priceAuthorityAdmin).registerPriceAuthority(
              paPresence,
              fromBrand,
              toBrand,
            );
          }),
        );
      }),
    );

    return Far('chainBundler', {
      async createUserBundle(_nickname, address, powerFlags = []) {
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
        if (powerFlags && powerFlags.includes('agoric.agoricNamesAdmin')) {
          additionalPowers.agoricNamesAdmin = agoricNamesAdmin;
        }
        if (powerFlags && powerFlags.includes('agoric.treasuryCreator')) {
          additionalPowers.treasuryCreator = treasuryCreator;
        }

        const mintIssuerNames = [];
        const mintPurseNames = [];
        const mintValues = [];
        issuerNames.forEach(issuerName => {
          const record = issuerNameToRecord.get(issuerName);
          if (!record.defaultPurses) {
            return;
          }
          record.defaultPurses.forEach(([purseName, value]) => {
            mintIssuerNames.push(issuerName);
            mintPurseNames.push(purseName);
            mintValues.push(value);
          });
        });
        const payments = await E(vats.mints).mintInitialPayments(
          mintIssuerNames,
          mintValues,
        );

        const paymentInfo = mintIssuerNames.map((issuerName, i) => ({
          issuer: issuerNameToRecord.get(issuerName).issuer,
          issuerPetname: issuerName,
          payment: payments[i],
          pursePetname: mintPurseNames[i],
        }));

        const faucet = Far('faucet', {
          // A method to reap the spoils of our on-chain provisioning.
          async tapFaucet() {
            return paymentInfo;
          },
        });

        // Create a name hub for this address.
        const {
          nameHub: myAddressNameHub,
          nameAdmin: myAddressNameAdmin,
        } = makeNameHubKit();
        // Register it with the namesByAddress hub.
        namesByAddressAdmin.update(address, myAddressNameHub);

        const bundle = harden({
          ...additionalPowers,
          agoricNames,
          chainTimerService,
          sharingService,
          contractHost,
          faucet,
          ibcport,
          myAddressNameAdmin: {
            ...myAddressNameAdmin,
            getMyAddress() {
              return address;
            },
          },
          namesByAddress,
          priceAuthority,
          registrar: registry,
          registry,
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
      const callbacks = Far('callbacks', {
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
        Far('listener', {
          async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
            return harden(makeEchoConnectionHandler());
          },
        }),
      );
    }

    if (bridgeMgr) {
      // Register a provisioning handler over the bridge.
      const handler = Far('provisioningHandler', {
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
              assert.fail(X`Unrecognized request ${obj.type}`);
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
    const httpRegCallback = Far('httpRegCallback', {
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
    });

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

  return Far('root', {
    async bootstrap(vats, devices) {
      const bridgeManager =
        devices.bridge && makeBridgeManager(E, D, devices.bridge);
      const {
        ROLE,
        giveMeAllTheAgoricPowers,
        noFakeCurrencies,
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
            await makeChainBundler(
              vats,
              devices.timer,
              vatAdminSvc,
              noFakeCurrencies,
            ),
            vats.comms,
            vats.vattp,
          );

          // Must occur after makeChainBundler.
          await registerNetworkProtocols(vats, bridgeManager);
          break;
        }

        // ag-setup-solo runs this.
        case 'client': {
          assert(GCI, X`client must be given GCI`);

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
            noFakeCurrencies,
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
          const demoProvider = Far('demoProvider', {
            // build a chain-side bundle for a client.
            async getDemoBundle(nickname) {
              if (giveMeAllTheAgoricPowers) {
                // NOTE: This is a special exception to the security model,
                // to give capabilities to all clients (since we are running
                // locally with the `--give-me-all-the-agoric-powers` flag).
                return chainBundler.createUserBundle(nickname, 'demo', [
                  'agoric.agoricNamesAdmin',
                  'agoric.priceAuthorityAdmin',
                  'agoric.treasuryCreator',
                  'agoric.vattp',
                ]);
              }
              return chainBundler.createUserBundle(nickname, 'demo');
            },
          });
          await Promise.all(
            hardcodedClientAddresses.map(async addr => {
              const { transmitter, setReceiver } = await E(
                vats.vattp,
              ).addRemote(addr);
              await E(vats.comms).addRemote(addr, transmitter, setReceiver);
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
          assert.fail(X`ROLE was not recognized: ${ROLE}`);
      }

      console.debug(`all vats initialized for ${ROLE}`);
    },
  });
}
