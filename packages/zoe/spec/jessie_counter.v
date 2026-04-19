From Coq Require Import Bool Lia List String ZArith.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterCase.
  Import Justin.
  Import JustinExec.

  Definition alloc_counter_cap (σ : state) (counter : val) (field : string)
    : option (val * state) :=
    match counter with
    | VLoc l =>
        match lookup_obj σ l with
        | Some obj =>
            match lookup_field (obj_fields obj) field with
            | Some method =>
                let '(cap, σ1) := alloc_obj σ [(field, method)] in
                Some (cap, freeze_deep 20 σ1 cap)
            | None => None
            end
        | None => None
        end
    | _ => None
    end.

  Definition alloc_entry_cap (σ : state) (counter : val) : option (val * state) :=
    alloc_counter_cap σ counter "incr".

  Definition alloc_exit_cap (σ : state) (counter : val) : option (val * state) :=
    alloc_counter_cap σ counter "decr".

  Definition invoke_cap_method (σ : state) (cap : val) (field : string)
    : option (val * state) :=
    match cap with
    | VLoc l =>
        match lookup_obj σ l with
        | Some obj =>
            match lookup_field (obj_fields obj) field with
            | Some (VPrim name) =>
                match apply_prim σ name [] with
                | (CoreLit v, σ') => Some (v, σ')
                | _ => None
                end
            | _ => None
            end
        | None => None
        end
    | _ => None
    end.

  Fixpoint invoke_cap_trace (σ : state) (cap : val) (trace : list string)
    : option state :=
    match trace with
    | [] => Some σ
    | field :: trace' =>
        match invoke_cap_method σ cap field with
        | Some (_, σ') => invoke_cap_trace σ' cap trace'
        | None => None
        end
    end.

  Lemma lookup_obj_store_cell σ cell n l :
    lookup_obj (store_cell σ cell n) l = lookup_obj σ l.
  Proof. reflexivity. Qed.

  Lemma lookup_dyn_store_cell σ cell n name :
    lookup_assoc name (st_dyn_prims (store_cell σ cell n)) =
      lookup_assoc name (st_dyn_prims σ).
  Proof. reflexivity. Qed.

  Lemma store_cell_list_overwrite cells l n1 n2 :
    store_cell_list (store_cell_list cells l n1) l n2 =
      store_cell_list cells l n2.
  Proof.
    induction cells as [|[l' n'] cells IH]; simpl.
    - now rewrite Nat.eqb_refl.
    - destruct (Nat.eqb l l') eqn:Heq.
      + apply Nat.eqb_eq in Heq. subst. simpl. now rewrite Nat.eqb_refl.
      + simpl. rewrite Heq. f_equal. exact IH.
  Qed.

  Lemma store_cell_overwrite σ cell n1 n2 :
    store_cell (store_cell σ cell n1) cell n2 = store_cell σ cell n2.
  Proof.
    destruct σ as [next store frozen env cells dyn].
    unfold store_cell. simpl.
    rewrite store_cell_list_overwrite.
    reflexivity.
  Qed.

  Lemma lookup_cell_store_same σ cell n :
    lookup_cell (store_cell σ cell n) cell = Some n.
  Proof.
    unfold lookup_cell, store_cell.
    simpl.
    induction (st_cells σ) as [|[l' n'] cells IH]; simpl.
    - now rewrite Nat.eqb_refl.
    - destruct (Nat.eqb cell l') eqn:Heq.
      + apply Nat.eqb_eq in Heq. subst. simpl. now rewrite Nat.eqb_refl.
      + simpl. rewrite Heq. exact IH.
  Qed.

  Lemma store_cell_list_same cells l n :
    lookup_cell_list cells l = Some n ->
    store_cell_list cells l n = cells.
  Proof.
    induction cells as [|[l' n'] cells IH]; simpl; [discriminate|].
    destruct (Nat.eqb l l') eqn:Heq.
    - apply Nat.eqb_eq in Heq. subst.
      intros [= <-]. simpl. reflexivity.
    - intros Hlookup. simpl. f_equal. apply IH. exact Hlookup.
  Qed.

  Lemma store_cell_same_value σ cell n :
    lookup_cell σ cell = Some n ->
    store_cell σ cell n = σ.
  Proof.
    destruct σ as [next store frozen env cells dyn].
    unfold store_cell, lookup_cell. simpl.
    intros Hlookup. f_equal.
    apply store_cell_list_same. exact Hlookup.
  Qed.

  Lemma invoke_entry_cap_step σ capl cell n :
    lookup_obj σ capl =
      Some (HeapObj [("incr", VPrim (counter_incr_name cell))]) ->
    lookup_assoc (counter_incr_name cell) (st_dyn_prims σ) =
      Some (CounterIncr cell) ->
    lookup_cell σ cell = Some n ->
    invoke_cap_method σ (VLoc capl) "incr" =
      Some (VJson (JNum (n + 1)), store_cell σ cell (n + 1)).
  Proof.
    intros Hobj Hdyn Hcell.
    unfold invoke_cap_method.
    rewrite Hobj. simpl.
    unfold apply_prim.
    assert (Hmk : counter_incr_name cell <> "makeCounter"). { discriminate. }
    assert (Has : counter_incr_name cell <> "assert"). { discriminate. }
    assert (Hid : counter_incr_name cell <> "id"). { discriminate. }
    assert (Hfail : counter_incr_name cell <> "fail"). { discriminate. }
    assert (Hfreeze : counter_incr_name cell <> "freeze"). { discriminate. }
    assert (Hharden : counter_incr_name cell <> "harden"). { discriminate. }
    pose proof ((proj2 (String.eqb_neq _ _)) Hmk) as Hmkb.
    pose proof ((proj2 (String.eqb_neq _ _)) Has) as Hasb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hid) as Hidb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hfail) as Hfailb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hfreeze) as Hfreezeb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hharden) as Hhardenb.
    rewrite Hmkb.
    rewrite Hasb.
    rewrite Hidb.
    rewrite Hfailb.
    rewrite Hfreezeb.
    rewrite Hhardenb.
    rewrite Hdyn.
    rewrite Hcell.
    reflexivity.
  Qed.

  Lemma invoke_exit_cap_step σ capl cell n :
    lookup_obj σ capl =
      Some (HeapObj [("decr", VPrim (counter_decr_name cell))]) ->
    lookup_assoc (counter_decr_name cell) (st_dyn_prims σ) =
      Some (CounterDecr cell) ->
    lookup_cell σ cell = Some n ->
    invoke_cap_method σ (VLoc capl) "decr" =
      Some (VJson (JNum (n - 1)), store_cell σ cell (n - 1)).
  Proof.
    intros Hobj Hdyn Hcell.
    unfold invoke_cap_method.
    rewrite Hobj. simpl.
    unfold apply_prim.
    assert (Hmk : counter_decr_name cell <> "makeCounter"). { discriminate. }
    assert (Has : counter_decr_name cell <> "assert"). { discriminate. }
    assert (Hid : counter_decr_name cell <> "id"). { discriminate. }
    assert (Hfail : counter_decr_name cell <> "fail"). { discriminate. }
    assert (Hfreeze : counter_decr_name cell <> "freeze"). { discriminate. }
    assert (Hharden : counter_decr_name cell <> "harden"). { discriminate. }
    pose proof ((proj2 (String.eqb_neq _ _)) Hmk) as Hmkb.
    pose proof ((proj2 (String.eqb_neq _ _)) Has) as Hasb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hid) as Hidb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hfail) as Hfailb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hfreeze) as Hfreezeb.
    pose proof ((proj2 (String.eqb_neq _ _)) Hharden) as Hhardenb.
    rewrite Hmkb.
    rewrite Hasb.
    rewrite Hidb.
    rewrite Hfailb.
    rewrite Hfreezeb.
    rewrite Hhardenb.
    rewrite Hdyn.
    rewrite Hcell.
    reflexivity.
  Qed.

  Lemma invoke_entry_cap_other_none σ capl cell field :
    lookup_obj σ capl =
      Some (HeapObj [("incr", VPrim (counter_incr_name cell))]) ->
    field <> "incr" ->
    invoke_cap_method σ (VLoc capl) field = None.
  Proof.
    intros Hobj Hneq.
    unfold invoke_cap_method.
    rewrite Hobj. simpl.
    destruct (String.eqb field "incr") eqn:Heq.
    - apply String.eqb_eq in Heq. subst field. contradiction.
    - reflexivity.
  Qed.

  Lemma invoke_exit_cap_other_none σ capl cell field :
    lookup_obj σ capl =
      Some (HeapObj [("decr", VPrim (counter_decr_name cell))]) ->
    field <> "decr" ->
    invoke_cap_method σ (VLoc capl) field = None.
  Proof.
    intros Hobj Hneq.
    unfold invoke_cap_method.
    rewrite Hobj. simpl.
    destruct (String.eqb field "decr") eqn:Heq.
    - apply String.eqb_eq in Heq. subst field. contradiction.
    - reflexivity.
  Qed.

  Example makeCounter_allocates_hardened_object_with_methods :
    apply_prim empty_state "makeCounter" [] =
      (CoreLit (VLoc 1%nat),
        State 2%nat
          [(1%nat, HeapObj [("incr", VPrim "counter.incr.z");
                            ("decr", VPrim "counter.decr.z")])]
          [1%nat]
          (st_env empty_state)
          [(0%nat, 0)]
          [("counter.incr.z", CounterIncr 0%nat);
           ("counter.decr.z", CounterDecr 0%nat)]).
  Proof. reflexivity. Qed.

  Example counter_methods_update_private_cell :
    let σ1 := State 2%nat
      [(1%nat, HeapObj [("incr", VPrim "counter.incr.z");
                        ("decr", VPrim "counter.decr.z")])]
      [1%nat]
      (st_env empty_state)
      [(0%nat, 0)]
      [("counter.incr.z", CounterIncr 0%nat);
       ("counter.decr.z", CounterDecr 0%nat)] in
    apply_prim σ1 "counter.incr.z" [] =
      (CoreLit (VJson (JNum 1)),
        State 2%nat
          [(1%nat, HeapObj [("incr", VPrim "counter.incr.z");
                            ("decr", VPrim "counter.decr.z")])]
          [1%nat]
          (st_env empty_state)
          [(0%nat, 1)]
          [("counter.incr.z", CounterIncr 0%nat);
           ("counter.decr.z", CounterDecr 0%nat)]).
  Proof. reflexivity. Qed.
End JessieCounterCase.
