/* global harden */

import { E } from '@agoric/eventual-send';
/* eslint-disable import/extensions, import/no-unresolved */
import infiniteInstallLoopBundle from './bundle-infiniteInstallLoop';
import infiniteInstanceLoopBundle from './bundle-infiniteInstanceLoop';
import infiniteTestLoopBundle from './bundle-infiniteTestLoop';
import testBuiltinsBundle from './bundle-testBuiltins';
/* eslint-enable import/extensions, import/no-unresolved */

function build(log) {
  const obj0 = {
    async bootstrap(argv, vats, devices) {
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

      const [testName] = argv;
      // depending upon the mode we're using ('testName'), one of these calls
      // will go into an infinite loop and get killed by the meter

      log(`installing ${testName}`);
      try {
        const installId = await installations[testName]();
        log(`instantiating ${testName}`);
        const inviteIssuer = E(zoe).getInviteIssuer();
        const issuerKeywordRecord = harden({ Keyword1: inviteIssuer });
        const {
          instanceRecord: { publicAPI },
        } = await E(zoe).makeInstance(installId, issuerKeywordRecord);
        log(`invoking ${testName}.doTest()`);
        await E(publicAPI).doTest();
        log(`complete`);
      } catch (e) {
        log(`error: ${e}`);
      }
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers => build(helpers.log),
    helpers.vatID,
  );
}
export default harden(setup);
