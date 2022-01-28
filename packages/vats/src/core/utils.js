// @ts-check
import { E } from '@endo/far';
import { AssetKind } from '@agoric/ertp';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeStore } from '@agoric/store';
import { makeNameHubKit } from '../nameHub.js';

const { entries, fromEntries, keys } = Object;
const { details: X, quote: q } = assert;

// TODO: phase out ./issuers.js
export const CENTRAL_ISSUER_NAME = 'RUN';

// We reserve these keys in name hubs.
export const shared = harden({
  // issuer, brand nameAdmins
  assets: {
    BLD: 'Agoric staking token',
    RUN: 'Agoric RUN currency',
    Attestation: 'Agoric lien attestation',
  },
  // installation, instance nameAdmins
  contract: {
    contractGovernor: 'contract governor',
    committee: 'committee electorate',
    noActionElectorate: 'no action electorate',
    binaryVoteCounter: 'binary vote counter',
    amm: 'Automated Market Maker',
    vaultFactory: 'vault factory',
    liquidate: 'liquidate',
    getRUN: 'getRUN',
  },
  instance: {
    economicCommittee: 'Economic Committee',
    amm: 'Automated Market Maker',
    vaultFactory: 'vault factory',
    liquidate: 'liquidate',
    getRUN: 'getRUN',
  },
});

/** @type { FeeIssuerConfig } */
export const feeIssuerConfig = {
  name: CENTRAL_ISSUER_NAME,
  assetKind: AssetKind.NAT,
  displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
};

/**
 * Wire up a remote between the comms vat and vattp.
 *
 * @param {string} addr
 * @param {{ vats: { vattp: VattpVat, comms: CommsVatRoot }}} powers
 */
export const addRemote = async (addr, { vats: { comms, vattp } }) => {
  const { transmitter, setReceiver } = await E(vattp).addRemote(addr);
  await E(comms).addRemote(addr, transmitter, setReceiver);
};
harden(addRemote);

export const callProperties = (obj, ...args) =>
  fromEntries(entries(obj).map(([k, fn]) => [k, fn(...args)]));

export const makeNameAdmins = () => {
  const {
    nameHub: agoricNames,
    nameAdmin: agoricNamesAdmin,
  } = makeNameHubKit();

  /** @type {Store<NameHub, NameAdmin>} */
  const nameAdmins = makeStore('nameHub');
  ['brand', 'installation', 'issuer', 'instance', 'uiConfig'].forEach(
    async nm => {
      const { nameHub, nameAdmin } = makeNameHubKit();
      agoricNamesAdmin.update(nm, nameHub);
      nameAdmins.init(nameHub, nameAdmin);
      if (nm === 'uiConfig') {
        // Reserve the Vault Factory's config until we've populated it.
        nameAdmin.reserve('vaultFactory');
      } else if (['issuer', 'brand'].includes(nm)) {
        keys(shared.assets).forEach(k => nameAdmin.reserve(k));
      } else if (nm === 'installation') {
        keys(shared.contract).forEach(k => nameAdmin.reserve(k));
      } else if (nm === 'instance') {
        keys(shared.instance).forEach(k => nameAdmin.reserve(k));
      }
    },
  );
  return { agoricNames, agoricNamesAdmin, nameAdmins };
};
harden(makeNameAdmins);

/**
 * @param {string[]} edges
 * @param {ERef<NameHub>} agoricNames
 * @param {ERef<Store<NameHub, NameAdmin>>} nameAdmins
 * @returns {Promise<NameAdmin[]>}
 */
export const collectNameAdmins = (edges, agoricNames, nameAdmins) => {
  return Promise.all(
    edges.map(async edge => {
      const hub = /** @type {NameHub} */ (await E(agoricNames).lookup(edge));
      return E(nameAdmins).get(hub);
    }),
  );
};
harden(collectNameAdmins);

/**
 * Make { produce, consume } where for each name, `consume[name]` is a promise
 * and `produce[name].resolve` resolves it.
 *
 * @returns {PromiseSpace}
 */
export const makePromiseSpace = () => {
  /** @type {Map<string, PromiseRecord<unknown>>} */
  const state = new Map();
  const remaining = new Set();

  const findOrCreateKit = name => {
    let kit = state.get(name);
    if (!kit) {
      console.info(`${name}: new Promise`);
      kit = makePromiseKit();
      state.set(name, kit);
      remaining.add(name);
    }
    return kit;
  };

  const consume = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const kit = findOrCreateKit(name);
        return kit.promise;
      },
    },
  );

  const produce = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const { resolve, promise } = findOrCreateKit(name);
        // promise.then(
        // () => console.info(name, ': resolve'),
        // e => console.info(name, ': reject', e),
        // );
        promise.finally(() => {
          remaining.delete(name);
          console.info(
            name,
            'settled; remaining:',
            [...remaining.keys()].sort(),
          );
        });
        // Note: repeated resolves() are noops.
        return harden({ resolve });
      },
    },
  );

  return harden({ produce, consume });
};
harden(makePromiseSpace);

/**
 * @param {unknown} template
 * @param {unknown} specimen
 */
export const extract = (template, specimen) => {
  if (template === true) {
    return specimen;
  } else if (typeof template === 'object' && template !== null) {
    if (typeof specimen !== 'object' || specimen === null) {
      assert.fail(X`object template requires object specimen, not ${specimen}`);
    }
    const target = harden(
      fromEntries(
        entries(template).map(([propName, subTemplate]) => [
          propName,
          extract(subTemplate, specimen[propName]),
        ]),
      ),
    );
    return new Proxy(target, {
      get: (t, propName) => {
        if (typeof propName !== 'symbol') {
          assert(
            propName in t,
            X`${propName} not permitted, only ${keys(template)}`,
          );
        }
        return t[propName];
      },
    });
  } else {
    assert.fail(X`unexpected template: ${q(template)}`);
  }
};
harden(extract);
