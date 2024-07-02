import { Far, E } from '@endo/far';

export function buildRootObject() {
  let admin;
  let held;

  const adder = Far('adder', { add1: x => x + 1 });
  const options = { name: 'newvat', vatParameters: { adder } };

  return Far('root', {
    async bootstrap(vats, devices) {
      admin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      held = await E(vats['export-held']).createHeld();
    },

    async byBundle(bundle) {
      const { root } = await E(admin).createVat(bundle, options);
      const n = await E(root).getANumber();
      return n;
    },

    async byName(bundleName) {
      const { root } = await E(admin).createVatByName(bundleName, options);
      const n = await E(root).getANumber();
      return n;
    },

    async byNameWithOptions(bundleName, opts) {
      const { root } = await E(admin).createVatByName(bundleName, {
        ...options,
        ...opts,
      });
      return root;
    },

    async byNamedBundleCap(name) {
      const bcap = await E(admin).getNamedBundleCap(name);
      const { root } = await E(admin).createVat(bcap, options);
      const n = await E(root).getANumber();
      return n;
    },

    async byID(id) {
      const bcap = await E(admin).getBundleCap(id);
      const { root } = await E(admin).createVat(bcap, options);
      const n = await E(root).getANumber();
      return n;
    },

    async counters(bundleName) {
      const { root } = await E(admin).createVatByName(bundleName, options);
      const c = E(root).createRcvr(1);
      const log = [];
      log.push(await E(c).increment(3));
      log.push(await E(c).increment(5));
      log.push(await E(c).ticker());
      log.push(await E(c).add2(6));
      return log;
    },

    async brokenVat(bundleName) {
      return E(admin).createVatByName(bundleName); // should reject
    },

    async nonBundleCap() {
      return E(admin).createVat(Far('non-bundlecap', {})); // should reject
    },

    async vatName(name) {
      const opts = { name, vatParameters: {} };
      await E(admin).createVatByName('new13', opts);
      return 'ok';
    },

    async badOptions() {
      const opts = { bogus: 'nope' };
      return E(admin).createVatByName('new13', opts); // should reject
    },

    getHeld() {
      return held;
    },

    refcount(id) {
      // bootstrap retains 'held' the whole time, contributing one refcount
      return E(admin)
        .getBundleCap(id)
        .then(bcap => E(admin).createVat(bcap, { vatParameters: { held } }))
        .then(() => 0);
    },
  });
}
