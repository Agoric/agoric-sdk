(* Generic reachability lemmas for dynamic authority in the Justin core. *)
From Coq Require Import Lia List String ZArith.
Require Import jessie_lang jessie_lib jessie_justin jessie_public.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieReach.
  Import Justin.
  Import JessieLib.
  Import JustinExec.
  Import JessiePublic.

  Inductive reaches_val (σ : state) : val -> val -> Prop :=
  | ReachesRefl v :
      reaches_val σ v v
  | ReachesField l obj fld v w :
      lookup_obj σ l = Some obj ->
      lookup_field (obj_fields obj) fld = Some v ->
      reaches_val σ v w ->
      reaches_val σ (VLoc l) w.

  Definition reaches_dyn (σ : state) (root : val) (pid : nat) : Prop :=
    reaches_val σ root (VPrim (PrimDyn pid)).

  Lemma reaches_val_same_store σ σ' root target :
    st_store σ = st_store σ' ->
    reaches_val σ root target ->
    reaches_val σ' root target.
  Proof.
    intros Hstore Hreach.
    induction Hreach as [v|l obj fld v w Hlook Hfield Hsub IH].
    - constructor.
    - econstructor 2.
      + destruct σ as [next prim store frozen env cells dyn].
        destruct σ' as [next' prim' store' frozen' env' cells' dyn'].
        simpl in *. subst store'. exact Hlook.
      + exact Hfield.
      + exact IH.
  Qed.

  Lemma mark_frozen_preserves_store σ l :
    st_store (mark_frozen σ l) = st_store σ.
  Proof.
    unfold mark_frozen.
    destruct (existsb (Nat.eqb l) (st_frozen σ)); reflexivity.
  Qed.

  Lemma freeze_shallow_preserves_store σ v :
    st_store (freeze_shallow σ v) = st_store σ.
  Proof.
    destruct v; simpl; try reflexivity.
    apply mark_frozen_preserves_store.
  Qed.

  Lemma freeze_deep_preserves_store fuel σ v :
    st_store (freeze_deep fuel σ v) = st_store σ.
  Proof.
    revert σ v.
    induction fuel as [|fuel IH]; intros σ v; simpl; [reflexivity|].
    destruct v; try reflexivity.
    remember (mark_frozen σ l) as σ1 eqn:Hσ1.
    assert (Hstore1 : st_store σ1 = st_store σ).
    { subst σ1. apply mark_frozen_preserves_store. }
    destruct (lookup_obj σ1 l) as [obj|] eqn:Hobj; [|exact Hstore1].
    assert (Hfold : forall flds σ0,
      st_store (fold_left (fun σacc (kv : string * val) => freeze_deep fuel σacc (snd kv)) flds σ0) =
      st_store σ0).
    {
      intros flds.
      induction flds as [|[k w] rest IHrest]; intros σ0; simpl.
      - reflexivity.
      - transitivity (st_store (freeze_deep fuel σ0 w)).
        + apply IHrest.
        + apply IH.
    }
    rewrite Hfold.
    exact Hstore1.
  Qed.

  Lemma reaches_dyn_same_store σ σ' root pid :
    st_store σ = st_store σ' ->
    reaches_dyn σ root pid ->
    reaches_dyn σ' root pid.
  Proof.
    unfold reaches_dyn.
    intros Hstore Hreach.
    eapply reaches_val_same_store; eauto.
  Qed.

  Lemma reaches_val_from_lit σ l target :
    reaches_val σ (VLit l) target ->
    target = VLit l.
  Proof.
    intro Hreach.
    inversion Hreach; subst; reflexivity.
  Qed.

  Definition conservative_builtin (name : prim_name) : Prop :=
    JessieLib.conservative_builtin
      (VLit LUndefined)
      freeze_shallow
      freeze_deep
      hardenedb
      (fun v =>
         match v with
         | VLit (LJson (JBool true)) => true
         | _ => false
         end)
      (fun v σ' => (CoreVal v, σ'))
      (fun σ' => (CoreBzzt, σ'))
      reaches_dyn
      name.

  Lemma builtin_assert_conservative :
    conservative_builtin PrimAssert.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_assert_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
    - intros σ pid Hreach.
      unfold reaches_dyn in Hreach.
      pose proof (reaches_val_from_lit _ _ _ Hreach) as Heq.
      discriminate Heq.
  Qed.

  Lemma builtin_fail_conservative :
    conservative_builtin PrimFail.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_fail_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
  Qed.

  Lemma builtin_freeze_conservative :
    conservative_builtin PrimFreeze.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_freeze_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
    - intros σ v pid Hreach.
      eapply (reaches_dyn_same_store (freeze_shallow σ v) σ v pid).
      + apply freeze_shallow_preserves_store.
      + exact Hreach.
  Qed.

  Lemma builtin_harden_conservative :
    conservative_builtin PrimHarden.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_harden_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
    - intros σ v pid Hreach.
      eapply (reaches_dyn_same_store (freeze_deep 20 σ v) σ v pid).
      + apply freeze_deep_preserves_store.
      + exact Hreach.
  Qed.

  Lemma builtin_id_conservative :
    conservative_builtin PrimId.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_id_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
  Qed.

  Theorem builtin_conservative (name : prim_name) :
    conservative_builtin name.
  Proof.
    unfold conservative_builtin.
    eapply JessieLib.builtin_conservative.
    - intros v σ v' σ' Heq. inversion Heq. auto.
    - intros σ v σ' Hbad. discriminate Hbad.
    - intros σ pid Hreach.
      unfold reaches_dyn in Hreach.
      pose proof (reaches_val_from_lit _ _ _ Hreach) as Heq.
      discriminate Heq.
    - intros σ v pid Hreach.
      eapply (reaches_dyn_same_store (freeze_shallow σ v) σ v pid).
      + apply freeze_shallow_preserves_store.
      + exact Hreach.
    - intros σ v pid Hreach.
      eapply (reaches_dyn_same_store (freeze_deep 20 σ v) σ v pid).
      + apply freeze_deep_preserves_store.
      + exact Hreach.
  Qed.

  Example public_compile_contains_no_dyn (e : JessiePublic.expr) :
    forall pid,
      JessiePublic.compile e <> CoreVal (VPrim (PrimDyn pid)).
  Proof.
    induction e; intros pid Hc; simpl in Hc; discriminate.
  Qed.

  Example freeze_is_conservative :
    conservative_builtin PrimFreeze.
  Proof. apply builtin_conservative. Qed.

  Example harden_is_conservative :
    conservative_builtin PrimHarden.
  Proof. apply builtin_conservative. Qed.

  Example assert_is_conservative :
    conservative_builtin PrimAssert.
  Proof. apply builtin_conservative. Qed.

  Example id_is_conservative :
    conservative_builtin PrimId.
  Proof. apply builtin_conservative. Qed.

  Example fail_is_conservative :
    conservative_builtin PrimFail.
  Proof. apply builtin_conservative. Qed.
End JessieReach.
