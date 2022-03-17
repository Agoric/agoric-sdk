import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  const mode = vatParameters.argv[0] || 'kill';
  let counter = 46;
  const self = Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const dude = await E(vatMaker).createVatByName('dude');
      const succBefore = await E(dude.root).dude(true);
      console.log(`success result ${succBefore}`);
      try {
        const failBefore = await E(dude.root).dude(false);
        console.log(`failure path should not yield ${failBefore} [bad]`);
      } catch (e) {
        console.log(`failure result ${e} [good]`);
      }
      await E(dude.root).elsewhere(self); // this will notify
      console.log(`expected notify sent`);
      const p = E(dude.root).elsewhere(self); // this will not
      p.catch(() => {}); // just shut up already

      switch (mode) {
        case 'kill':
          await E(dude.adminNode).terminateWithFailure('with prejudice');
          break;
        case 'happy':
          await E(dude.root).dieHappy('I got everything I ever wanted');
          break;
        case 'exceptionallyHappy':
          await E(dude.root).dieHappy(Error('catch me if you can'));
          break;
        case 'sad':
          await E(dude.root).dieSad('Goodbye cruel world');
          break;
        case 'exceptionallySad':
          await E(dude.root).dieSad(Error("I can't take it any more"));
          break;
        default:
          console.log('this should never happen');
          break;
      }
      p.then(
        () => console.log(`non-notify call notified [bad]`),
        e => console.log(`non-notify call rejected: ${e} [good]`),
      );
      console.log(`terminated`);
      try {
        const succAfter = await E(dude.root).dude(true);
        console.log(`result after terminate: ${succAfter} [bad]`);
      } catch (e) {
        console.log(`send after terminate failed: ${e} [good]`);
      }
      try {
        const success = await E(dude.adminNode).done();
        // prettier-ignore
        console.log(`done() succeeded with ${success} (${JSON.stringify(success)})`);
      } catch (e) {
        console.log(`done() rejected with ${e} (${JSON.stringify(e)})`);
      }
    },
    query() {
      counter += 1;
      return counter;
    },
  });
  return self;
}
