(* Reachability lemmas for dynamic authority in the counter case study. *)
From Coq Require Import Lia List String ZArith.
Require Import jessie_lang jessie_justin jessie_counter jessie_public.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterReach.
  Import Justin.
  Import JustinExec.
  Import JessieCounterCase.
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

  Definition dyn_is_entry (σ : state) (pid : nat) : Prop :=
    exists cell, lookup_nat_assoc pid (st_dyn_prims σ) = Some (DynCellDelta cell 1).

  Definition dyn_is_exit (σ : state) (pid : nat) : Prop :=
    exists cell, lookup_nat_assoc pid (st_dyn_prims σ) = Some (DynCellDelta cell (-1)).

  Lemma reaches_field_only_entry σ capl pid fld :
    lookup_obj σ capl =
      Some (HeapObj [("incr", VPrim (PrimDyn pid))]) ->
    reaches_val σ (VLoc capl) fld ->
    fld = VLoc capl \/ fld = VPrim (PrimDyn pid).
  Proof.
    intros Hobj Hreach.
    inversion Hreach as [w|l obj fld0 v w Hlook Hfield Hsub]; subst.
    - auto.
    - rewrite Hobj in Hlook. inversion Hlook; subst obj.
      simpl in Hfield.
      destruct (String.eqb_spec fld0 "incr").
      + inversion Hfield; subst v.
        inversion Hsub; subst; auto.
      + discriminate.
  Qed.

  Lemma reaches_field_only_exit σ capl pid fld :
    lookup_obj σ capl =
      Some (HeapObj [("decr", VPrim (PrimDyn pid))]) ->
    reaches_val σ (VLoc capl) fld ->
    fld = VLoc capl \/ fld = VPrim (PrimDyn pid).
  Proof.
    intros Hobj Hreach.
    inversion Hreach as [w|l obj fld0 v w Hlook Hfield Hsub]; subst.
    - auto.
    - rewrite Hobj in Hlook. inversion Hlook; subst obj.
      simpl in Hfield.
      destruct (String.eqb_spec fld0 "decr").
      + inversion Hfield; subst v.
        inversion Hsub; subst; auto.
      + discriminate.
  Qed.

  Lemma entry_cap_reaches_only_entry_dyn pid :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        reaches_dyn σ cap pid ->
        dyn_is_entry σ pid
    | None => False
    end.
  Proof.
    vm_compute.
    intros Hreach.
    unfold reaches_dyn in Hreach.
    pose proof (reaches_field_only_entry
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 0%nat _ eq_refl Hreach) as Hor.
    destruct Hor as [Hroot|Hdyn].
    - inversion Hroot.
    - inversion Hdyn; subst pid.
      exists 0%nat. reflexivity.
  Qed.

  Lemma exit_cap_reaches_only_exit_dyn pid :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) =>
        reaches_dyn σ cap pid ->
        dyn_is_exit σ pid
    | None => False
    end.
  Proof.
    vm_compute.
    intros Hreach.
    unfold reaches_dyn in Hreach.
    pose proof (reaches_field_only_exit
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("decr", VPrim (PrimDyn 1%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 1%nat _ eq_refl Hreach) as Hor.
    destruct Hor as [Hroot|Hdyn].
    - inversion Hroot.
    - inversion Hdyn; subst pid.
      exists 0%nat. reflexivity.
  Qed.

  Definition builtin_call (p : prim_ref) : Prop :=
    match p with
    | PrimBuiltin _ => True
    | _ => False
    end.

  Definition result_dyn (e : core_expr) (pid : nat) : Prop :=
    match e with
    | CoreVal root => reaches_dyn (State 0%nat 0%nat [] [] [] [] []) root pid
    | _ => False
    end.

  Definition conservative_builtin (name : prim_name) : Prop :=
    forall σ args root σ' pid,
      apply_prim σ (PrimBuiltin name) args = (CoreVal root, σ') ->
      reaches_dyn σ' root pid ->
      exists arg, In arg args /\ reaches_dyn σ arg pid.

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

  Lemma builtin_assert_conservative :
    conservative_builtin PrimAssert.
  Proof.
    unfold conservative_builtin.
    intros σ args root σ' pid Happ Hreach.
    destruct args as [|a args].
    - cbn in Happ. inversion Happ.
    - destruct args as [|a2 args].
      + destruct a as [l|l|p].
        * destruct l as [j|n|].
          -- destruct j.
             ++ cbn in Happ. inversion Happ.
             ++ destruct b.
                ** cbn in Happ. inversion Happ; subst; clear Happ.
                   unfold reaches_dyn in Hreach.
                   pose proof (reaches_val_from_lit _ _ _ Hreach) as Heq.
                   discriminate Heq.
                ** cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
          -- cbn in Happ. inversion Happ.
          -- cbn in Happ. inversion Happ.
        * cbn in Happ. inversion Happ.
        * cbn in Happ. inversion Happ.
      + destruct a as [l|l|p].
        * destruct l as [j|n|].
          -- destruct j.
             ++ cbn in Happ. inversion Happ.
             ++ destruct b; cbn in Happ; inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
             ++ cbn in Happ. inversion Happ.
          -- cbn in Happ. inversion Happ.
          -- cbn in Happ. inversion Happ.
        * cbn in Happ. inversion Happ.
        * cbn in Happ. inversion Happ.
  Qed.

  Lemma builtin_fail_conservative :
    conservative_builtin PrimFail.
  Proof.
    unfold conservative_builtin.
    intros σ args root σ' pid Happ _.
    simpl in Happ.
    discriminate.
  Qed.

  Lemma builtin_freeze_conservative :
    conservative_builtin PrimFreeze.
  Proof.
    unfold conservative_builtin.
    intros σ args root σ' pid Happ Hreach.
    destruct args as [|a args].
    - cbn in Happ. inversion Happ.
    - destruct args as [|a2 args].
      + cbn in Happ. inversion Happ; subst; clear Happ.
        exists root. split; [left; reflexivity|].
        eapply (reaches_dyn_same_store (freeze_shallow σ root) σ root pid).
        * apply freeze_shallow_preserves_store.
        * exact Hreach.
      + cbn in Happ. inversion Happ.
  Qed.

  Lemma builtin_harden_conservative :
    conservative_builtin PrimHarden.
  Proof.
    unfold conservative_builtin.
    intros σ args root σ' pid Happ Hreach.
    destruct args as [|a args].
    - cbn in Happ. inversion Happ.
    - destruct args as [|a2 args].
      + cbn in Happ. inversion Happ; subst; clear Happ.
        exists root. split; [left; reflexivity|].
        eapply (reaches_dyn_same_store (freeze_deep 20 σ root) σ root pid).
        * apply freeze_deep_preserves_store.
        * exact Hreach.
      + cbn in Happ. inversion Happ.
  Qed.

  Lemma builtin_id_conservative :
    conservative_builtin PrimId.
  Proof.
    unfold conservative_builtin.
    intros σ args root σ' pid Happ Hreach.
    destruct args as [|a args].
    - cbn in Happ. inversion Happ.
    - destruct args as [|a2 args].
      + change ((if hardenedb 20 σ a then (CoreVal a, σ) else (CoreBzzt, σ)) =
                  (CoreVal root, σ')) in Happ.
        destruct (hardenedb 20 σ a) eqn:Hhard.
        * cbn in Happ.
          inversion Happ; subst; clear Happ.
          exists root. split; [left; reflexivity|exact Hreach].
        * cbn in Happ.
          inversion Happ.
      + cbn in Happ. inversion Happ.
  Qed.

  Theorem builtin_conservative (name : prim_name) :
    conservative_builtin name.
  Proof.
    destruct name.
    - apply builtin_freeze_conservative.
    - apply builtin_harden_conservative.
    - apply builtin_assert_conservative.
    - apply builtin_id_conservative.
    - apply builtin_fail_conservative.
  Qed.

  Example entry_cap_root_reaches_only_incr :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) => reaches_dyn σ cap 0%nat /\ ~ reaches_dyn σ cap 1%nat
    | None => False
    end.
  Proof.
    vm_compute.
    split.
    - econstructor 2 with
        (obj := HeapObj [("incr", VPrim (PrimDyn 0%nat))])
        (fld := "incr") (v := VPrim (PrimDyn 0%nat)).
      + reflexivity.
      + reflexivity.
      + constructor.
    - intro Hbad.
      pose proof (entry_cap_reaches_only_entry_dyn 1%nat Hbad) as [cell Hlookup].
      discriminate.
  Qed.

  Example exit_cap_root_reaches_only_decr :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) => reaches_dyn σ cap 1%nat /\ ~ reaches_dyn σ cap 0%nat
    | None => False
    end.
  Proof.
    vm_compute.
    split.
    - econstructor 2 with
        (obj := HeapObj [("decr", VPrim (PrimDyn 1%nat))])
        (fld := "decr") (v := VPrim (PrimDyn 1%nat)).
      + reflexivity.
      + reflexivity.
      + constructor.
    - intro Hbad.
      pose proof (exit_cap_reaches_only_exit_dyn 0%nat Hbad) as [cell Hlookup].
      discriminate.
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
End JessieCounterReach.
