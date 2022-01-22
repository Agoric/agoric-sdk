------------------------------ MODULE Relation ------------------------------

Equivalence(S, _ \doteq _) ==
    \A a, b, c \in S:
    /\ (a \doteq b) \in { TRUE, FALSE } \*  Total
    /\ a \doteq a \* Reflexive
    /\ a \doteq b <=> b \doteq a \* Symmetric
    /\ a \doteq b /\ b \doteq c => a \doteq c \* Transitive

=============================================================================
\* Modification History
\* Last modified Sat Jan 22 11:47:53 CST 2022 by connolly
\* Created Sat Jan 22 11:43:15 CST 2022 by connolly
