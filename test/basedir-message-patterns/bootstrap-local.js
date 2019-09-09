import harden from '@agoric/harden';

function build(E) {
  const root = harden({
    async bootstrap(argv, vats, _devices) {
      const which = argv[0];
      const b = await E(vats.b).init();
      // eslint-disable-next-line no-unused-vars
      const a = await E(vats.a).init(b.bob, b.bert);
      await E(vats.a).run(which);
    },
  });
  return root;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
