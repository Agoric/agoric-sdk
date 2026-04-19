From Coq Require Import Arith.

Theorem plus_0_r_works : forall n : nat, n + 0 = n.
Proof.
  intros n.
  induction n as [| n IH].
  - reflexivity.
  - simpl.
    rewrite IH.
    reflexivity.
Qed.
