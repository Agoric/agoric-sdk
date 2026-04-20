(* Minimal makeCounter encoding in the tiny OCPL-style language. *)
From Coq Require Import List String ZArith.
Require Import jessie_lang.

Import ListNotations.
Open Scope Z_scope.
Open Scope string_scope.

Module JessieCounter.
  Import JessieLang.
  Open Scope jessie_scope.

  Definition makeCounter : expr :=
    (fn: <> =>
      let: "counter" := ref #0 in
      { "incr" := fn: <> => "counter" += #1;
        "decr" := fn: <> => "counter" -= #1 }
    )%jessie.

  Definition cUp_of (c : expr) : expr := ({ "incr" := c.["incr"] })%jessie.

  (* TODO: revisit custom-entry syntax if we want HeapLang-style application
     notation here instead of explicit App nodes. *)
  Definition use_original_c_after_cUp : expr :=
    let: "c" := App makeCounter #() in
    let: "cUp" := "c".["incr"] in
    App ("c".["incr"]) #().

  Example cUp_keeps_only_incr :
    cUp_of (Var "c") = ({ "incr" := (Var "c").["incr"] })%jessie.
  Proof. reflexivity. Qed.
End JessieCounter.
