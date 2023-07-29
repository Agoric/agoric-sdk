import { E } from '@endo/far';

var Q = Promise;

var Qjoin = (p1, p2) =>
  Q.all([p1, p2]).then(([r1, r2]) => {
    if (!Object.is(r1, r2)) {
      throw Error('join failed');
    }
    return r1;
  });

var transfer = (decisionP, srcPurseP, dstPurseP, amount) => {
  var makeEscrowPurseP = Qjoin(E.get(srcPurseP).makePurse,
                               E.get(dstPurseP).makePurse);
  var escrowPurseP = E(makeEscrowPurseP)();
  Q(decisionP).then( // setup phase 2
    _ => { E(dstPurseP).deposit(amount, escrowPurseP); },
    _ => { E(srcPurseP).deposit(amount, escrowPurseP); });
  return E(escrowPurseP).deposit(amount, srcPurseP); // phase 1
};

var failOnly = cancellationP => Q(cancellationP).then(
  cancellation => { throw cancellation; });

var escrowExchange = (a, b) => { // a from Alice , b from Bob
  var decide;
  var decisionP = Q.promise(resolve => { decide = resolve; });
  decide(Q.race([Q.all([
      transfer(decisionP, a.moneySrcP, b.moneyDstP, b.moneyNeeded),
      transfer(decisionP, b.stockSrcP, a.stockDstP, a.stockNeeded)
    ]),
    failOnly(a.cancellationP),
    failOnly(b.cancellationP)]));
  return decisionP;
};
