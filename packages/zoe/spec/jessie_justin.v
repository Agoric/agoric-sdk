From Coq Require Import Bool Lia List String ZArith.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JustinExec.
  Import Justin.

  Record heap_obj := HeapObj {
    obj_fields : list (string * val)
  }.

  Inductive prim_name :=
  | PrimFreeze
  | PrimHarden
  | PrimMakeCounter
  | PrimAssert
  | PrimId
  | PrimFail.

  Record prim := Prim {
    prim_name_of : prim_name;
    prim_arity : nat
  }.

  Inductive dyn_prim :=
  | CounterIncr (cell : loc)
  | CounterDecr (cell : loc).

  Record state := State {
    st_next_loc : loc;
    st_store : list (loc * heap_obj);
    st_frozen : list loc;
    st_env : list (string * val);
    st_cells : list (loc * Z);
    st_dyn_prims : list (string * dyn_prim)
  }.

  Definition empty_state : state :=
    State 0%nat [] [] [
      ("freeze", VPrim "freeze");
      ("harden", VPrim "harden");
      ("makeCounter", VPrim "makeCounter");
      ("assert", VPrim "assert");
      ("id", VPrim "id");
      ("fail", VPrim "fail")
    ] [] [].

  Fixpoint lookup_assoc {A : Type} (x : string) (xs : list (string * A)) : option A :=
    match xs with
    | [] => None
    | (y, a) :: xs' => if String.eqb x y then Some a else lookup_assoc x xs'
    end.

  Fixpoint lookup_obj_list (store : list (loc * heap_obj)) (l : loc) : option heap_obj :=
    match store with
    | [] => None
    | (l', obj) :: rest =>
        if Nat.eqb l l' then Some obj else lookup_obj_list rest l
    end.

  Definition lookup_obj (σ : state) (l : loc) : option heap_obj :=
    lookup_obj_list (st_store σ) l.

  Fixpoint lookup_cell_list (cells : list (loc * Z)) (l : loc) : option Z :=
    match cells with
    | [] => None
    | (l', n) :: rest =>
        if Nat.eqb l l' then Some n else lookup_cell_list rest l
    end.

  Definition lookup_cell (σ : state) (l : loc) : option Z :=
    lookup_cell_list (st_cells σ) l.

  Fixpoint store_cell_list (cells : list (loc * Z)) (l : loc) (n : Z)
    : list (loc * Z) :=
    match cells with
    | [] => [(l, n)]
    | (l', n') :: rest =>
        if Nat.eqb l l' then (l, n) :: rest
        else (l', n') :: store_cell_list rest l n
    end.

  Definition store_cell (σ : state) (l : loc) (n : Z) : state :=
    State (st_next_loc σ) (st_store σ) (st_frozen σ) (st_env σ)
      (store_cell_list (st_cells σ) l n) (st_dyn_prims σ).

  Fixpoint nat_tag (n : nat) : string :=
    match n with
    | O => "z"
    | S n' => "s" ++ nat_tag n'
    end.

  Definition counter_incr_name (l : loc) : string :=
    "counter.incr." ++ nat_tag l.

  Definition counter_decr_name (l : loc) : string :=
    "counter.decr." ++ nat_tag l.

  Fixpoint lookup_field (flds : list (string * val)) (k : string) : option val :=
    match flds with
    | [] => None
    | (k', v) :: flds' => if String.eqb k k' then Some v else lookup_field flds' k
    end.

  Definition mark_frozen (σ : state) (l : loc) : state :=
    if existsb (Nat.eqb l) (st_frozen σ) then σ
    else State (st_next_loc σ) (st_store σ) (l :: st_frozen σ) (st_env σ)
      (st_cells σ) (st_dyn_prims σ).

  Fixpoint hardenedb (fuel : nat) (σ : state) (v : val) : bool :=
    match fuel with
    | O => false
    | S fuel' =>
        match v with
        | VJson _ => true
        | VBigInt _ => true
        | VUndefined => true
        | VPrim _ => true
        | VLoc l =>
            existsb (Nat.eqb l) (st_frozen σ) &&
            match lookup_obj σ l with
            | Some obj =>
                forallb (fun kv => hardenedb fuel' σ (snd kv)) (obj_fields obj)
            | None => false
            end
        end
    end.

  Fixpoint freeze_deep (fuel : nat) (σ : state) (v : val) : state :=
    match fuel with
    | O => σ
    | S fuel' =>
        match v with
        | VLoc l =>
            let σ1 := mark_frozen σ l in
            match lookup_obj σ1 l with
            | Some obj =>
                fold_left (fun σacc kv => freeze_deep fuel' σacc (snd kv))
                  (obj_fields obj) σ1
            | None => σ1
            end
        | _ => σ
        end
    end.

  Definition freeze_shallow (σ : state) (v : val) : state :=
    match v with
    | VLoc l => mark_frozen σ l
    | _ => σ
    end.

  Definition strict_eqb (v1 v2 : val) : bool :=
    match v1, v2 with
    | VUndefined, VUndefined => true
    | VBigInt n1, VBigInt n2 => Z.eqb n1 n2
    | VPrim x, VPrim y => String.eqb x y
    | VLoc l1, VLoc l2 => Nat.eqb l1 l2
    | VJson JNull, VJson JNull => true
    | VJson (JBool b1), VJson (JBool b2) => Bool.eqb b1 b2
    | VJson (JNum n1), VJson (JNum n2) => Z.eqb n1 n2
    | VJson (JStr s1), VJson (JStr s2) => String.eqb s1 s2
    | _, _ => false
    end.

  Definition truthy (v : val) : bool :=
    match v with
    | VUndefined => false
    | VBigInt n => negb (Z.eqb n 0)
    | VJson JNull => false
    | VJson (JBool b) => b
    | VJson (JNum n) => negb (Z.eqb n 0)
    | VJson (JStr s) => negb (String.eqb s "")
    | VJson (JArr _) => true
    | VJson (JObj _) => true
    | VLoc _ => true
    | VPrim _ => true
    end.

  Fixpoint subst (x : string) (v : val) (e : core_expr) : core_expr :=
    match e with
    | CoreLit w => CoreLit w
    | CoreVar y => if String.eqb x y then CoreLit v else CoreVar y
    | CoreAllocObj flds =>
        CoreAllocObj (map (fun kv => (fst kv, subst x v (snd kv))) flds)
    | CoreGet e1 fld => CoreGet (subst x v e1) fld
    | CoreApp f args => CoreApp (subst x v f) (map (subst x v) args)
    | CoreLetIn y rhs body =>
        CoreLetIn y (subst x v rhs)
          (if String.eqb x y then body else subst x v body)
    | CoreTypeOf e1 => CoreTypeOf (subst x v e1)
    | CoreCond e0 e1 e2 => CoreCond (subst x v e0) (subst x v e1) (subst x v e2)
    | CoreBinop op e1 e2 => CoreBinop op (subst x v e1) (subst x v e2)
    | CoreBzzt => CoreBzzt
    end.

  Fixpoint all_lit (es : list core_expr) : option (list val) :=
    match es with
    | [] => Some []
    | CoreLit v :: es' =>
        match all_lit es' with
        | Some vs => Some (v :: vs)
        | None => None
        end
    | _ => None
    end.

  Fixpoint all_lit_fields (flds : list (string * core_expr))
    : option (list (string * val)) :=
    match flds with
    | [] => Some []
    | (k, CoreLit v) :: flds' =>
        match all_lit_fields flds' with
        | Some vs => Some ((k, v) :: vs)
        | None => None
        end
    | _ => None
    end.

  Definition alloc_obj (σ : state) (flds : list (string * val)) : val * state :=
    let l := st_next_loc σ in
    let obj := HeapObj flds in
    (VLoc l,
      State (S l) ((l, obj) :: st_store σ) (st_frozen σ) (st_env σ)
        (st_cells σ) (st_dyn_prims σ)).

  Definition alloc_counter (σ : state) : val * state :=
    let cell := st_next_loc σ in
    let obj := S cell in
    let incr := counter_incr_name cell in
    let decr := counter_decr_name cell in
    let rec := HeapObj [("incr", VPrim incr); ("decr", VPrim decr)] in
    let σ' := State (S obj)
      ((obj, rec) :: st_store σ)
      (obj :: st_frozen σ)
      (st_env σ)
      ((cell, 0) :: st_cells σ)
      ((incr, CounterIncr cell) :: (decr, CounterDecr cell) :: st_dyn_prims σ)
    in
    (VLoc obj, σ').

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

  Definition apply_prim (σ : state) (name : string) (args : list val)
    : core_expr * state :=
    if String.eqb name "makeCounter" then
      match args with
      | [] =>
          let '(v, σ') := alloc_counter σ in
          (CoreLit v, σ')
      | _ => (CoreBzzt, σ)
      end
    else if String.eqb name "assert" then
      match args with
      | [VJson (JBool true)] => (CoreLit VUndefined, σ)
      | [VJson (JBool false)] => (CoreBzzt, σ)
      | _ => (CoreBzzt, σ)
      end
    else if String.eqb name "id" then
      match args with
      | [v] =>
          if hardenedb 20 σ v then (CoreLit v, σ) else (CoreBzzt, σ)
      | _ => (CoreBzzt, σ)
      end
    else if String.eqb name "fail" then
      (CoreBzzt, σ)
    else if String.eqb name "freeze" then
      match args with
      | [v] =>
          let σ' := freeze_shallow σ v in
          (CoreLit v, σ')
      | _ => (CoreBzzt, σ)
      end
    else if String.eqb name "harden" then
      match args with
      | [v] =>
          let σ' := freeze_deep 20 σ v in
          (CoreLit v, σ')
      | _ => (CoreBzzt, σ)
      end
    else
      match lookup_assoc name (st_dyn_prims σ) with
      | Some (CounterIncr cell) =>
          match args, lookup_cell σ cell with
          | [], Some n =>
              let n' := n + 1 in
              (CoreLit (VJson (JNum n')), store_cell σ cell n')
          | _, _ => (CoreBzzt, σ)
          end
      | Some (CounterDecr cell) =>
          match args, lookup_cell σ cell with
          | [], Some n =>
              let n' := n - 1 in
              (CoreLit (VJson (JNum n')), store_cell σ cell n')
          | _, _ => (CoreBzzt, σ)
          end
      | None => (CoreBzzt, σ)
      end.

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

  Fixpoint step (σ : state) (e : core_expr) : option (core_expr * state) :=
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
                    match step σ e1 with
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
            match step σ e1 with
            | Some (e1', σ') => Some (CoreGet e1' fld, σ')
            | None => None
            end
        end
    | CoreApp f args =>
        match f with
        | CoreLit (VPrim name) =>
            match all_lit args with
            | Some vs => Some (apply_prim σ name vs)
            | None =>
                let fix step_args args :=
                    match args with
                    | [] => None
                    | e1 :: rest =>
                        match step σ e1 with
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
            match step σ f with
            | Some (f', σ') => Some (CoreApp f' args, σ')
            | None => None
            end
        end
    | CoreLetIn x rhs body =>
        match rhs with
        | CoreLit v => Some (subst x v body, σ)
        | _ =>
            match step σ rhs with
            | Some (rhs', σ') => Some (CoreLetIn x rhs' body, σ')
            | None => None
            end
        end
    | CoreTypeOf e1 =>
        match e1 with
        | CoreLit v => Some (CoreLit (VJson (JStr (typeof_val v))), σ)
        | _ =>
            match step σ e1 with
            | Some (e1', σ') => Some (CoreTypeOf e1', σ')
            | None => None
            end
        end
    | CoreCond e0 e1 e2 =>
        match e0 with
        | CoreLit v => Some (if truthy v then e1 else e2, σ)
        | _ =>
            match step σ e0 with
            | Some (e0', σ') => Some (CoreCond e0' e1 e2, σ')
            | None => None
            end
        end
    | CoreBinop EqStrictOp e1 e2 =>
        match e1, e2 with
        | CoreLit v1, CoreLit v2 =>
            Some (CoreLit (VJson (JBool (strict_eqb v1 v2))), σ)
        | CoreLit _, _ =>
            match step σ e2 with
            | Some (e2', σ') => Some (CoreBinop EqStrictOp e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step σ e1 with
            | Some (e1', σ') => Some (CoreBinop EqStrictOp e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop AddNum e1 e2 =>
        match e1, e2 with
        | CoreLit (VJson (JNum n1)), CoreLit (VJson (JNum n2)) =>
            Some (CoreLit (VJson (JNum (n1 + n2))), σ)
        | CoreLit _, _ =>
            match step σ e2 with
            | Some (e2', σ') => Some (CoreBinop AddNum e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step σ e1 with
            | Some (e1', σ') => Some (CoreBinop AddNum e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop ConcatStr e1 e2 =>
        match e1, e2 with
        | CoreLit (VJson (JStr s1)), CoreLit (VJson (JStr s2)) =>
            Some (CoreLit (VJson (JStr (s1 ++ s2))), σ)
        | CoreLit _, _ =>
            match step σ e2 with
            | Some (e2', σ') => Some (CoreBinop ConcatStr e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step σ e1 with
            | Some (e1', σ') => Some (CoreBinop ConcatStr e1' e2, σ')
            | None => None
            end
        end
    | CoreBzzt => None
    end.

  Definition run1 (e : core_expr) : option (core_expr * state) :=
    step empty_state e.

  Example typeof_undefined_steps :
    run1 (CoreTypeOf (CoreLit VUndefined)) =
      Some (CoreLit (VJson (JStr "undefined")), empty_state).
  Proof. reflexivity. Qed.

  Example typeof_null_is_object :
    run1 (CoreTypeOf (CoreLit (VJson JNull))) =
      Some (CoreLit (VJson (JStr "object")), empty_state).
  Proof. reflexivity. Qed.

  Example typeof_bigint_steps :
    run1 (CoreTypeOf (CoreLit (VBigInt 12))) =
      Some (CoreLit (VJson (JStr "bigint")), empty_state).
  Proof. reflexivity. Qed.

  Example cond_string_truthy :
    run1 (CoreCond (CoreLit (VJson (JStr "x")))
      (CoreLit (VJson (JNum 1))) (CoreLit (VJson (JNum 0)))) =
      Some (CoreLit (VJson (JNum 1)), empty_state).
  Proof. reflexivity. Qed.

  Example eq_empty_objects_allocates_distinct_locs :
    run1 (CoreBinop EqStrictOp
      (CoreAllocObj [])
      (CoreAllocObj [])) =
      Some (CoreBinop EqStrictOp (CoreLit (VLoc 0%nat)) (CoreAllocObj []),
        State 1%nat [(0%nat, HeapObj [])] [] (st_env empty_state)
          (st_cells empty_state) (st_dyn_prims empty_state)).
  Proof. reflexivity. Qed.

  Example freeze_shallow_marks_only_root :
    let σ1 := State 2%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [] (st_env empty_state) [] [] in
    apply_prim σ1 "freeze" [VLoc 0%nat] =
      (CoreLit (VLoc 0%nat),
        State 2%nat
          [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
          [0%nat] (st_env empty_state) [] []).
  Proof. reflexivity. Qed.

  Example harden_deep_marks_reachable_objects :
    let σ1 := State 2%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [] (st_env empty_state) [] [] in
    apply_prim σ1 "harden" [VLoc 0%nat] =
      (CoreLit (VLoc 0%nat),
        State 2%nat
          [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
          [1%nat; 0%nat] (st_env empty_state) [] []).
  Proof. reflexivity. Qed.

  Example id_rejects_shallow_frozen_nested_object :
    let σ1 := State 2%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [0%nat] (st_env empty_state) [] [] in
    apply_prim σ1 "id" [VLoc 0%nat] = (CoreBzzt, σ1).
  Proof. reflexivity. Qed.

  Example id_accepts_hardened_nested_object :
    let σ1 := State 2%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [1%nat; 0%nat] (st_env empty_state) [] [] in
    apply_prim σ1 "id" [VLoc 0%nat] = (CoreLit (VLoc 0%nat), σ1).
  Proof. reflexivity. Qed.

  Example id_rejects_unhardened_object :
    let σ1 := State 1%nat [(0%nat, HeapObj [])] [] (st_env empty_state) [] [] in
    apply_prim σ1 "id" [VLoc 0%nat] = (CoreBzzt, σ1).
  Proof. reflexivity. Qed.

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
End JustinExec.
