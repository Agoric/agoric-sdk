/* global require E */

export default function escrowExchange(a, b) {
  /* eslint-disable-next-line global-require */
  const harden = require('@agoric/harden');

  function join(xP, yP) {
    return Promise.all([xP, yP]).then(([x, y]) => {
      if (Object.is(x, y)) {
        return x;
      }
      throw new Error('not the same');
    });
  }

  // a from Alice , b from Bob
  function makeTransfer(srcPurseP, dstPurseP, amount) {
    const issuerP = join(E(srcPurseP).getIssuer(), E(dstPurseP).getIssuer());
    const escrowPurseP = E(issuerP).makeEmptyPurse('escrow');
    return harden({
      phase1() {
        return E(escrowPurseP).deposit(amount, srcPurseP);
      },
      phase2() {
        return E(dstPurseP).deposit(amount, escrowPurseP);
      },
      abort() {
        return E(srcPurseP).deposit(amount, escrowPurseP);
      },
    });
  }

  function failOnly(cancellationP) {
    return Promise.resolve(cancellationP).then(cancellation => {
      throw cancellation;
    });
  }

  const aT = makeTransfer(a.moneySrcP, b.moneyDstP, b.moneyNeeded);
  const bT = makeTransfer(b.stockSrcP, a.stockDstP, a.stockNeeded);
  return Promise.race([
    Promise.all([aT.phase1(), bT.phase1()]),
    failOnly(a.cancellationP),
    failOnly(b.cancellationP),
  ]).then(
    _x => Promise.all([aT.phase2(), bT.phase2()]),
    _ex => Promise.all([aT.abort(), bT.abort()]),
  );
}
