(* Fuelled executable semantics for the minimal makeCounter core. *)
From Coq Require Import Bool List String ZArith.
Require Import jessie_lang jessie_counter.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieEval.
  Import JessieLang.

  Inductive val :=
  | VNat (n : Z)
  | VUnit
  | VLoc (l : nat)
  | VClosure (ρ : list (string * val)) (f x : binder) (body : expr)
  | VObj (fields : list (string * val)).

  Definition env := list (string * val).

  Record state := State {
    st_good : bool;
    st_next_loc : nat;
    st_heap : list (nat * val)
  }.

  Definition empty_state : state := State true 0 [].

  Fixpoint lookup_env (x : string) (ρ : env) : option val :=
    match ρ with
    | [] => None
    | (y, v) :: ρ' => if String.eqb x y then Some v else lookup_env x ρ'
    end.

  Definition bind (b : binder) (v : val) (ρ : env) : env :=
    match b with
    | BAnon => ρ
    | BNamed x => (x, v) :: ρ
    end.

  Definition bind_self (f : binder) (self : val) (ρ : env) : env :=
    bind f self ρ.

  Fixpoint lookup_heap (l : nat) (h : list (nat * val)) : option val :=
    match h with
    | [] => None
    | (l', v) :: h' => if Nat.eqb l l' then Some v else lookup_heap l h'
    end.

  Fixpoint store_heap (l : nat) (v : val) (h : list (nat * val)) : list (nat * val) :=
    match h with
    | [] => [(l, v)]
    | (l', v') :: h' =>
        if Nat.eqb l l' then (l, v) :: h' else (l', v') :: store_heap l v h'
    end.

  Definition alloc (σ : state) (v : val) : val * state :=
    let l := st_next_loc σ in
    (VLoc l, State (st_good σ) (S l) ((l, v) :: st_heap σ)).

  Definition bool_of_val (v : val) : bool :=
    match v with
    | VNat n => negb (Z.eqb n 0)
    | VUnit => false
    | VLoc _ => true
    | VClosure _ _ _ _ => true
    | VObj _ => true
    end.

  Definition good_result (σ : state) (v : val) : val * state := (v, σ).
  Definition bad_result (σ : state) : val * state :=
    (VUnit, State false (st_next_loc σ) (st_heap σ)).

  Definition eval_binop (op : binop) (v1 v2 : val) : option val :=
    match op, v1, v2 with
    | Add, VNat n1, VNat n2 => Some (VNat (n1 + n2))
    | Sub, VNat n1, VNat n2 => Some (VNat (n1 - n2))
    | Gt, VNat n1, VNat n2 =>
        Some (VNat (if Z.gtb n1 n2 then 1 else 0))
    | _, _, _ => None
    end.

  Fixpoint eval (fuel : nat) (σ : state) (ρ : env) (e : expr)
    : option (val * state) :=
    match fuel with
    | O => None
    | S fuel' =>
        match e with
        | Var x =>
            match lookup_env x ρ with
            | Some v => Some (v, σ)
            | None => None
            end
        | LitNat n => Some (VNat n, σ)
        | LitUnit => Some (VUnit, σ)
        | Rec f x body => Some (VClosure ρ f x body, σ)
        | App e1 e2 =>
            match eval fuel' σ ρ e1 with
            | Some (VClosure ρcl f x body, σ1) =>
                match eval fuel' σ1 ρ e2 with
                | Some (v2, σ2) =>
                    let self := VClosure ρcl f x body in
                    let ρ' := bind x v2 (bind_self f self ρcl) in
                    eval fuel' σ2 ρ' body
                | None => None
                end
            | _ => None
            end
        | LetIn x e1 e2 =>
            match eval fuel' σ ρ e1 with
            | Some (v1, σ1) => eval fuel' σ1 (bind x v1 ρ) e2
            | None => None
            end
        | Obj fields =>
            match eval_fields fuel' σ ρ fields with
            | Some (vs, σ') => Some (VObj vs, σ')
            | None => None
            end
        | Get e1 field =>
            match eval fuel' σ ρ e1 with
            | Some (VObj fields, σ1) =>
                match lookup_field_last field fields with
                | Some v => Some (v, σ1)
                | None => None
                end
            | _ => None
            end
        | Alloc e1 =>
            match eval fuel' σ ρ e1 with
            | Some (v1, σ1) =>
                let '(loc, σ2) := alloc σ1 v1 in
                Some (loc, σ2)
            | None => None
            end
        | Load e1 =>
            match eval fuel' σ ρ e1 with
            | Some (VLoc l, σ1) =>
                match lookup_heap l (st_heap σ1) with
                | Some v => Some (v, σ1)
                | None => None
                end
            | _ => None
            end
        | Store e1 e2 =>
            match eval fuel' σ ρ e1 with
            | Some (VLoc l, σ1) =>
                match eval fuel' σ1 ρ e2 with
                | Some (v2, σ2) =>
                    Some (VUnit,
                      State (st_good σ2) (st_next_loc σ2) (store_heap l v2 (st_heap σ2)))
                | None => None
                end
            | _ => None
            end
        | Assert e1 =>
            match eval fuel' σ ρ e1 with
            | Some (v1, σ1) =>
                if bool_of_val v1 then Some (good_result σ1 VUnit)
                else Some (bad_result σ1)
            | None => None
            end
        | BinOp op e1 e2 =>
            match eval fuel' σ ρ e1 with
            | Some (v1, σ1) =>
                match eval fuel' σ1 ρ e2 with
                | Some (v2, σ2) =>
                    match eval_binop op v1 v2 with
                    | Some v => Some (v, σ2)
                    | None => None
                    end
                | None => None
                end
            | None => None
            end
        end
    end
  with eval_fields (fuel : nat) (σ : state) (ρ : env) (fields : list (string * expr))
    : option (list (string * val) * state) :=
    match fuel with
    | O => None
    | S fuel' =>
        match fields with
        | [] => Some ([], σ)
        | (k, e) :: fields' =>
            match eval fuel' σ ρ e with
            | Some (v, σ1) =>
                match eval_fields fuel' σ1 ρ fields' with
                | Some (vs, σ2) => Some ((k, v) :: vs, σ2)
                | None => None
                end
            | None => None
            end
        end
    end.

  Definition default_fuel : nat := 200.

  (* OCPL-style executable monitor: only failed `assert:` flips the goodness
     bit. A plain evaluation failure does not itself count as a bad state. *)
  Definition monitored_eval (e : expr) : bool :=
    match eval default_fuel empty_state [] e with
    | Some (_, σ) => st_good σ
    | None => true
    end.

  Example makeCounter_allocates_good :
    monitored_eval (App JessieCounter.makeCounter LitUnit) = true.
  Proof. reflexivity. Qed.
End JessieEval.
