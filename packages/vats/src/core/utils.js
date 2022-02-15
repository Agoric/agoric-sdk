// @ts-check
import { E } from '@endo/far';
import { AssetKind } from '@agoric/ertp';
import { makePromiseKit } from '@endo/promise-kit';
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
  contract: {
    contractGovernor: 'contract governor',
    committee: 'committee electorate',
    noActionElectorate: 'no action electorate',
    binaryVoteCounter: 'binary vote counter',
    amm: 'Automated Market Maker',
    VaultFactory: 'vault factory',
    liquidate: 'liquidate',
    getRUN: 'getRUN',
    pegasus: 'pegasus',
  },
  instance: {
    economicCommittee: 'Economic Committee',
    amm: 'Automated Market Maker',
    ammGovernor: 'AMM Governor',
    VaultFactory: 'vault factory',
    Treasury: 'Treasury', // for compatibility
    VaultFactoryGovernor: 'vault factory governor',
    liquidate: 'liquidate',
    getRUN: 'getRUN',
    getRUNGovernor: 'getRUN governor',
    Pegasus: 'remote peg',
  },
  uiConfig: {
    VaultFactory: 'vault factory',
    Treasury: 'vault factory', // compatibility
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

/**
 * @param {Array<(...args) => Record<string, unknown>>} builders
 * @param  {...unknown} args
 * @returns {Record<string, unknown>}
 */
export const callProperties = (builders, ...args) =>
  fromEntries(builders.map(fn => entries(fn(...args))).flat());

export const makeNameAdmins = () => {
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  const sections = {
    brand: 'assets',
    issuer: 'assets',
    installation: 'contract',
    instance: 'instance',
    uiConfig: 'uiConfig',
    pegasus: undefined,
  };
  /** @type {Store<NameHub, NameAdmin>} */
  const nameAdmins = makeStore('nameHub');
  keys(sections).forEach(nm => {
    const { nameHub, nameAdmin } = makeNameHubKit();
    agoricNamesAdmin.update(nm, nameHub);
    nameAdmins.init(nameHub, nameAdmin);
    const section = sections[nm];
    if (section) {
      keys(shared[section]).forEach(k => nameAdmin.reserve(k));
    }
  });
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
 * Note: repeated resolves() are noops.
 *
 * @param {typeof console.log} [log]
 * @returns {PromiseSpace}
 */
export const makePromiseSpace = (log = (..._args) => {}) => {
  /** @type {Map<string, PromiseRecord<unknown>>} */
  const state = new Map();
  const remaining = new Set();

  const findOrCreateKit = name => {
    let kit = state.get(name);
    if (!kit) {
      log(`${name}: new Promise`);
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
        promise.finally(() => {
          remaining.delete(name);
          log(name, 'settled; remaining:', [...remaining.keys()].sort());
        });
        return harden({ resolve });
      },
    },
  );

  return harden({ produce, consume });
};
harden(makePromiseSpace);

/**
 * @param {unknown} template true or vat name string or recursive object
 * @param {unknown} specimen
 */
export const extract = (template, specimen) => {
  if (template === true || typeof template === 'string') {
    return specimen;
  } else if (typeof template === 'object' && template !== null) {
    if (typeof specimen !== 'object' || specimen === null) {
      assert.fail(
        X`object template ${q(template)} requires object specimen, not ${q(
          specimen,
        )}`,
      );
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
