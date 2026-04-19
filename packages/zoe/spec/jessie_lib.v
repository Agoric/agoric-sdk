(* Shared runtime/library helpers used by Justin and Jessie surface execution. *)
From Coq Require Import List String.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.

Module JessieLib.
  Import Justin.

  Definition builtin_prim_names : list (string * prim_name) :=
    [ ("freeze", PrimFreeze);
      ("harden", PrimHarden);
      ("assert", PrimAssert);
      ("id", PrimId);
      ("fail", PrimFail) ].

  Definition prim_name_eqb (p1 p2 : prim_name) : bool :=
    match p1, p2 with
    | PrimFreeze, PrimFreeze
    | PrimHarden, PrimHarden
    | PrimAssert, PrimAssert
    | PrimId, PrimId
    | PrimFail, PrimFail => true
    | _, _ => false
    end.

  Fixpoint lookup_assoc {A : Type} (x : string) (xs : list (string * A)) : option A :=
    match xs with
    | [] => None
    | (y, a) :: xs' => if String.eqb x y then Some a else lookup_assoc x xs'
    end.

  Fixpoint lookup_field {A : Type} (flds : list (string * A)) (k : string) : option A :=
    match flds with
    | [] => None
    | (k', v) :: rest => if String.eqb k k' then Some v else lookup_field rest k
    end.

  Definition mark_frozen
      {state loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (σ : state) (l : loc) : state :=
    if existsb (eqb l) (get_frozen σ) then σ
    else set_frozen (l :: get_frozen σ) σ.

  Definition freeze_shallow
      {state value loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (as_loc : value -> option loc)
      (σ : state) (v : value) : state :=
    match as_loc v with
    | Some l => mark_frozen eqb get_frozen set_frozen σ l
    | None => σ
    end.

  Fixpoint freeze_deep
      {state value obj loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (as_loc : value -> option loc)
      (lookup_obj : state -> loc -> option obj)
      (obj_fields : obj -> list (string * value))
      (fuel : nat) (σ : state) (v : value) : state :=
    match fuel with
    | O => σ
    | S fuel' =>
        match as_loc v with
        | Some l =>
            let σ1 := mark_frozen eqb get_frozen set_frozen σ l in
            match lookup_obj σ1 l with
            | Some obj =>
                fold_left (fun σacc kv =>
                  freeze_deep eqb get_frozen set_frozen as_loc lookup_obj obj_fields fuel' σacc (snd kv))
                  (obj_fields obj) σ1
            | None => σ1
            end
        | None => σ
        end
    end.

  Definition eval_builtin_prim
      {value state result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : result)
      (p : prim_name) (σ : state) (args : list value) : result :=
    match p with
    | PrimAssert =>
        match args with
        | [v] => if truthy_true v then ok undefined σ else bad
        | _ => bad
        end
    | PrimId =>
        match args with
        | [v] =>
            if hardenedb 20%nat σ v then ok v σ else bad
        | _ => bad
        end
    | PrimFail => bad
    | PrimFreeze =>
        match args with
        | [v] => ok v (freeze_shallow σ v)
        | _ => bad
        end
    | PrimHarden =>
        match args with
        | [v] => ok v (freeze_deep 20%nat σ v)
        | _ => bad
        end
    end.
End JessieLib.
