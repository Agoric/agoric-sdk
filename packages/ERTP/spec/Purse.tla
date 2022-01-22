------------------------------- MODULE Purse -------------------------------
EXTENDS Amount

VARIABLE balance

CONSTANTS
  Purse,
  Value,
  empty, isGTE(_, _), isEqual(_, _), add(_, _), subtract(_, _)

Init ==
    /\ AmountMath(Value, empty, isGTE, isEqual, add, subtract)
    /\ balance \in [Purse -> Value]

Deposit ==
  \E dest \in Purse, src \in Purse, amt \in Value:
  /\ isGTE(balance[src], amt)
  /\ balance'[src] = subtract(balance[src], amt)
  /\ balance'[dest] = add(balance[dest], amt)

Withdraw ==
  \E dest \in Purse, amt \in Value:
  /\ isGTE(balance[dest], amt)
  /\ balance'[dest] = subtract(balance[dest], amt)

Next == Deposit /\ Withdraw

THEOREM 1 + 1 = 2

=============================================================================
\* Modification History
\* Last modified Sat Jan 22 12:29:48 CST 2022 by connolly
\* Created Sat Jan 22 11:52:24 CST 2022 by connolly
