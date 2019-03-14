/* eslint-disable-next-line global-require */
const harden = require('@agoric/harden');

export default function escrowExchange(a, b) {
  // a from Alice , b from Bob
  function makeTransfer(srcPurseP, dstPurseP, amount) {
    const issuerP = Promise.join(srcPurseP.e.getIssuer(), dstPurseP.e.getIssuer());
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
