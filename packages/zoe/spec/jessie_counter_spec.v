(* Trace-level authority theorems for the counter case study. *)
From Coq Require Import Lia List String ZArith.
Require Import jessie_lang jessie_justin jessie_counter.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterSpec.
  Import Justin.
  Import JustinExec.
  Import JessieCounterCase.

  Lemma invoke_entry_cap_trace_exact σ capl pid cell n trace σ' :
    lookup_obj σ capl =
      Some (HeapObj [("incr", VPrim (PrimDyn pid))]) ->
    lookup_nat_assoc pid (st_dyn_prims σ) =
      Some (DynCellDelta cell 1) ->
    lookup_cell σ cell = Some n ->
    invoke_cap_trace σ (VLoc capl) trace = Some σ' ->
    Forall (fun field => field = "incr") trace /\
    lookup_cell σ' cell = Some (n + Z.of_nat (length trace)).
  Proof.
    revert σ capl pid cell n σ'.
    induction trace as [|field trace IH];
      intros σ capl pid cell n σ' Hobj Hdyn Hcell Htrace.
    - simpl in Htrace. inversion Htrace; subst. split.
      + constructor.
      + rewrite Nat2Z.inj_0.
        rewrite Z.add_0_r.
        exact Hcell.
    - cbn [invoke_cap_trace] in Htrace.
      destruct (String.eqb_spec field "incr") as [->|Hneq].
      + pose proof (invoke_entry_cap_step σ capl pid cell n Hobj Hdyn Hcell) as Hstep.
        rewrite Hstep in Htrace.
        simpl in Htrace.
        assert (Hobj' :
          lookup_obj (store_cell σ cell (n + 1)) capl =
            Some (HeapObj [("incr", VPrim (PrimDyn pid))])).
        { rewrite lookup_obj_store_cell. exact Hobj. }
        assert (Hdyn' :
          lookup_nat_assoc pid (st_dyn_prims (store_cell σ cell (n + 1))) =
            Some (DynCellDelta cell 1)).
        { rewrite lookup_dyn_store_cell. exact Hdyn. }
        destruct (IH (store_cell σ cell (n + 1)) capl pid cell (n + 1) σ'
          Hobj'
          Hdyn'
          (lookup_cell_store_same σ cell (n + 1))
          Htrace) as [Hall Hlookup].
        split.
        * constructor; [reflexivity|exact Hall].
        * rewrite Hlookup.
          assert (n + 1 + Z.of_nat (length trace) =
                  n + Z.of_nat (length ("incr" :: trace))) as ->.
          { simpl. lia. }
          reflexivity.
      + rewrite (invoke_entry_cap_other_none _ _ _ _ Hobj Hneq) in Htrace.
        simpl in Htrace.
        discriminate.
  Qed.

  Lemma invoke_exit_cap_trace_exact σ capl pid cell n trace σ' :
    lookup_obj σ capl =
      Some (HeapObj [("decr", VPrim (PrimDyn pid))]) ->
    lookup_nat_assoc pid (st_dyn_prims σ) =
      Some (DynCellDelta cell (-1)) ->
    lookup_cell σ cell = Some n ->
    invoke_cap_trace σ (VLoc capl) trace = Some σ' ->
    Forall (fun field => field = "decr") trace /\
    lookup_cell σ' cell = Some (n - Z.of_nat (length trace)).
  Proof.
    revert σ capl pid cell n σ'.
    induction trace as [|field trace IH];
      intros σ capl pid cell n σ' Hobj Hdyn Hcell Htrace.
    - simpl in Htrace. inversion Htrace; subst. split.
      + constructor.
      + rewrite Nat2Z.inj_0.
        rewrite Z.sub_0_r.
        exact Hcell.
    - cbn [invoke_cap_trace] in Htrace.
      destruct (String.eqb_spec field "decr") as [->|Hneq].
      + pose proof (invoke_exit_cap_step σ capl pid cell n Hobj Hdyn Hcell) as Hstep.
        rewrite Hstep in Htrace.
        simpl in Htrace.
        assert (Hobj' :
          lookup_obj (store_cell σ cell (n - 1)) capl =
            Some (HeapObj [("decr", VPrim (PrimDyn pid))])).
        { rewrite lookup_obj_store_cell. exact Hobj. }
        assert (Hdyn' :
          lookup_nat_assoc pid (st_dyn_prims (store_cell σ cell (n - 1))) =
            Some (DynCellDelta cell (-1))).
        { rewrite lookup_dyn_store_cell. exact Hdyn. }
        destruct (IH (store_cell σ cell (n - 1)) capl pid cell (n - 1) σ'
          Hobj'
          Hdyn'
          (lookup_cell_store_same σ cell (n - 1))
          Htrace) as [Hall Hlookup].
        split.
        * constructor; [reflexivity|exact Hall].
        * rewrite Hlookup.
          assert ((n - 1) - Z.of_nat (length trace) =
                  n - Z.of_nat (length ("decr" :: trace))) as ->.
          { simpl. lia. }
          reflexivity.
      + rewrite (invoke_exit_cap_other_none _ _ _ _ Hobj Hneq) in Htrace.
        simpl in Htrace.
        discriminate.
  Qed.

  Lemma entry_cap_trace_monotone trace σ' :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        lookup_cell σ' 0%nat = Some (Z.of_nat (length trace))
    | None => False
    end.
  Proof.
    vm_compute.
    intros Htrace.
    pose proof (invoke_entry_cap_trace_exact
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 0%nat 0%nat 0 trace σ' eq_refl eq_refl eq_refl Htrace) as [_ Hcell].
    exact Hcell.
  Qed.

  Lemma exit_cap_trace_monotone trace σ' :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        lookup_cell σ' 0%nat = Some (- Z.of_nat (length trace))
    | None => False
    end.
  Proof.
    vm_compute.
    intros Htrace.
    pose proof (invoke_exit_cap_trace_exact
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("decr", VPrim (PrimDyn 1%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 1%nat 0%nat 0 trace σ' eq_refl eq_refl eq_refl Htrace) as [_ Hcell].
    exact Hcell.
  Qed.

  Corollary entry_cap_trace_nonnegative trace σ' :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        exists n, lookup_cell σ' 0%nat = Some n /\ 0 <= n
    | None => False
    end.
  Proof.
    intros Htrace.
    exists (Z.of_nat (length trace)).
    split.
    - now apply entry_cap_trace_monotone.
    - apply Nat2Z.is_nonneg.
  Qed.

  Corollary exit_cap_trace_nonpositive trace σ' :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        exists n, lookup_cell σ' 0%nat = Some n /\ n <= 0
    | None => False
    end.
  Proof.
    intros Htrace.
    exists (- Z.of_nat (length trace)).
    split.
    - now apply exit_cap_trace_monotone.
    - lia.
  Qed.

  Corollary entry_cap_trace_fields_are_incr trace σ' :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        Forall (fun field => field = "incr") trace
    | None => False
    end.
  Proof.
    vm_compute.
    intros Htrace.
    pose proof (invoke_entry_cap_trace_exact
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 0%nat 0%nat 0 trace σ' eq_refl eq_refl eq_refl Htrace) as [Hall _].
    exact Hall.
  Qed.

  Corollary exit_cap_trace_fields_are_decr trace σ' :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) =>
        invoke_cap_trace σ cap trace = Some σ' ->
        Forall (fun field => field = "decr") trace
    | None => False
    end.
  Proof.
    vm_compute.
    intros Htrace.
    pose proof (invoke_exit_cap_trace_exact
      (State 3%nat 2%nat
         [(2%nat, HeapObj [("decr", VPrim (PrimDyn 1%nat))]);
          (1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                           ("decr", VPrim (PrimDyn 1%nat))])]
         [2%nat; 1%nat]
         (st_env counter_empty_state)
         [(0%nat, 0)]
         [(0%nat, DynCellDelta 0%nat 1); (1%nat, DynCellDelta 0%nat (-1))])
      2%nat 1%nat 0%nat 0 trace σ' eq_refl eq_refl eq_refl Htrace) as [Hall _].
    exact Hall.
  Qed.
End JessieCounterSpec.
