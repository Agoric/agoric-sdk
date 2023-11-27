/**
 * @file core eval scripts to go with test-wallet-upgrade
 */
import { E } from '@endo/far';

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

export const sendInvitationScript = () => {
  const addr = 'agoric1oracle-operator';
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
