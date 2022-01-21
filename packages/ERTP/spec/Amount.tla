------------------------------ MODULE Amount ------------------------------
EXTENDS Integers

Semigroup(S, add(_, _)) ==
    \A a, b, c \in S:
    /\ add(a, b) \in S \* Closure
    /\  add(add(a, b), c) = add(a, add(b, c)) \* Associativity

Monoid(M, add(_, _), empty) ==
    /\ Semigroup(M, add)
    /\ \A a \in M: add(empty, a) = a /\ add(a, empty) = a \* Identity

\* -- https://en.wikipedia.org/wiki/Monoid#Commutative_monoid
CommutativeMonoid(M, add(_, _), empty) ==
    /\ Monoid(M, add, empty)
    /\ \A a, b \in M: add(a, b) = add(b, a) \* Commutative

\* "Any commutative monoid is endowed with its algebraic preordering ≤,
\* defined by x ≤ y if there exists z such that x + z = y."
\* -- https://en.wikipedia.org/wiki/Monoid#Commutative_monoid
\* But we use gte in ERTP.
OrderedBy(M, add(_, _), isGTE(_, _)) ==
    \A x, y \in M: isGTE(x, y) = (\E z \in M: x = add(y, z))

Minimal(M, e, isGTE(_, _)) ==
    \A x \in M: isGTE(x, e)

Equivalence(S, isEqual(_, _)) ==
    \A a, b, c \in S:
    /\ isEqual(a, b) \in { TRUE, FALSE } \*  == is a total predicate.
    /\ isEqual(a, a) \* Reflexive
    /\ isEqual(a, b) = isEqual(b, a) \* Symmetric
    /\ (isEqual(a, b) /\ isEqual(b, c) => isEqual(a, c)) \* Transitive

PartialDifference(M, add(_, _), subtract(_, _)) ==
    \A x, y \in M:
    subtract(add(x, y), y) = x

\* x == y iff x and y are indistinguishable by these operators.
\* Note isGTE is defined by add, and add is commutative.
Substitutable(S, isEqual(_, _), add(_, _), isGTE(_, _), subtract(_, _)) ==
    \A a, b, c \in S:
    /\ isEqual(a, b) => add(a, c) = add(b, c)
    /\ isEqual(a, b) /\ isGTE(a, c) => subtract(a, c) = subtract(b, c)

\* TODO: use a record of [M, empty, isGTE, isEqual, add, subtract]
AmountMath(M, empty, isGTE(_, _), isEqual(_, _), add(_, _), subtract(_, _)) ==
    /\ CommutativeMonoid(M, add, empty)
    /\ OrderedBy(M, add, isGTE)
    /\ Minimal(M, empty, isGTE)
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
