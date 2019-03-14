/* global Vow */

/* eslint-disable-next-line global-require, import/no-extraneous-dependencies */
const harden = require('@agoric/harden');

export default function escrowExchange(a, b) {
  // a from Alice , b from Bob
  function makeTransfer(srcPurseP, dstPurseP, amount) {
    const issuerP = Vow.join(srcPurseP.e.getIssuer(), dstPurseP.e.getIssuer());
    const escrowPurseP = issuerP.e.makeEmptyPurse('escrow');
    return harden({
      phase1() {
        return escrowPurseP.e.deposit(amount, srcPurseP);
      },
      phase2() {
        return dstPurseP.e.deposit(amount, escrowPurseP);
      },
      abort() {
        return srcPurseP.e.deposit(amount, escrowPurseP);
      },
    });
  }

  function failOnly(cancellationP) {
    return Vow.resolve(cancellationP).then(cancellation => {
      throw cancellation;
    });
  }

  const aT = makeTransfer(a.moneySrcP, b.moneyDstP, b.moneyNeeded);
  const bT = makeTransfer(b.stockSrcP, a.stockDstP, a.stockNeeded);
  return Vow.race([
    Vow.all([aT.phase1(), bT.phase1()]),
    failOnly(a.cancellationP),
    failOnly(b.cancellationP),
  ]).then(
    _x => Vow.all([aT.phase2(), bT.phase2()]),
    _ex => Vow.all([aT.abort(), bT.abort()]),
  );
}
