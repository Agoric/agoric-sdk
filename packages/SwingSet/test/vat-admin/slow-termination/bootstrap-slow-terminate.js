import { Far, E } from '@endo/far';

export function buildRootObject(_vatPowers) {
  let root;
  let adminNode;
  const myImports = [];

  const self = Far('root', {
    async bootstrap(vats, devices) {
      const svc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      // create a dynamic vat, send it a message and let it respond, to make
      // sure everything is working
      const dude = await E(svc).createVatByName('dude');
      root = dude.root;
      adminNode = dude.adminNode;
      await E(root).alive();

      // set up 20 "bootstrap exports, dude imports" c-list entries
      for (let i = 0; i < 20; i += 1) {
        await E(root).acceptImports(Far('bootstrap export', {}));
      }

      // set up 20 "dude exports, bootstrap imports" c-list entries

      for (let i = 0; i < 20; i += 1) {
        myImports.push(await E(root).sendExport());
      }

      // ask dude to creates 20 vatstore entries (in addition to the
      // built-in liveslots stuff)
      await E(root).makeVatstore(20);

      return 'bootstrap done';
    },

    async kill(mode) {
      switch (mode) {
        case 'kill':
          await E(adminNode).terminateWithFailure(mode);
          break;
        case 'dieHappy':
          await E(root).dieHappy(mode);
          break;
        default:
          console.log('something terrible has happened');
          break;
      }
      // confirm the vat is dead, even though cleanup happens later
      return E(root)
        .ping()
        .catch(err => `kill done, ${err}`);
    },
  });
  return self;
}
