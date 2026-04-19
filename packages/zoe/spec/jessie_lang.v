From Coq Require Import List String ZArith.
From iris.program_logic Require Export language ectx_language.

Import ListNotations.
Open Scope Z_scope.
Open Scope string_scope.

Inductive jval :=
| JNull
| JBool (b : bool)
| JNum (n : Z)
| JStr (s : string)
| JArr (xs : list jval)
| JObj (fields : list (string * jval)).

Inductive json_expr :=
| JsonLit (v : jval).

Definition json_val := jval.
Definition json_state := unit.
Definition json_observation := unit.
Definition json_ectx := unit.

Definition json_of_val (v : json_val) : json_expr := JsonLit v.

Definition json_to_val (e : json_expr) : option json_val :=
  match e with
  | JsonLit v => Some v
  end.

Definition json_empty_ectx : json_ectx := tt.

Definition json_comp_ectx (_ _ : json_ectx) : json_ectx := tt.

Definition json_fill (_ : json_ectx) (e : json_expr) : json_expr := e.

Inductive json_base_step :
  json_expr ->
  json_state ->
  list json_observation ->
  json_expr ->
  json_state ->
  list json_expr ->
  Prop :=.

Lemma json_to_of_val v :
  json_to_val (json_of_val v) = Some v.
Proof. reflexivity. Qed.

Lemma json_of_to_val e v :
  json_to_val e = Some v -> json_of_val v = e.
Proof.
  destruct e as [v']; simpl.
  intros [= <-].
  reflexivity.
Qed.

Lemma json_fill_empty e :
  json_fill json_empty_ectx e = e.
Proof. reflexivity. Qed.

Lemma json_fill_comp K1 K2 e :
  json_fill K1 (json_fill K2 e) = json_fill (json_comp_ectx K1 K2) e.
Proof. reflexivity. Qed.

Global Instance json_fill_inj K :
  Inj (=) (=) (json_fill K).
Proof. intros e1 e2 H; exact H. Qed.

Lemma json_fill_val K e :
  is_Some (json_to_val (json_fill K e)) -> is_Some (json_to_val e).
Proof. exact (fun H => H). Qed.

Lemma json_ectx_mixin :
  EctxLanguageMixin
    json_of_val
    json_to_val
    json_empty_ectx
    json_comp_ectx
    json_fill
    json_base_step.
Proof.
  split.
  - exact json_to_of_val.
  - exact json_of_to_val.
  - intros ?????? Hstep. inversion Hstep.
  - exact json_fill_empty.
  - exact json_fill_comp.
  - exact json_fill_inj.
  - exact json_fill_val.
  - intros K' K_redex e1' e1_redex σ1 κ e2 σ2 efs Heq Hnval Hstep.
    inversion Hstep.
  - intros K e σ1 κ e2 σ2 efs Hstep.
    inversion Hstep.
Qed.

Canonical Structure json_ectx_lang : ectxLanguage :=
  @EctxLanguage
    json_expr
    json_val
    json_ectx
    json_state
    json_observation
    json_of_val
    json_to_val
    json_empty_ectx
    json_comp_ectx
    json_fill
    json_base_step
    json_ectx_mixin.

Canonical Structure json_lang := LanguageOfEctx json_ectx_lang.

Lemma json_expr_is_value e :
  exists v, json_to_val e = Some v.
Proof. destruct e; eexists; reflexivity. Qed.

Lemma json_irreducible e σ :
  irreducible (Λ := json_lang) e σ.
Proof.
  intros κ e' σ' efs Hstep.
  destruct Hstep as [K e1' e2' He1 He2 Hbase].
  inversion Hbase.
Qed.
