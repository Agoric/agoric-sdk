include "amountMath.dfy"
include "elib.dfy"

abstract module ERTP {
  import ELib

  trait Brand extends ELib.Callable {
    function isMyIssuer(i: Issuer): bool
  }
  trait Issuer extends ELib.Callable {
    function getBrand(): Brand
    method makeEmptyPurse() returns (p: Purse)
  }

  trait Purse extends ELib.Callable {
    function getAllegedBrand(): Brand
  }
}

abstract module Escrow {
  import opened M0.AmountMath
  import opened ERTP
  import opened ELib
  import opened Passable

  class EscrowVat extends E {
    var issuer0: Issuer // TODO set/seq of issuers

    constructor(i0: Issuer) {
      var reason := new Fail("BROKEN");
      theBroken := new UnconnectedRef(reason);
      issuer0 := i0;
    }

    method transfer(decisionP: Ref, srcPurseP: Ref, dstPurse: Ref, amount: Amount) returns (ret: Ref) // Promise<Amount>
      requires srcPurseP.CapOK()
      modifies srcPurseP.reach
    {
      // var q := decisionP.Home();
      // var makeEscrowPurseP := q.join(
      //   E.get(srcPurseP).makePurse,
      //   E.get(dstPurseP).makePurse
      // );
      var srcBrandP := this.sendAll(srcPurseP, "getAllegedBrand", []);
      var x := srcBrandP.MoveNext(); // a la await

      var srcBrand :- srcBrandP.MoveNext(); // a la await
      //   if (srcBrand != Value.Remotable(issuer0.getBrand())) {
      //     return broken(); // reason: brand / issuer mismatch
      //   }
      // // setup phase 2
      // var yes := new DepositIt(dstPurseP, amount, escrowPurseP);
      // var no := new DepositIt(srcPurseP, amount, escrowPurseP);
      // decisionP.Then( // defensive: q.promise(decisionP).then...
      //   yes
      // ).Catch(no);

      // ret := E(escrowPurseP).deposit(amount, srcPurseP); // phase 1
      ret := broken(); // TODO
    }

  }
}