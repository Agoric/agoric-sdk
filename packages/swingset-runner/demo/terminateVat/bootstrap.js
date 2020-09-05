import { E } from '@agoric/eventual-send';

export function buildRootObject() {
  let counter = 46;
  const self = harden({
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

      await E(dude.adminNode).terminate();
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
      await E(dude.adminNode).done();
    },
    query() {
      counter += 1;
      return counter;
    },
  });
  return self;
}
