From Coq Require Import Arith.

Theorem plus_1_r_fails : forall n : nat, n + 1 = n.
Proof.
  intros n.
  reflexivity.
Qed.