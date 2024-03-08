// @ts-nocheck
import { Far, E } from '@endo/far';

export function buildRootObject() {
  let A = makeExo('A', M.interface('A', {}, { defaultGuards: 'passable' }), {
    hello() {},
  });
  let B = makeExo('B', M.interface('B', {}, { defaultGuards: 'passable' }), {
    hello() {},
  });
  let target;
  let zoe;

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats) {
        target = vats.target;
        zoe = vats.zoe;
      },
      async one() {
        await E(target).two(A, B);
      },
      drop() {
        A = null;
        B = null;
      },

      async makeInvitation0() {
        await E(target).makeInvitationTarget(zoe);
      },
    },
  );
}
