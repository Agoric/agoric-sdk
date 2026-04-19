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

  Inductive dyn_prim :=
  | CounterIncr (cell : loc)
  | CounterDecr (cell : loc).

  Record state := State {
    st_next_loc : loc;
    st_next_prim : nat;
    st_store : list (loc * heap_obj);
    st_frozen : list loc;
    st_env : list (string * val);
    st_cells : list (loc * Z);
    st_dyn_prims : list (nat * dyn_prim)
  }.

  Definition empty_state : state :=
    State 0%nat 0%nat [] [] [
      ("freeze", VPrim (PrimBuiltin PrimFreeze));
      ("harden", VPrim (PrimBuiltin PrimHarden));
      ("assert", VPrim (PrimBuiltin PrimAssert));
      ("id", VPrim (PrimBuiltin PrimId));
      ("fail", VPrim (PrimBuiltin PrimFail))
    ] [] [].

  Fixpoint lookup_assoc {A : Type} (x : string) (xs : list (string * A)) : option A :=
    match xs with
    | [] => None
    | (y, a) :: xs' => if String.eqb x y then Some a else lookup_assoc x xs'
    end.

  Fixpoint lookup_nat_assoc {A : Type} (x : nat) (xs : list (nat * A)) : option A :=
    match xs with
    | [] => None
    | (y, a) :: xs' => if Nat.eqb x y then Some a else lookup_nat_assoc x xs'
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
    State (st_next_loc σ) (st_next_prim σ) (st_store σ) (st_frozen σ) (st_env σ)
      (store_cell_list (st_cells σ) l n) (st_dyn_prims σ).

  Fixpoint lookup_field (flds : list (string * val)) (k : string) : option val :=
    match flds with
    | [] => None
    | (k', v) :: flds' => if String.eqb k k' then Some v else lookup_field flds' k
    end.

  Definition mark_frozen (σ : state) (l : loc) : state :=
    if existsb (Nat.eqb l) (st_frozen σ) then σ
    else State (st_next_loc σ) (st_next_prim σ) (st_store σ) (l :: st_frozen σ) (st_env σ)
      (st_cells σ) (st_dyn_prims σ).

  Fixpoint hardenedb (fuel : nat) (σ : state) (v : val) : bool :=
    match fuel with
    | O => false
    | S fuel' =>
        match v with
        | VLit _ => true
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
    | VLit LUndefined, VLit LUndefined => true
    | VLit (LBigInt n1), VLit (LBigInt n2) => Z.eqb n1 n2
    | VPrim x, VPrim y =>
        match x, y with
        | PrimBuiltin p1, PrimBuiltin p2 =>
            match p1, p2 with
            | PrimFreeze, PrimFreeze
            | PrimHarden, PrimHarden
            | PrimAssert, PrimAssert
            | PrimId, PrimId
            | PrimFail, PrimFail => true
            | _, _ => false
            end
        | PrimDyn n1, PrimDyn n2 => Nat.eqb n1 n2
        | PrimExt n1, PrimExt n2 => Nat.eqb n1 n2
        | _, _ => false
        end
    | VLoc l1, VLoc l2 => Nat.eqb l1 l2
    | VLit (LJson JNull), VLit (LJson JNull) => true
    | VLit (LJson (JBool b1)), VLit (LJson (JBool b2)) => Bool.eqb b1 b2
    | VLit (LJson (JNum n1)), VLit (LJson (JNum n2)) => Z.eqb n1 n2
    | VLit (LJson (JStr s1)), VLit (LJson (JStr s2)) => String.eqb s1 s2
    | _, _ => false
    end.

  Definition truthy (v : val) : bool :=
    match v with
    | VLit LUndefined => false
    | VLit (LBigInt n) => negb (Z.eqb n 0)
    | VLit (LJson JNull) => false
    | VLit (LJson (JBool b)) => b
    | VLit (LJson (JNum n)) => negb (Z.eqb n 0)
    | VLit (LJson (JStr s)) => negb (String.eqb s "")
    | VLit (LJson (JArr _)) => true
    | VLit (LJson (JObj _)) => true
    | VLoc _ => true
    | VPrim _ => true
    end.

  Fixpoint subst (x : string) (v : val) (e : core_expr) : core_expr :=
    match e with
    | CoreVal w => CoreVal w
    | CoreVar y => if String.eqb x y then CoreVal v else CoreVar y
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
    | CoreVal v :: es' =>
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
    | (k, CoreVal v) :: flds' =>
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
      State (S l) (st_next_prim σ) ((l, obj) :: st_store σ) (st_frozen σ) (st_env σ)
        (st_cells σ) (st_dyn_prims σ)).

  Definition alloc_counter (σ : state) : val * state :=
    let cell := st_next_loc σ in
    let obj := S cell in
    let incr := st_next_prim σ in
    let decr := S incr in
    let rec := HeapObj [("incr", VPrim (PrimDyn incr)); ("decr", VPrim (PrimDyn decr))] in
    let σ' := State (S obj) (S decr)
      ((obj, rec) :: st_store σ)
      (obj :: st_frozen σ)
      (st_env σ)
      ((cell, 0) :: st_cells σ)
      ((incr, CounterIncr cell) :: (decr, CounterDecr cell) :: st_dyn_prims σ)
    in
    (VLoc obj, σ').

  Definition apply_prim (σ : state) (p : prim_ref) (args : list val)
    : core_expr * state :=
    match p with
    | PrimBuiltin PrimAssert =>
        match args with
        | [VLit (LJson (JBool true))] => (CoreVal (VLit LUndefined), σ)
        | [VLit (LJson (JBool false))] => (CoreBzzt, σ)
        | _ => (CoreBzzt, σ)
        end
    | PrimBuiltin PrimId =>
        match args with
        | [v] =>
            if hardenedb 20 σ v then (CoreVal v, σ) else (CoreBzzt, σ)
        | _ => (CoreBzzt, σ)
        end
    | PrimBuiltin PrimFail => (CoreBzzt, σ)
    | PrimBuiltin PrimFreeze =>
        match args with
        | [v] =>
            let σ' := freeze_shallow σ v in
            (CoreVal v, σ')
        | _ => (CoreBzzt, σ)
        end
    | PrimBuiltin PrimHarden =>
        match args with
        | [v] =>
            let σ' := freeze_deep 20 σ v in
            (CoreVal v, σ')
        | _ => (CoreBzzt, σ)
        end
    | PrimExt _ => (CoreBzzt, σ)
    | PrimDyn pid =>
      match lookup_nat_assoc pid (st_dyn_prims σ) with
      | Some (CounterIncr cell) =>
          match args, lookup_cell σ cell with
          | [], Some n =>
              let n' := n + 1 in
              (CoreVal (VLit (LJson (JNum n'))), store_cell σ cell n')
          | _, _ => (CoreBzzt, σ)
          end
      | Some (CounterDecr cell) =>
          match args, lookup_cell σ cell with
          | [], Some n =>
              let n' := n - 1 in
              (CoreVal (VLit (LJson (JNum n'))), store_cell σ cell n')
          | _, _ => (CoreBzzt, σ)
          end
      | None => (CoreBzzt, σ)
      end
    end.

  Definition prim_handler := state -> prim_ref -> list val -> core_expr * state.

  Fixpoint step_with (do_prim : prim_handler) (σ : state) (e : core_expr)
    : option (core_expr * state) :=
    match e with
    | CoreVal _ => None
    | CoreVar x =>
        match lookup_assoc x (st_env σ) with
        | Some v => Some (CoreVal v, σ)
        | None => Some (CoreBzzt, σ)
        end
    | CoreAllocObj flds =>
        match all_lit_fields flds with
        | Some vs =>
            let '(v, σ') := alloc_obj σ vs in
            Some (CoreVal v, σ')
        | None =>
            let fix step_fields flds :=
                match flds with
                | [] => None
                | (k, e1) :: rest =>
                    match step_with do_prim σ e1 with
                    | Some (e1', σ') => Some (CoreAllocObj ((k, e1') :: rest), σ')
                    | None =>
                        match e1 with
                        | CoreVal _ =>
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
        | CoreVal (VLoc l) =>
            match lookup_obj σ l with
            | Some obj =>
                Some (CoreVal (match lookup_field (obj_fields obj) fld with
                               | Some v => v
                               | None => VLit LUndefined
                               end), σ)
            | None => Some (CoreBzzt, σ)
            end
        | CoreVal _ => Some (CoreBzzt, σ)
        | _ =>
            match step_with do_prim σ e1 with
            | Some (e1', σ') => Some (CoreGet e1' fld, σ')
            | None => None
            end
        end
    | CoreApp f args =>
        match f with
        | CoreVal (VPrim name) =>
            match all_lit args with
            | Some vs => Some (do_prim σ name vs)
            | None =>
                let fix step_args args :=
                    match args with
                    | [] => None
                    | e1 :: rest =>
                        match step_with do_prim σ e1 with
                        | Some (e1', σ') => Some (CoreApp f (e1' :: rest), σ')
                        | None =>
                            match e1 with
                            | CoreVal _ =>
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
        | CoreVal _ => Some (CoreBzzt, σ)
        | _ =>
            match step_with do_prim σ f with
            | Some (f', σ') => Some (CoreApp f' args, σ')
            | None => None
            end
        end
    | CoreLetIn x rhs body =>
        match rhs with
        | CoreVal v => Some (subst x v body, σ)
        | _ =>
            match step_with do_prim σ rhs with
            | Some (rhs', σ') => Some (CoreLetIn x rhs' body, σ')
            | None => None
            end
        end
    | CoreTypeOf e1 =>
        match e1 with
        | CoreVal v => Some (CoreVal (VLit (LJson (JStr (typeof_val v)))), σ)
        | _ =>
            match step_with do_prim σ e1 with
            | Some (e1', σ') => Some (CoreTypeOf e1', σ')
            | None => None
            end
        end
    | CoreCond e0 e1 e2 =>
        match e0 with
        | CoreVal v => Some (if truthy v then e1 else e2, σ)
        | _ =>
            match step_with do_prim σ e0 with
            | Some (e0', σ') => Some (CoreCond e0' e1 e2, σ')
            | None => None
            end
        end
    | CoreBinop EqStrictOp e1 e2 =>
        match e1, e2 with
        | CoreVal v1, CoreVal v2 =>
            Some (CoreVal (VLit (LJson (JBool (strict_eqb v1 v2)))), σ)
        | CoreVal _, _ =>
            match step_with do_prim σ e2 with
            | Some (e2', σ') => Some (CoreBinop EqStrictOp e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step_with do_prim σ e1 with
            | Some (e1', σ') => Some (CoreBinop EqStrictOp e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop AddNum e1 e2 =>
        match e1, e2 with
        | CoreVal (VLit (LJson (JNum n1))), CoreVal (VLit (LJson (JNum n2))) =>
            Some (CoreVal (VLit (LJson (JNum (n1 + n2)))), σ)
        | CoreVal _, _ =>
            match step_with do_prim σ e2 with
            | Some (e2', σ') => Some (CoreBinop AddNum e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step_with do_prim σ e1 with
            | Some (e1', σ') => Some (CoreBinop AddNum e1' e2, σ')
            | None => None
            end
        end
    | CoreBinop ConcatStr e1 e2 =>
        match e1, e2 with
        | CoreVal (VLit (LJson (JStr s1))), CoreVal (VLit (LJson (JStr s2))) =>
            Some (CoreVal (VLit (LJson (JStr (s1 ++ s2)))), σ)
        | CoreVal _, _ =>
            match step_with do_prim σ e2 with
            | Some (e2', σ') => Some (CoreBinop ConcatStr e1 e2', σ')
            | None => None
            end
        | _, _ =>
            match step_with do_prim σ e1 with
            | Some (e1', σ') => Some (CoreBinop ConcatStr e1' e2, σ')
            | None => None
            end
        end
    | CoreBzzt => None
    end.

  Definition step (σ : state) (e : core_expr) : option (core_expr * state) :=
    step_with apply_prim σ e.

  Fixpoint normalize_with (do_prim : prim_handler) (fuel : nat) (σ : state) (e : core_expr)
    : core_expr * state :=
    match fuel with
    | O => (CoreBzzt, σ)
    | S fuel' =>
        match step_with do_prim σ e with
        | Some (e', σ') =>
            match e' with
            | CoreVal _ => (e', σ')
            | CoreBzzt => (CoreBzzt, σ')
            | _ => normalize_with do_prim fuel' σ' e'
            end
        | None => (e, σ)
        end
    end.

  Definition run1 (e : core_expr) : option (core_expr * state) :=
    step empty_state e.

  Example typeof_undefined_steps :
    run1 (CoreTypeOf (CoreVal (VLit LUndefined))) =
      Some (CoreVal (VLit (LJson (JStr "undefined"))), empty_state).
  Proof. reflexivity. Qed.

  Example typeof_null_is_object :
    run1 (CoreTypeOf (CoreVal (VLit (LJson JNull)))) =
      Some (CoreVal (VLit (LJson (JStr "object"))), empty_state).
  Proof. reflexivity. Qed.

  Example typeof_bigint_steps :
    run1 (CoreTypeOf (CoreVal (VLit (LBigInt 12)))) =
      Some (CoreVal (VLit (LJson (JStr "bigint"))), empty_state).
  Proof. reflexivity. Qed.

  Example cond_string_truthy :
    run1 (CoreCond (CoreVal (VLit (LJson (JStr "x"))))
      (CoreVal (VLit (LJson (JNum 1)))) (CoreVal (VLit (LJson (JNum 0))))) =
      Some (CoreVal (VLit (LJson (JNum 1))), empty_state).
  Proof. reflexivity. Qed.

  Example eq_empty_objects_allocates_distinct_locs :
    run1 (CoreBinop EqStrictOp
      (CoreAllocObj [])
      (CoreAllocObj [])) =
      Some (CoreBinop EqStrictOp (CoreVal (VLoc 0%nat)) (CoreAllocObj []),
        State 1%nat 0%nat [(0%nat, HeapObj [])] [] (st_env empty_state)
          (st_cells empty_state) (st_dyn_prims empty_state)).
  Proof. reflexivity. Qed.

  Example freeze_shallow_marks_only_root :
    let σ1 := State 2%nat
      0%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [] (st_env empty_state) [] [] in
    apply_prim σ1 (PrimBuiltin PrimFreeze) [VLoc 0%nat] =
      (CoreVal (VLoc 0%nat),
        State 2%nat
          0%nat
          [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
          [0%nat] (st_env empty_state) [] []).
  Proof. reflexivity. Qed.

  Example harden_deep_marks_reachable_objects :
    let σ1 := State 2%nat
      0%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [] (st_env empty_state) [] [] in
    apply_prim σ1 (PrimBuiltin PrimHarden) [VLoc 0%nat] =
      (CoreVal (VLoc 0%nat),
        State 2%nat
          0%nat
          [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
          [1%nat; 0%nat] (st_env empty_state) [] []).
  Proof. reflexivity. Qed.

  Example id_rejects_shallow_frozen_nested_object :
    let σ1 := State 2%nat
      0%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [0%nat] (st_env empty_state) [] [] in
    apply_prim σ1 (PrimBuiltin PrimId) [VLoc 0%nat] = (CoreBzzt, σ1).
  Proof. reflexivity. Qed.

  Example id_accepts_hardened_nested_object :
    let σ1 := State 2%nat
      0%nat
      [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
      [1%nat; 0%nat] (st_env empty_state) [] [] in
    apply_prim σ1 (PrimBuiltin PrimId) [VLoc 0%nat] = (CoreVal (VLoc 0%nat), σ1).
  Proof. reflexivity. Qed.

  Example id_rejects_unhardened_object :
    let σ1 := State 1%nat 0%nat [(0%nat, HeapObj [])] [] (st_env empty_state) [] [] in
    apply_prim σ1 (PrimBuiltin PrimId) [VLoc 0%nat] = (CoreBzzt, σ1).
  Proof. reflexivity. Qed.

End JustinExec.
