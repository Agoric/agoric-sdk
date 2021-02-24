import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
/* eslint-disable import/extensions, import/no-unresolved */
import infiniteInstallLoopBundle from './bundle-infiniteInstallLoop';
import infiniteInstanceLoopBundle from './bundle-infiniteInstanceLoop';
import infiniteTestLoopBundle from './bundle-infiniteTestLoop';
import testBuiltinsBundle from './bundle-testBuiltins';
/* eslint-enable import/extensions, import/no-unresolved */

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc);
      const installations = {
        infiniteInstallLoop: () =>
          E(zoe).install(infiniteInstallLoopBundle.bundle),
        infiniteInstanceLoop: () =>
          E(zoe).install(infiniteInstanceLoopBundle.bundle),
        infiniteTestLoop: () => E(zoe).install(infiniteTestLoopBundle.bundle),
        testBuiltins: () => E(zoe).install(testBuiltinsBundle.bundle),
      };

      const [testName] = vatParameters.argv;
      // depending upon the mode we're using ('testName'), one of these calls
      // will go into an infinite loop and get killed by the meter

      log(`installing ${testName}`);
      try {
        const installId = await installations[testName]();
        log(`instantiating ${testName}`);
        const invitationIssuer = E(zoe).getInvitationIssuer();
        const issuerKeywordRecord = harden({ Keyword1: invitationIssuer });
        const { publicFacet } = await E(zoe).startInstance(
          installId,
          issuerKeywordRecord,
        );
        log(`invoking ${testName}.doTest()`);
        await E(publicFacet).doTest();
        log(`complete`);
      } catch (e) {
        log(`error: ${e}`);
      }
    },
  });
}
