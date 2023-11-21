// @ts-check

import { E } from '@endo/far';

/**
 * @typedef {<T extends Record<string, ERef<any>>>(
 *   obj: T,
 * ) => Promise<{ [K in keyof T]: Awaited<T[K]> }>} AllValues
 */

export const upgradeZoeScript = () => {
  /**
   * @param {VatAdminSvc} vatAdminSvc
   * @param {any} adminNode
   * @param {string} bundleCapName
   * @param {unknown} vatParameters
   */
  const upgradeVat = async (
    vatAdminSvc,
    adminNode,
    bundleCapName,
    vatParameters = {},
  ) => {
    const bcap = await E(vatAdminSvc).getNamedBundleCap(bundleCapName);
    const options = { vatParameters };
    const incarnationNumber = await E(adminNode).upgrade(bcap, options);
    console.log('upgraded', bundleCapName, 'to', incarnationNumber);
  };

  const upgradeZoe = async powers => {
    const { vatStore, vatAdminSvc } = powers.consume;
    const { adminNode } = await E(vatStore).get('zoe');
    console.log('zoe admin node', adminNode);
    await upgradeVat(vatAdminSvc, adminNode, 'zoe');
  };
  return upgradeZoe;
};

export const restartWalletFactoryScript = () => {
  const { entries, fromEntries } = Object;

  /** @type {AllValues} */
  const allValues = async obj => {
    const resolved = await Promise.all(
      entries(obj).map(([k, vP]) => Promise.resolve(vP).then(v => [k, v])),
    );
    return harden(fromEntries(resolved));
  };

  /** @param {BootstrapPowers} powers } */
  const restartWalletFactory = async powers => {
    const { instancePrivateArgs, walletFactoryStartResult } = powers.consume;
    const kit = await walletFactoryStartResult;
    console.log(kit);
    const { adminFacet } = kit;
    /** @type {Parameters<import('@agoric/smart-wallet/src/walletFactory').start>[1]} */
    // @ts-expect-error instancePrivateArgs maps to unknown
    const privateArgs = await E(instancePrivateArgs).get(kit.instance);
    const settledPrivateArgs = await allValues(privateArgs);
    await E(adminFacet).restartContract(settledPrivateArgs);
  };
  return restartWalletFactory;
};

export const sendInvitationScript = () => {
  const addr = 'ADDRESS';
  const sendIt = async powers => {
    // namesByAddress is broken #8113
    const {
      consume: { namesByAddressAdmin, zoe },
      instance: {
        consume: { reserve },
      },
    } = powers;
    const pf = E(zoe).getPublicFacet(reserve);
    const anInvitation = await E(pf).makeAddCollateralInvitation();
    await E(namesByAddressAdmin).reserve(addr);
    // don't trigger the namesByAddressAdmin.readonly() bug
    const addressAdmin = E(namesByAddressAdmin).lookupAdmin(addr);
    await E(addressAdmin).reserve('depositFacet');
    const addressHub = E(addressAdmin).readonly();
    const addressDepositFacet = E(addressHub).lookup('depositFacet');
    await E(addressDepositFacet).receive(anInvitation);
  };

  return sendIt;
};
