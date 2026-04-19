(* Counter-case reachability lemmas over the generic Justin reach relation. *)
From Coq Require Import Lia List String ZArith.
Require Import jessie_lang jessie_justin jessie_counter jessie_reach jessie_connectivity.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterReach.
  Import Justin.
  Import JustinExec.
  Import JessieCounterCase.
  Import JessieReach.
  Import JessieConnectivity.

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

  Example makeCounter_result_reaches_fresh_object :
    val_reaches
      state_after_makeCounter
      counter_after_makeCounter
      (CObj 1%nat).
  Proof.
    vm_compute. constructor.
  Qed.

  Example makeCounter_result_reaches_fresh_incr :
    val_reaches
      state_after_makeCounter
      counter_after_makeCounter
      (CDyn 0%nat).
  Proof.
    vm_compute.
    econstructor 2.
    - econstructor 2 with (fld := "incr") (pid := 0%nat).
      + reflexivity.
      + reflexivity.
    - constructor.
  Qed.

  Example makeCounter_result_reaches_fresh_cell :
    val_reaches
      state_after_makeCounter
      counter_after_makeCounter
      (CCell 0%nat).
  Proof.
    vm_compute.
    econstructor 2.
    - econstructor 2 with (fld := "incr") (pid := 0%nat).
      + reflexivity.
      + reflexivity.
    - econstructor 2.
      + constructor 3.
        exists 1%nat. reflexivity.
      + constructor.
  Qed.

  Example makeCounter_fresh_refs_satisfy_old_or_fresh :
    let σ := counter_empty_state in
    let '(e', σ') := counter_apply_prim σ (PrimExt 0%nat) [] in
    old_or_fresh σ σ' [] (CObj 1%nat) /\
    old_or_fresh σ σ' [] (CDyn 0%nat) /\
    old_or_fresh σ σ' [] (CDyn 1%nat) /\
    old_or_fresh σ σ' [] (CCell 0%nat).
  Proof.
    vm_compute. repeat split; now right.
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

End JessieCounterReach.
