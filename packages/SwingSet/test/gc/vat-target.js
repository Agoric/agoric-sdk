import { Far, E } from '@endo/far';

export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  /** @type { WeakSet | undefined } */
  let ws = new WeakSet();

  return Far('root', {
    async two(A, B) {
      // A=ko26 B=ko27
      await E(A).hello(B);
    },

    makeInvitationTarget(zoe) {
      return E(zoe).makeInvitationZoe();
    },

    // these three are for testing #9939
    store: x => {
      baggage.init('x', x);
      assert(ws);
      ws.add(x);
    },
    dummy: () => 0,
    drop: () => (ws = undefined),
  });
}
