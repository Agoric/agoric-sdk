var transfer = (decisionP, srcPurseP, dstPurseP, amount) => {
  var makeEscrowPurseP = Q.join(srcPurseP ! makePurse,
                                dstPurseP ! makePurse);
  var escrowPurseP = makeEscrowPurseP ! ();
  Q(decisionP).then( // setup phase 2
    _ => { dstPurseP ! deposit(amount, escrowPurseP); },
    _ => { srcPurseP ! deposit(amount, escrowPurseP); });
  return escrowPurseP ! deposit(amount, srcPurseP); // phase 1
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
