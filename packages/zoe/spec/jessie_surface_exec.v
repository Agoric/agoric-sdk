From Coq Require Import Bool List String ZArith.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieSurfaceExec.
  Import Justin.
  Import JustinExec.
  Import JessieSurface.

  Definition loc := nat.
  Definition cell := nat.

  Inductive value :=
  | VLit (l : lit)
  | VObj (l : loc)
  | VPrim (name : prim_name)
  | VClosure (env : list (string * binding)) (body : stmt)
  with binding :=
  | BVal (v : value)
  | BCell (c : cell).

  Record heap_obj := HeapObj {
    obj_fields : list (string * value)
  }.

  Record state := State {
    st_next_loc : loc;
    st_next_cell : cell;
    st_store : list (loc * heap_obj);
    st_frozen : list loc;
    st_cells : list (cell * value)
  }.

  Definition env := list (string * binding).

  Inductive outcome :=
  | Normal (ρ : env) (v : value)
  | Returned (v : value).

  Definition empty_state : state := State 0%nat 0%nat [] [] [].

  Definition initial_env : env :=
    [("assert", BVal (VPrim PrimAssert));
     ("harden", BVal (VPrim PrimHarden));
     ("freeze", BVal (VPrim PrimFreeze));
     ("id", BVal (VPrim PrimId));
     ("fail", BVal (VPrim PrimFail))].

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

  Fixpoint lookup_cell_list (cells : list (cell * value)) (c : cell) : option value :=
    match cells with
    | [] => None
    | (c', v) :: rest =>
        if Nat.eqb c c' then Some v else lookup_cell_list rest c
    end.

  Definition lookup_cell (σ : state) (c : cell) : option value :=
    lookup_cell_list (st_cells σ) c.

  Fixpoint store_cell_list (cells : list (cell * value)) (c : cell) (v : value)
    : list (cell * value) :=
    match cells with
    | [] => [(c, v)]
    | (c', v') :: rest =>
        if Nat.eqb c c' then (c, v) :: rest
        else (c', v') :: store_cell_list rest c v
    end.

  Definition store_cell (σ : state) (c : cell) (v : value) : state :=
    State (st_next_loc σ) (st_next_cell σ) (st_store σ) (st_frozen σ)
      (store_cell_list (st_cells σ) c v).

  Fixpoint lookup_field (flds : list (string * value)) (k : string) : option value :=
    match flds with
    | [] => None
    | (k', v) :: rest => if String.eqb k k' then Some v else lookup_field rest k
    end.

  Definition alloc_obj (σ : state) (vs : list (string * value)) : value * state :=
    let l := st_next_loc σ in
    (VObj l,
      State (S l) (st_next_cell σ)
        ((l, HeapObj vs) :: st_store σ)
        (st_frozen σ)
        (st_cells σ)).

  Definition alloc_cell (σ : state) (v : value) : cell * state :=
    let c := st_next_cell σ in
    (c, State (st_next_loc σ) (S c) (st_store σ) (st_frozen σ)
          ((c, v) :: st_cells σ)).

  Definition mark_frozen (σ : state) (l : loc) : state :=
    if existsb (Nat.eqb l) (st_frozen σ) then σ
    else State (st_next_loc σ) (st_next_cell σ) (st_store σ) (l :: st_frozen σ) (st_cells σ).

  Fixpoint typeof_lit (l : lit) : string :=
    match l with
    | LJson jv => Justin.typeof_json jv
    | LBigInt _ => "bigint"
    | LUndefined => "undefined"
    end.

  Definition typeof_value (v : value) : string :=
    match v with
    | VLit l => typeof_lit l
    | VObj _ => "object"
    | VPrim _ => "function"
    | VClosure _ _ => "function"
    end.

  Fixpoint value_eqb (v1 v2 : value) : bool :=
    match v1, v2 with
    | VLit LUndefined, VLit LUndefined => true
    | VLit (LBigInt n1), VLit (LBigInt n2) => Z.eqb n1 n2
    | VLit (LJson JNull), VLit (LJson JNull) => true
    | VLit (LJson (JBool b1)), VLit (LJson (JBool b2)) => Bool.eqb b1 b2
    | VLit (LJson (JNum n1)), VLit (LJson (JNum n2)) => Z.eqb n1 n2
    | VLit (LJson (JStr s1)), VLit (LJson (JStr s2)) => String.eqb s1 s2
    | VObj l1, VObj l2 => Nat.eqb l1 l2
    | VPrim p1, VPrim p2 =>
        match p1, p2 with
        | PrimFreeze, PrimFreeze
        | PrimHarden, PrimHarden
        | PrimAssert, PrimAssert
        | PrimId, PrimId
        | PrimFail, PrimFail => true
        | _, _ => false
        end
    | VClosure _ _, VClosure _ _ => false
    | _, _ => false
    end.

  Fixpoint freeze_deep (fuel : nat) (σ : state) (v : value) : state :=
    match fuel with
    | O => σ
    | S fuel' =>
        match v with
        | VObj l =>
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

  Definition freeze_shallow (σ : state) (v : value) : state :=
    match v with
    | VObj l => mark_frozen σ l
    | _ => σ
    end.

  Fixpoint eval_base (fuel : nat) (σ : state) (ρ : env) (e : Justin.expr)
    : option (value * state) :=
    match fuel with
    | O => None
    | S fuel' =>
        match e with
        | Justin.Lit l => Some (VLit l, σ)
        | Justin.Var x =>
            match lookup_assoc x ρ with
            | Some (BVal v) => Some (v, σ)
            | Some (BCell c) =>
                match lookup_cell σ c with
                | Some v => Some (v, σ)
                | None => None
                end
            | None => None
            end
        | Justin.TypeOf e1 =>
            match eval_base fuel' σ ρ e1 with
            | Some (v, σ1) => Some (VLit (LJson (JStr (typeof_value v))), σ1)
            | None => None
            end
        | Justin.Cond e0 e1 e2 =>
            match eval_base fuel' σ ρ e0 with
            | Some (VLit (LJson (JBool true)), σ1) => eval_base fuel' σ1 ρ e1
            | Some (_, σ1) => eval_base fuel' σ1 ρ e2
            | None => None
            end
        | Justin.EqStrict e1 e2 =>
            match eval_base fuel' σ ρ e1, eval_base fuel' σ ρ e2 with
            | Some (v1, σ1), Some (v2, _) => Some (VLit (LJson (JBool (value_eqb v1 v2))), σ1)
            | _, _ => None
            end
        | _ => None
        end
    end.

  Fixpoint eval_expr (fuel : nat) (σ : state) (ρ : env) (e : expr)
    {struct fuel} : option (value * state)
  with eval_exprs (fuel : nat) (σ : state) (ρ : env) (es : list expr)
    {struct fuel} : option (list value * state)
  with eval_fields (fuel : nat) (σ : state) (ρ : env) (flds : list (string * expr))
    {struct fuel} : option (list (string * value) * state)
  with exec_stmt (fuel : nat) (σ : state) (ρ : env) (s : stmt)
    {struct fuel} : option (outcome * state)
  with exec_stmts (fuel : nat) (σ : state) (ρ : env) (ss : list stmt)
    {struct fuel} : option (outcome * state).
  Proof.
    - destruct fuel as [|fuel']; [exact None|].
      destruct e as [be|flds|e field|f args|body|x delta|e1 e2|e1].
      + exact (eval_base fuel' σ ρ be).
      + exact (
          match eval_fields fuel' σ ρ flds with
          | Some (vs, σ1) => Some (alloc_obj σ1 vs)
          | None => None
          end).
      + exact (
          match eval_expr fuel' σ ρ e with
          | Some (VObj l, σ1) =>
              match lookup_obj σ1 l with
              | Some obj =>
                  Some (match lookup_field (obj_fields obj) field with
                        | Some v => v
                        | None => VLit LUndefined
                        end, σ1)
              | None => None
              end
          | Some (_, _) => None
          | None => None
          end).
      + exact (
          match eval_expr fuel' σ ρ f, eval_exprs fuel' σ ρ args with
          | Some (VPrim PrimAssert, σ1), Some ([VLit (LJson (JBool true))], _) =>
              Some (VLit LUndefined, σ1)
          | Some (VPrim PrimAssert, _), Some ([VLit (LJson (JBool false))], _) =>
              None
          | Some (VPrim PrimHarden, σ1), Some ([v], _) =>
              Some (v, freeze_deep 20 σ1 v)
          | Some (VPrim PrimFreeze, σ1), Some ([v], _) =>
              Some (v, freeze_shallow σ1 v)
          | Some (VPrim PrimId, σ1), Some ([v], _) =>
              Some (v, σ1)
          | Some (VPrim PrimFail, _), Some (_, _) =>
              None
          | Some (VClosure ρc body, σ1), Some ([], _) =>
              match exec_stmt fuel' σ1 ρc body with
              | Some (Returned v, σ2) => Some (v, σ2)
              | Some (Normal _ v, σ2) => Some (v, σ2)
              | None => None
              end
          | _, _ => None
          end).
      + exact (Some (VClosure ρ body, σ)).
      + exact (
          match lookup_assoc x ρ with
          | Some (BCell c) =>
              match lookup_cell σ c with
              | Some (VLit (LJson (JNum n))) =>
                  let v := VLit (LJson (JNum (n + delta))) in
                  Some (v, store_cell σ c v)
              | _ => None
              end
          | _ => None
          end).
      + exact (
          match eval_expr fuel' σ ρ e1, eval_expr fuel' σ ρ e2 with
          | Some (v1, σ1), Some (v2, _) =>
              Some (VLit (LJson (JBool (value_eqb v1 v2))), σ1)
          | _, _ => None
          end).
      + exact (
          match eval_expr fuel' σ ρ e1 with
          | Some (v, σ1) => Some (v, freeze_deep 20 σ1 v)
          | None => None
          end).
    - destruct fuel as [|fuel']; [exact None|].
      destruct es as [|e es'].
      + exact (Some ([], σ)).
      + exact (
          match eval_expr fuel' σ ρ e with
          | Some (v, σ1) =>
              match eval_exprs fuel' σ1 ρ es' with
              | Some (vs, σ2) => Some (v :: vs, σ2)
              | None => None
              end
          | None => None
          end).
    - destruct fuel as [|fuel']; [exact None|].
      destruct flds as [|[k e] rest].
      + exact (Some ([], σ)).
      + exact (
          match eval_expr fuel' σ ρ e with
          | Some (v, σ1) =>
              match eval_fields fuel' σ1 ρ rest with
              | Some (vs, σ2) => Some ((k, v) :: vs, σ2)
              | None => None
              end
          | None => None
          end).
    - destruct fuel as [|fuel']; [exact None|].
      destruct s as [x rhs|x rhs|e|e|ss].
      + exact (
          match eval_expr fuel' σ ρ rhs with
          | Some (v, σ1) => Some (Normal ((x, BVal v) :: ρ) v, σ1)
          | None => None
          end).
      + exact (
          match eval_expr fuel' σ ρ rhs with
          | Some (v, σ1) =>
              let '(c, σ2) := alloc_cell σ1 v in
              Some (Normal ((x, BCell c) :: ρ) v, σ2)
          | None => None
          end).
      + exact (
          match eval_expr fuel' σ ρ e with
          | Some (v, σ1) => Some (Returned v, σ1)
          | None => None
          end).
      + exact (
          match eval_expr fuel' σ ρ e with
          | Some (v, σ1) => Some (Normal ρ v, σ1)
          | None => None
          end).
      + exact (
          match exec_stmts fuel' σ ρ ss with
          | Some (Returned v, σ1) => Some (Returned v, σ1)
          | Some (Normal _ v, σ1) => Some (Normal ρ v, σ1)
          | None => None
          end).
    - destruct fuel as [|fuel']; [exact None|].
      destruct ss as [|s ss'].
      + exact (Some (Normal ρ (VLit LUndefined), σ)).
      + exact (
          match exec_stmt fuel' σ ρ s with
          | Some (Returned v, σ1) => Some (Returned v, σ1)
          | Some (Normal ρ1 _, σ1) => exec_stmts fuel' σ1 ρ1 ss'
          | None => None
          end).
  Defined.

  Definition run_program (fuel : nat) (ρ : env) (p : program)
    : option (value * state) :=
    match exec_stmts fuel empty_state ρ p with
    | Some (Returned v, σ) => Some (v, σ)
    | Some (Normal _ v, σ) => Some (v, σ)
    | None => None
    end.

  Definition run_with_builtins (fuel : nat) (p : program) : option (value * state) :=
    run_program fuel initial_env p.
End JessieSurfaceExec.
