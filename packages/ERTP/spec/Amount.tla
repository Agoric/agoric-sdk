------------------------------ MODULE Amount ------------------------------
EXTENDS Integers

Semigroup(S, combine(_, _)) ==
    \A a \in S: \A b \in S: \A c \in S:
    combine(a, b) \in S \* Closure
    /\  combine(combine(a, b), c) = combine(a, combine(b, c)) \* Associativity

Monoid(M, combine(_, _)) ==
    Semigroup(M, combine)
    /\ \E id \in M : \A a \in M: combine(id, a) = a /\ combine(a, id) = a \* Identity

CommutativeMonoid(M, combine(_, _)) ==
    Monoid(M, combine) /\
    \A a \in M: \A b \in M: combine(a, b) = combine(b, a)

===============================================================================
