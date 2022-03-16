import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  const ourThing = Far('thing-like', {
    pretendToBeAThing(from) {
      console.log(`pretendToBeAThing invoked from ${from}`);
    },
  });
  const self = Far('root', {
    async bootstrap(vats, devices) {
      let badvat;
      let done;
      if (vatParameters.argv[0] === '--bedynamic') {
        const vatMaker = E(vats.vatAdmin).createVatAdminService(
          devices.vatAdmin,
        );
        const vat = await E(vatMaker).createVatByName('badvat', {
          enableSetup: true,
        });
        badvat = vat.root;
        done = E(vat.adminNode).done();
      } else {
        badvat = vats.badvatStatic;
      }
      if (done) {
        done.then(
          v => console.log(`done resolved (bad) to ${v}`),
          e => console.log(`done rejected (good) with ${e}`),
        );
      } else {
        console.log('running statically, no done() facet');
      }
      const p1 = E(badvat).begood(ourThing);
      p1.then(
        () => console.log('p1 resolve (bad!)'),
        e => console.log(`p1 reject ${e}`),
      );
      const p2 = E(badvat).bebad(ourThing);
      p2.then(
        () => console.log('p2 resolve (bad!)'),
        e => console.log(`p2 reject ${e}`),
      );
      const p3 = E(badvat).begood(ourThing);
      p3.then(
        () => console.log('p3 resolve (bad!)'),
        e => console.log(`p3 reject ${e}`),
      );
    },
  });
  return self;
}
