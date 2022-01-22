------------------------------ MODULE Amount ------------------------------
EXTENDS Integers, Group, Relation

Minimal(M, e, _ \succeq _) ==
    \A x \in M: x \succeq e

PartialDifference(M, _ (+) _, _ (-) _) ==
    \A x, y \in M:
    (x (+) y) (-) y = x

\* x == y iff x and y are indistinguishable by these operators.
\* Note isGTE is defined by add, and add is commutative.
Substitutable(S, _ \doteq _, _ (+) _, _ \succeq _, _ (-) _) ==
    \A a, b, c \in S:
    /\ a \doteq b => a (+) c = b (+) c
    /\ a \doteq b /\ a \succeq c => a (-) c = b (-) c
    /\ b \doteq c /\ a \succeq c => a (-) c = a (-) b


\* TODO: use a record of [M, empty, isGTE, isEqual, add, subtract]
AmountMath(M, empty, isGTE(_, _), isEqual(_, _), add(_, _), subtract(_, _)) ==
    /\ CommutativeMonoid(M, add, empty)
    /\ OrderedBy(M, add, isGTE)
    /\ Minimal(M, empty, isGTE) \* ISSUE: subsumed / thm?
    /\ Equivalence(M, isEqual)
    /\ Substitutable(M, isEqual, add, isGTE, subtract)
    /\ PartialDifference(M, add, subtract)


\* ISSUE: spell out add(a, b) or use infix a ++ b?
\* likewise isGTE, isEqual, subtract
\* Infix has less () noise

\* thm: >= is a partial order
\* thm: isGTE(z, x) => (subtract(z, x) = y <=> add(x, y) = z)
\* thm: x + y >= x (therefore x + y >= y), so + is monotonic

===============================================================================
