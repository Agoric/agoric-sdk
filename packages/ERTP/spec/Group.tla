------------------------------- MODULE Group -------------------------------

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

=============================================================================
\* Modification History
\* Last modified Sat Jan 22 11:42:06 CST 2022 by connolly
\* Created Sat Jan 22 11:40:41 CST 2022 by connolly
