// @ts-check
import { E } from '@endo/far';
import { AssetKind } from '@agoric/ertp';

const { entries, fromEntries } = Object;

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
