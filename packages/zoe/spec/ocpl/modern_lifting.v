(* Modernized OCPL-style lifting helpers for current Iris HeapLang. *)
From stdpp Require Import stringmap.
From iris.proofmode Require Import proofmode.
From iris.program_logic Require Import ectx_lifting ectxi_language.
From iris.heap_lang Require Export lang metatheory primitive_laws.
From iris.heap_lang Require Import notation proofmode tactics class_instances.

Module OCPLModernLifting.
  Local Definition set_binder_insert (x : binder) (X : stringset) : stringset :=
    match x with
    | BNamed x => {[x]} ∪ X
    | BAnon => X
    end.

  Definition is_rec (e : expr) : Prop :=
    match e with
    | Rec _ _ _ => True
    | Val (RecV _ _ _) => True
    | _ => False
    end.

  Definition is_lit (e : expr) : Prop :=
    match e with
    | Val (LitV _) => True
    | _ => False
    end.

  Definition is_int (e : expr) : Prop :=
    match e with
    | Val (LitV (LitInt _)) => True
    | _ => False
    end.

  Definition is_bool (e : expr) : Prop :=
    match e with
    | Val (LitV (LitBool _)) => True
    | _ => False
    end.

  Definition is_pair (e : expr) : Prop :=
    match e with
    | Pair _ _ => True
    | Val (PairV _ _) => True
    | _ => False
    end.

  Definition is_inl (e : expr) : Prop :=
    match e with
    | InjL _ => True
    | Val (InjLV _) => True
    | _ => False
    end.

  Definition is_inr (e : expr) : Prop :=
    match e with
    | InjR _ => True
    | Val (InjRV _) => True
    | _ => False
    end.

  Definition is_loc (e : expr) : Prop :=
    match e with
    | Val (LitV (LitLoc _)) => True
    | _ => False
    end.

  Global Instance is_rec_dec e : Decision (is_rec e).
  Proof.
    rewrite /is_rec. destruct e; try solve_decision.
    destruct v; solve_decision.
  Defined.

  Global Instance is_lit_dec e : Decision (is_lit e).
  Proof.
    rewrite /is_lit. destruct e; try solve_decision.
    destruct v; solve_decision.
  Defined.

  Global Instance is_int_dec e : Decision (is_int e).
  Proof.
    rewrite /is_int. destruct e; try solve_decision.
    destruct v; try solve_decision.
    destruct l; solve_decision.
  Defined.

  Global Instance is_bool_dec e : Decision (is_bool e).
  Proof.
    rewrite /is_bool. destruct e; try solve_decision.
    destruct v; try solve_decision.
    destruct l; solve_decision.
  Defined.

  Global Instance is_pair_dec e : Decision (is_pair e).
  Proof.
    rewrite /is_pair. destruct e; try solve_decision.
    destruct v; solve_decision.
  Defined.

  Global Instance is_inl_dec e : Decision (is_inl e).
  Proof.
    rewrite /is_inl. destruct e; try solve_decision.
    destruct v; solve_decision.
  Defined.

  Global Instance is_inr_dec e : Decision (is_inr e).
  Proof.
    rewrite /is_inr. destruct e; try solve_decision.
    destruct v; solve_decision.
  Defined.

  Global Instance is_loc_dec e : Decision (is_loc e).
  Proof.
    rewrite /is_loc. destruct e; try solve_decision.
    destruct v; try solve_decision.
    destruct l; solve_decision.
  Defined.

  Lemma is_rec_val v :
    is_rec (Val v) -> exists f x e, v = RecV f x e.
  Proof.
    destruct v; simpl; try contradiction.
    by intros _; eexists _, _, _.
  Qed.

  Lemma is_bool_val v :
    is_bool (Val v) -> exists b, v = LitV (LitBool b).
  Proof.
    destruct v; simpl; try contradiction.
    destruct l; simpl; try contradiction.
    by intros _; eexists.
  Qed.

  Lemma is_pair_val v :
    is_pair (Val v) -> exists v1 v2, v = PairV v1 v2.
  Proof.
    destruct v; simpl; try contradiction.
    by intros _; eexists _, _.
  Qed.

  Lemma is_inl_val v :
    is_inl (Val v) -> exists v1, v = InjLV v1.
  Proof.
    destruct v; simpl; try contradiction.
    by intros _; eexists.
  Qed.

  Lemma is_inr_val v :
    is_inr (Val v) -> exists v1, v = InjRV v1.
  Proof.
    destruct v; simpl; try contradiction.
    by intros _; eexists.
  Qed.

  Lemma is_loc_val v :
    is_loc (Val v) -> exists l, v = LitV (LitLoc l).
  Proof.
    destruct v; simpl; try contradiction.
    destruct l; simpl; try contradiction.
    by intros _; eexists.
  Qed.

  Section wp_stuck.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Implicit Types Φ : val -> iProp Σ.

    Lemma wp_stuck_var x E Φ :
      True ⊢ WP Var x @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill. destruct Ki; inversion Hfill.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep.
    Qed.

    Lemma wp_stuck_app_nrec E e1 v1 e2 v2 Φ :
      to_val e1 = Some v1 ->
      to_val e2 = Some v2 ->
      ~ is_rec e1 ->
      True ⊢ WP App e1 e2 @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv1 Hv2 Hnrec) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep; subst.
        simpl in Hv1. inversion Hv1; subst.
        apply Hnrec. simpl. exact I.
    Qed.

    Lemma wp_stuck_un_op op E e v Φ :
      to_val e = Some v ->
      un_op_eval op v = None ->
      True ⊢ WP UnOp op e @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv Heval) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inv_base_step.
    Qed.

    Lemma wp_stuck_bin_op E op e1 v1 e2 v2 Φ :
      to_val e1 = Some v1 ->
      to_val e2 = Some v2 ->
      bin_op_eval op v1 v2 = None ->
      True ⊢ WP BinOp op e1 e2 @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv1 Hv2 Heval) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inv_base_step.
    Qed.

    Lemma wp_stuck_if E e v e1 e2 Φ :
      to_val e = Some v ->
      ~ is_bool e ->
      True ⊢ WP If e e1 e2 @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv Hnbool) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep; subst.
        all: simpl in Hv; inversion Hv; subst; apply Hnbool; simpl; auto.
    Qed.

    Lemma wp_stuck_fst E e v Φ :
      to_val e = Some v ->
      ~ is_pair e ->
      True ⊢ WP Fst e @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv Hnpair) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep; subst.
        simpl in Hv. inversion Hv; subst.
        apply Hnpair. simpl. auto.
    Qed.

    Lemma wp_stuck_snd E e v Φ :
      to_val e = Some v ->
      ~ is_pair e ->
      True ⊢ WP Snd e @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv Hnpair) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep; subst.
        simpl in Hv. inversion Hv; subst.
        apply Hnpair. simpl. auto.
    Qed.

    Lemma wp_stuck_case E e v e1 e2 Φ :
      to_val e = Some v ->
      ~ (is_inl e \/ is_inr e) ->
      True ⊢ WP Case e e1 e2 @ MaybeStuck; E {{ Φ }}.
    Proof.
      iIntros (Hv Hncase) "_".
      iApply wp_lift_pure_base_stuck.
      - done.
      - eapply ectxi_language_sub_redexes_are_values.
        intros Ki e' Hfill; destruct Ki; simpl in Hfill; simplify_eq/=; eauto.
      - intros σ. split; [done|].
        intros κ e' σ' efs Hstep. inversion Hstep; subst.
        + simpl in Hv. inversion Hv; subst.
          apply Hncase. left. simpl. auto.
        + simpl in Hv. inversion Hv; subst.
          apply Hncase. right. simpl. auto.
    Qed.
  End wp_stuck.
End OCPLModernLifting.
