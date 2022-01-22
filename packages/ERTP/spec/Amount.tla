------------------------------ MODULE Amount ------------------------------
EXTENDS Integers

Semigroup(S, _ (+) _) ==
    \A a, b, c \in S:
    /\ a (+) b \in S \* Closure
    /\  (a (+) b) (+) c = a (+) (b (+) c) \* Associativity

Monoid(M, _ (+) _, i) ==
    /\ Semigroup(M, (+))
    /\ \A a \in M: i (+) a = a /\ a (+) i = a \* Identity

\* -- https://en.wikipedia.org/wiki/Monoid#Commutative_monoid
CommutativeMonoid(M, _ (+) _, i) ==
    /\ Monoid(M, (+), i)
    /\ \A a, b \in M: a (+) b = b (+) a \* Commutative

\* "Any commutative monoid is endowed with its algebraic preordering ≤,
\* defined by x ≤ y if there exists z such that x + z = y."
\* -- https://en.wikipedia.org/wiki/Monoid#Commutative_monoid
\* But we use gte in ERTP.
OrderedBy(M, _ (+) _, _ \succeq _) ==
    \A x, y \in M: (x \succeq y) = (\E z \in M: x = y (+) z)

Minimal(M, e, _ \succeq _) ==
    \A x \in M: x \succeq e

Equivalence(S, _ \doteq _) ==
    \A a, b, c \in S:
    /\ (a \doteq b) \in { TRUE, FALSE } \*  Total
    /\ a \doteq a \* Reflexive
    /\ a \doteq b <=> b \doteq a \* Symmetric
    /\ a \doteq b /\ b \doteq c => a \doteq c \* Transitive

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
