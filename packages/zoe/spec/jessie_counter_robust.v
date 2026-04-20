(* Counter-specific robust-safety clients built on the generic OCPL-style tools. *)
From Coq Require Import List String ZArith Lia.
Require Import jessie_lang jessie_counter jessie_eval jessie_robust.

Import ListNotations.
Open Scope string_scope.
Open Scope jessie_scope.

Module JessieCounterRobust.
  Import JessieLang.
  Import JessieCounter.
  Import JessieEval.
  Import JessieRobust.

  Definition checked_client_body (attacker : expr) : expr :=
    (let: "c" := App makeCounter #() in
     let: "cUp" := { "incr" := "c".["incr"] } in
     let: <> := attacker in
     assert: (App ("c".["incr"]) #() > #0%Z))%jessie.

  Definition checked_client (C : ctx) : expr :=
    checked_client_body (attacker_body "cUp" C).

  Definition overshared_client (C : ctx) : expr :=
    (let: "c" := App makeCounter #() in
     let: <> := attacker_body "c" C in
     assert: (App ("c".["incr"]) #() > #0%Z))%jessie.

  Definition counter_robust_safety_goal : Prop :=
    robust_safety_goal "cUp" checked_client_body monitored_eval.

  Example checked_client_hole_shape :
    checked_client CHole =
      (let: "c" := App makeCounter #() in
       let: "cUp" := { "incr" := "c".["incr"] } in
       let: <> := "cUp" in
       assert: (App ("c".["incr"]) #() > #0%Z))%jessie.
  Proof. reflexivity. Qed.

  Example cUp_single_incr_ctx_is_adversarial :
    AdvCtxOn "cUp" (CAppL (CGet CHole "incr") #()).
  Proof.
    unfold AdvCtxOn; simpl.
    econstructor.
    - econstructor. constructor. simpl. auto.
    - constructor.
  Qed.

  Example checked_client_hole_is_good :
    is_good (monitored_eval (checked_client CHole)).
  Proof. reflexivity. Qed.

  Example checked_client_single_incr_is_good :
    is_good (monitored_eval (checked_client (CAppL (CGet CHole "incr") #()))).
  Proof. reflexivity. Qed.

  Example missing_decr_on_cUp_does_not_flip_goodness :
    is_good (monitored_eval (checked_client (CGet CHole "decr"))).
  Proof. reflexivity. Qed.

  Example overshared_single_decr_is_bad :
    monitored_eval (overshared_client (CAppL (CGet CHole "decr") #())) = false.
  Proof. reflexivity. Qed.
End JessieCounterRobust.
