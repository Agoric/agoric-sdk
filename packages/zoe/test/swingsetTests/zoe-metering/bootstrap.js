import harden from '@agoric/harden';

import infiniteInstallLoopBundle from './bundle-infiniteInstallLoop';
import infiniteInstanceLoopBundle from './bundle-infiniteInstanceLoop';
import infiniteTestLoopBundle from './bundle-infiniteTestLoop';
import testBuiltinsBundle from './bundle-testBuiltins';

function build(E, log) {
  const obj0 = {
    async bootstrap(argv, vats) {
      const zoe = await E(vats.zoe).getZoe();

      const installations = {
        infiniteInstallLoop: () =>
          E(zoe).install(
            infiniteInstallLoopBundle.source,
            infiniteInstallLoopBundle.moduleFormat,
          ),
        infiniteInstanceLoop: () =>
          E(zoe).install(
            infiniteInstanceLoopBundle.source,
            infiniteInstanceLoopBundle.modelFormat,
          ),
        infiniteTestLoop: () =>
          E(zoe).install(
            infiniteTestLoopBundle.source,
            infiniteTestLoopBundle.moduleFormat,
          ),
        testBuiltins: () =>
          E(zoe).install(
            testBuiltinsBundle.source,
            testBuiltinsBundle.moduleFormat,
          ),
      };

      const [testName] = argv;

      log(`installing ${testName}`);
      const installId = await installations[testName]();
      log(`instantiating ${testName}`);
      const inviteIssuer = E(zoe).getInviteIssuer();
      const invite = await E(zoe).makeInstance(installId, {
        roles: { Role1: inviteIssuer },
      });
      const {
        extent: [{ instanceHandle }],
      } = await E(inviteIssuer).getAmountOf(invite);
      const { publicAPI } = await E(zoe).getInstance(instanceHandle);
      log(`invoking ${testName}.doTest()`);
      await E(publicAPI).doTest();
      log(`complete`);
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
export default harden(setup);
