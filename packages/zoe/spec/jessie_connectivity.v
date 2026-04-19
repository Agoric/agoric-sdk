(* Generic connectivity graph definitions for Justin authority flow. *)
From Coq Require Import List String.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope string_scope.

Module JessieConnectivity.
  Import Justin.
  Import JustinExec.

  Inductive cref :=
  | CObj (l : loc)
  | CDyn (pid : nat)
  | CCell (l : loc).

  Definition cref_of_val (v : val) : option cref :=
    match v with
    | VLoc l => Some (CObj l)
    | VPrim (PrimDyn pid) => Some (CDyn pid)
    | _ => None
    end.

  Inductive edge (σ : state) : cref -> cref -> Prop :=
  | EdgeObjObj l obj fld l' :
      lookup_obj σ l = Some obj ->
      lookup_field (obj_fields obj) fld = Some (VLoc l') ->
      edge σ (CObj l) (CObj l')
  | EdgeObjDyn l obj fld pid :
      lookup_obj σ l = Some obj ->
      lookup_field (obj_fields obj) fld = Some (VPrim (PrimDyn pid)) ->
      edge σ (CObj l) (CDyn pid)
  | EdgeDynCell pid cell :
      (exists delta, lookup_nat_assoc pid (st_dyn_prims σ) = Some (DynCellDelta cell delta)) ->
      edge σ (CDyn pid) (CCell cell).

  Inductive reachable (σ : state) : cref -> cref -> Prop :=
  | ReachRefl r :
      reachable σ r r
  | ReachStep r1 r2 r3 :
      edge σ r1 r2 ->
      reachable σ r2 r3 ->
      reachable σ r1 r3.

  Definition val_reaches (σ : state) (root : val) (r : cref) : Prop :=
    match cref_of_val root with
    | Some r0 => reachable σ r0 r
    | None => False
    end.

  Definition args_reach (σ : state) (args : list val) (r : cref) : Prop :=
    exists arg, In arg args /\ val_reaches σ arg r.

  Definition env_reaches (σ : state) (x : string) (r : cref) : Prop :=
    exists v, lookup_assoc x (st_env σ) = Some v /\ val_reaches σ v r.

  Definition old_or_fresh (σ σ' : state) (args : list val) (r : cref) : Prop :=
    args_reach σ args r \/
    match r with
    | CObj l => st_next_loc σ <= l < st_next_loc σ'
    | CCell l => st_next_loc σ <= l < st_next_loc σ'
    | CDyn pid => st_next_prim σ <= pid < st_next_prim σ'
    end.

  Definition primitive_connectivity_ok
      (run : state -> prim_ref -> list val -> core_expr * state) (p : prim_ref) : Prop :=
    forall σ args e' σ' r,
      run σ p args = (e', σ') ->
      (match e' with
       | CoreVal root => val_reaches σ' root r
       | _ => False
      end) ->
      old_or_fresh σ σ' args r.
End JessieConnectivity.
