From Coq Require Import Bool Lia List String ZArith.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterCase.
  Import Justin.
  Import JustinExec.

  Definition counter_empty_state : state :=
    State (st_next_loc empty_state) (st_store empty_state) (st_frozen empty_state)
      (("makeCounter", VPrim "makeCounter") :: st_env empty_state)
      (st_cells empty_state) (st_dyn_prims empty_state).

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

  Definition counter_apply_prim (σ : state) (name : string) (args : list val)
    : core_expr * state :=
    if String.eqb name "makeCounter" then
      match args with
      | [] =>
          let '(v, σ') := alloc_counter σ in
          (CoreLit v, σ')
      | _ => (CoreBzzt, σ)
      end
    else
      apply_prim σ name args.

  Definition invoke_cap_method (σ : state) (cap : val) (field : string)
    : option (val * state) :=
    match cap with
    | VLoc l =>
        match lookup_obj σ l with
        | Some obj =>
            match lookup_field (obj_fields obj) field with
            | Some (VPrim name) =>
                match counter_apply_prim σ name [] with
                | (CoreLit v, σ') => Some (v, σ')
                | _ => None
                end
            | _ => None
            end
        | None => None
        end
    | _ => None
    end.

  Fixpoint counter_step (σ : state) (e : core_expr) : option (core_expr * state) :=
    match e with
    | CoreLit _ => None
    | CoreVar x =>
        match lookup_assoc x (st_env σ) with
        | Some v => Some (CoreLit v, σ)
        | None => Some (CoreBzzt, σ)
        end
    | CoreAllocObj flds =>
        match all_lit_fields flds with
        | Some vs =>
            let '(v, σ') := alloc_obj σ vs in
            Some (CoreLit v, σ')
        | None =>
            let fix step_fields flds :=
                match flds with
                | [] => None
                | (k, e1) :: rest =>
                    match counter_step σ e1 with
                    | Some (e1', σ') => Some (CoreAllocObj ((k, e1') :: rest), σ')
                    | None =>
                        match e1 with
                        | CoreLit _ =>
                            match step_fields rest with
                            | Some (CoreAllocObj rest', σ') =>
                                Some (CoreAllocObj ((k, e1) :: rest'), σ')
                            | other => other
                            end
                        | _ => None
                        end
                    end
                end
            in step_fields flds
        end
    | CoreGet e1 fld =>
        match e1 with
        | CoreLit (VLoc l) =>
            match lookup_obj σ l with
            | Some obj =>
                Some (CoreLit (match lookup_field (obj_fields obj) fld with
                               | Some v => v
                               | None => VUndefined
                               end), σ)
            | None => Some (CoreBzzt, σ)
            end
        | CoreLit _ => Some (CoreBzzt, σ)
        | _ =>
            match counter_step σ e1 with
            | Some (e1', σ') => Some (CoreGet e1' fld, σ')
            | None => None
            end
        end
    | CoreApp f args =>
        match f with
        | CoreLit (VPrim name) =>
            match all_lit args with
            | Some vs => Some (counter_apply_prim σ name vs)
            | None =>
                let fix step_args args :=
                    match args with
                    | [] => None
                    | e1 :: rest =>
                        match counter_step σ e1 with
                        | Some (e1', σ') => Some (CoreApp f (e1' :: rest), σ')
                        | None =>
                            match e1 with
                            | CoreLit _ =>
                                match step_args rest with
                                | Some (CoreApp _ rest', σ') =>
                                    Some (CoreApp f (e1 :: rest'), σ')
                                | other => other
                                end
                            | _ => None
                            end
                        end
                    end
              in step_args args
            end
        | CoreLit _ => Some (CoreBzzt, σ)
        | _ =>
            match counter_step σ f with
            | Some (f', σ') => Some (CoreApp f' args, σ')
            | None => None
            end
        end
    | CoreLetIn x rhs body =>
        match rhs with
        | CoreLit v => Some (subst x v body, σ)
        | _ =>
            match counter_step σ rhs with
            | Some (rhs', σ') => Some (CoreLetIn x rhs' body, σ')
            | None => None
            end
        end
    | CoreTypeOf e1 =>
        match e1 with
        | CoreLit v => Some (CoreLit (VJson (JStr (typeof_val v))), σ)
        | _ =>
            match counter_step σ e1 with
            | Some (e1', σ') => Some (CoreTypeOf e1', σ')
            | None => None
            end
        end
    | CoreCond e0 e1 e2 =>
        match e0 with
        | CoreLit v => Some (if truthy v then e1 else e2, σ)
        | _ =>
            match counter_step σ e0 with
            | Some (e0', σ') => Some (CoreCond e0' e1 e2, σ')
            | None => None
            end
        end
    | CoreBinop EqStrictOp e1 e2 =>
        match e1, e2 with
        | CoreLit v1, CoreLit v2 =>
            Some (CoreLit (VJson (JBool (strict_eqb v1 v2))), σ)
        | CoreLit _, _ =>
            match counter_step σ e2 with
            | Some (e2', σ') => Some (CoreBinop EqStrictOp e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match counter_step σ e1 with
            | Some (e1', σ') => Some (CoreBinop EqStrictOp e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop AddNum e1 e2 =>
        match e1, e2 with
        | CoreLit (VJson (JNum n1)), CoreLit (VJson (JNum n2)) =>
            Some (CoreLit (VJson (JNum (n1 + n2))), σ)
        | CoreLit _, _ =>
            match counter_step σ e2 with
            | Some (e2', σ') => Some (CoreBinop AddNum e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match counter_step σ e1 with
            | Some (e1', σ') => Some (CoreBinop AddNum e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop ConcatStr e1 e2 =>
        match e1, e2 with
        | CoreLit (VJson (JStr s1)), CoreLit (VJson (JStr s2)) =>
            Some (CoreLit (VJson (JStr (s1 ++ s2))), σ)
        | CoreLit _, _ =>
            match counter_step σ e2 with
            | Some (e2', σ') => Some (CoreBinop ConcatStr e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match counter_step σ e1 with
            | Some (e1', σ') => Some (CoreBinop ConcatStr e1' e2, σ')
            | None => None
            end
        end
    | CoreBzzt => None
    end.

  Fixpoint counter_normalize (fuel : nat) (σ : state) (e : core_expr)
    : core_expr * state :=
    match fuel with
    | O => (CoreBzzt, σ)
    | S fuel' =>
        match counter_step σ e with
        | Some (e', σ') =>
            match e' with
            | CoreLit _ => (e', σ')
            | CoreBzzt => (CoreBzzt, σ')
            | _ => counter_normalize fuel' σ' e'
            end
        | None => (e, σ)
        end
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
    unfold counter_apply_prim.
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
    unfold counter_apply_prim.
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
    counter_apply_prim counter_empty_state "makeCounter" [] =
      (CoreLit (VLoc 1%nat),
        State 2%nat
          [(1%nat, HeapObj [("incr", VPrim "counter.incr.z");
                            ("decr", VPrim "counter.decr.z")])]
          [1%nat]
          (st_env counter_empty_state)
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
