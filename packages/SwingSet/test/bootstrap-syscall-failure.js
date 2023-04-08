import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters) {
  const { testLog } = vatPowers;

  const ourThing = Far('ourThing', {
    pretendToBeAThing(from) {
      testLog(`pretendToBeAThing invoked from ${from}`);
    },
  });
  const self = Far('root', {
    async bootstrap(vats, devices) {
      testLog('bootstrap');
      let badvat;
      if (vatParameters.beDynamic) {
        const vatMaker = E(vats.vatAdmin).createVatAdminService(
          devices.vatAdmin,
        );
        const vat = await E(vatMaker).createVatByName('badvat', {
          enableSetup: true,
        });
        badvat = vat.root;
      } else {
        badvat = vats.badvatStatic;
      }
      const p1 = E(badvat).begood(ourThing);
      p1.then(
        () => testLog('p1 resolve (bad!)'),
        e => testLog(`p1 reject ${e}`),
      );
      const p2 = E(badvat).bebad(ourThing);
      p2.then(
        () => testLog('p2 resolve (bad!)'),
        e => testLog(`p2 reject ${e}`),
      );
      const p3 = E(badvat).begoodagain(ourThing);
      p3.then(
        () => testLog('p3 resolve (bad!)'),
        e => testLog(`p3 reject ${e}`),
      );
      testLog('bootstrap done');
    },
  });
  return self;
}
