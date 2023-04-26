import { makePromiseKit } from '@endo/promise-kit';
import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let mediumRoot;
  let weatherwaxRoot;
  let rAfterG;

  const self = Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      mediumRoot = vats.medium;

      // create a dynamic vat, then kill it, then try to send it a message

      const weatherwax = await E(vatMaker).createVatByName('weatherwax');
      weatherwaxRoot = weatherwax.root;

      const { promise: pBefore, resolve: rBefore } = makePromiseKit();
      const { promise: pAfter, resolve: rAfter } = makePromiseKit();
      rAfterG = rAfter;
      const [p1, p2] = await E(weatherwaxRoot).rememberThese(pBefore, pAfter);
      p1.then(
        v => testLog(`b: p1b = ${v}`),
        e => testLog(`b: p1b fails ${e}`),
      );
      p2.then(
        v => testLog(`b: p2b = ${v}`),
        e => testLog(`b: p2b fails ${e}`),
      );
      rBefore('before');

      try {
        await E(mediumRoot).speak(weatherwaxRoot, '1');
      } catch (e) {
        testLog(`b: speak failed: ${e}`);
      }

      E(weatherwax.adminNode).terminateWithFailure(Error('arbitrary reason'));
      try {
        await E(weatherwax.adminNode).done();
      } catch (e) {
        testLog(`done: ${e}`);
      }

      return 'bootstrap done';
    },
    async speakAgain() {
      rAfterG('after');
      try {
        await E(mediumRoot).speak(weatherwaxRoot, '2');
      } catch (e) {
        testLog(`b: respeak failed: ${e}`);
      }
    },
  });
  return self;
}
