// @ts-check

import { Far, passStyleOf } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

import { makeInstallationStorage } from './installationStorage';
import { makeHandle } from '../makeHandle.js';
import { createInvitationKit } from './makeInvitation';
import { setupCreateZCFVat } from './createZCFVat';

const { details: X } = assert;

const makeLauncher = (
  vatAdminSvc,
  shutdownZoeVat = () => {},
  meteringConfig,
  zcfBundleName,
) => {
  const { install, unwrapInstallation } = makeInstallationStorage();

  const { setupMakeInvitation, invitationIssuer } = createInvitationKit(
    shutdownZoeVat,
  );

  return Far('launcher', {
    install,
    startInstance: async (installationP, terms, privateArgs) => {
      const { installation, bundle } = await unwrapInstallation(installationP);
      // AWAIT ///

      if (privateArgs !== undefined) {
        const passStyle = passStyleOf(privateArgs);
        assert(
          passStyle === 'copyRecord',
          X`privateArgs must be a pass-by-copy record, but instead was a ${q(
            passStyle,
          )}: ${privateArgs}`,
        );
      }

      const instance = makeHandle('Instance');

      const makeInvitation = setupMakeInvitation(instance, installation);

      // This method contains the power to create a new ZCF Vat, and must
      // be closely held. vatAdminSvc is even more powerful - any vat can
      // be created. We severely restrict access to vatAdminSvc for this reason.
      const createZCFVat = setupCreateZCFVat(
        vatAdminSvc,
        meteringConfig.initial,
        meteringConfig.threshold,
        zcfBundleName,
      );

      const { root, adminNode, meter } = await createZCFVat();

      return E(root).executeContract(
        bundle,
        makeInvitation,
        terms,
        privateArgs,
      );
    },
    getInvitationIssuer: () => invitationIssuer,
  });
};
harden(makeLauncher);
export { makeLauncher };
