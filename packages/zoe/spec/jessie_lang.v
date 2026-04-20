(* Minimal OCPL-style syntax for the makeCounter case study. *)
From Coq Require Import List String ZArith.

Import ListNotations.

Open Scope string_scope.
Open Scope Z_scope.

Module JessieLang.
  Inductive binder :=
  | BAnon
  | BNamed (x : string).

  Coercion BNamed : string >-> binder.

  Inductive binop :=
  | Add
  | Sub.

  Inductive expr :=
  | Var (x : string)
  | LitNat (n : Z)
  (* TODO: Jessie cares about two nullish values, `undefined` and `null`.
     This temporary unit literal is only here to support HeapLang-style
     zero-argument calls like `f #()`. Revisit once the nullish story is
     modeled directly. *)
  | LitUnit
  | Rec (f x : binder) (body : expr)
  | App (e1 e2 : expr)
  | LetIn (x : binder) (e1 e2 : expr)
  | Obj (fields : list (string * expr))
  | Get (e : expr) (field : string)
  | Alloc (e : expr)
  | Load (e : expr)
  | Store (e1 e2 : expr)
  | BinOp (op : binop) (e1 e2 : expr).

  Coercion Var : string >-> expr.

  Definition Lam (x : binder) (body : expr) : expr :=
    Rec BAnon x body.

  Definition Seq (e1 e2 : expr) : expr :=
    LetIn BAnon e1 e2.

  Definition AssignAdd (x rhs : expr) : expr :=
    Seq
      (Store x (BinOp Add (Load x) rhs))
      (Load x).

  Definition AssignSub (x rhs : expr) : expr :=
    Seq
      (Store x (BinOp Sub (Load x) rhs))
      (Load x).

  Definition EmptyObj : expr := Obj [].

  Definition SingletonObj (k : string) (v : expr) : expr :=
    Obj [(k, v)].

  Definition DoubleObj (k1 : string) (v1 : expr) (k2 : string) (v2 : expr) : expr :=
    Obj [(k1, v1); (k2, v2)].

  Fixpoint lookup_field_last {A : Type} (k : string) (fields : list (string * A))
    : option A :=
    match fields with
    | [] => None
    | (k', v) :: fields' =>
        match lookup_field_last k fields' with
        | Some v' => Some v'
        | None => if String.eqb k k' then Some v else None
        end
    end.

  Declare Scope jessie_scope.
  Delimit Scope jessie_scope with jessie.
  Declare Custom Entry jexpr.

  Notation "<{ e }>" := e (e custom jexpr at level 99).
  Notation "( x )" := x (in custom jexpr, x at level 99).
  Notation "x" := x (in custom jexpr at level 0, x constr at level 0).
  Notation "#()" := LitUnit (in custom jexpr at level 0).
  Notation "# n" := (LitNat n%Z) (in custom jexpr at level 8, n constr).
  Notation "'fn:' x => e" := (Lam x e)
    (in custom jexpr at level 200, x constr at level 1, e custom jexpr at level 200,
     right associativity).
  Notation "'let:' x := e1 'in' e2" := (LetIn x e1 e2)
    (in custom jexpr at level 200, x constr at level 1,
     e1 custom jexpr at level 200, e2 custom jexpr at level 200,
     right associativity).
  Notation "{ }" := EmptyObj (in custom jexpr at level 0).
  Notation "{ k := v }" := (SingletonObj k v)
    (in custom jexpr at level 0, k constr at level 0, v custom jexpr at level 200).
  Notation "{ k1 := v1 ; k2 := v2 }" := (DoubleObj k1 v1 k2 v2)
    (in custom jexpr at level 0, k1 constr at level 0, v1 custom jexpr at level 200,
     k2 constr at level 0, v2 custom jexpr at level 200).
  Notation "'ref' e" := (Alloc e) (in custom jexpr at level 20).
  Notation "'!' e" := (Load e) (in custom jexpr at level 20).
  Notation "e .[ k ]" := (Get e k)
    (in custom jexpr at level 19, left associativity, k constr at level 0).
  Notation "e1 e2" := (App e1 e2)
    (in custom jexpr at level 18, left associativity).
  Notation "e1 <- e2" := (Store e1 e2)
    (in custom jexpr at level 80, right associativity).
  Notation "e1 + e2" := (BinOp Add e1 e2)
    (in custom jexpr at level 50, left associativity).
  Notation "e1 - e2" := (BinOp Sub e1 e2)
    (in custom jexpr at level 50, left associativity).
  Notation "x += e" := (AssignAdd x e)
    (in custom jexpr at level 82, right associativity).
  Notation "x -= e" := (AssignSub x e)
    (in custom jexpr at level 82, right associativity).
  Notation "e1 ;; e2" := (Seq e1 e2)
    (in custom jexpr at level 100, right associativity).

  Notation "<>" := BAnon.
  Notation "#()" := LitUnit : jessie_scope.
  Notation "# n" := (LitNat n%Z) (at level 8, format "# n") : jessie_scope.
  Notation "'fn:' x => e" := (Lam x e)
    (at level 200, x at level 1, e at level 200,
     right associativity) : jessie_scope.
  Notation "'let:' x := e1 'in' e2" := (LetIn x e1 e2)
    (at level 200, x at level 1, e1 at level 200, e2 at level 200,
     right associativity) : jessie_scope.
  Notation "{ }" := EmptyObj : jessie_scope.
  Notation "'{' k := v '}'" := (SingletonObj k v) : jessie_scope.
  Notation "'{' k1 := v1 ; k2 := v2 '}'" := (DoubleObj k1 v1 k2 v2) : jessie_scope.
  Notation "'ref' e" := (Alloc e) (at level 20) : jessie_scope.
  Notation "'!' e" := (Load e) (at level 20) : jessie_scope.
  Notation "e .[ k ]" := (Get e k)
    (at level 19, left associativity, format "e .[ k ]") : jessie_scope.
  Notation "e1 <- e2" := (Store e1 e2)
    (at level 80, right associativity) : jessie_scope.
  Notation "e1 + e2" := (BinOp Add e1 e2)
    (at level 50, left associativity) : jessie_scope.
  Notation "e1 - e2" := (BinOp Sub e1 e2)
    (at level 50, left associativity) : jessie_scope.
  Notation "x += e" := (AssignAdd x e)
    (at level 82, right associativity) : jessie_scope.
  Notation "x -= e" := (AssignSub x e)
    (at level 82, right associativity) : jessie_scope.
  Notation "e1 ;; e2" := (Seq e1 e2)
    (at level 100, right associativity) : jessie_scope.

  Open Scope jessie_scope.

  Example notation_smoke :
    (let: "x" := ref #2 in !"x")%jessie =
      LetIn "x" (Alloc (LitNat 2)) (Load (Var "x")).
  Proof. reflexivity. Qed.

  Example fn_smoke :
    (fn: "x" => "x" + #1)%jessie =
      Rec BAnon "x" (BinOp Add (Var "x") (LitNat 1)).
  Proof. reflexivity. Qed.

  Example assign_add_smoke :
    ("counter" += #1)%jessie =
      LetIn BAnon
        (Store (Var "counter") (BinOp Add (Load (Var "counter")) (LitNat 1)))
        (Load (Var "counter")).
  Proof. reflexivity. Qed.

  Example assign_sub_smoke :
    ("counter" -= #1)%jessie =
      LetIn BAnon
        (Store (Var "counter") (BinOp Sub (Load (Var "counter")) (LitNat 1)))
        (Load (Var "counter")).
  Proof. reflexivity. Qed.

  Example custom_entry_fn_smoke :
    <{ fn: "x" => "x" + #1 }> =
      Rec BAnon "x" (BinOp Add (Var "x") (LitNat 1)).
  Proof. reflexivity. Qed.

  Example empty_object_smoke :
    ({} )%jessie = Obj [].
  Proof. reflexivity. Qed.

  Example singleton_object_smoke :
    ({ "incr" := #1 })%jessie = Obj [("incr", LitNat 1)].
  Proof. reflexivity. Qed.

  Example double_object_smoke :
    ({ "incr" := #1; "decr" := #0 })%jessie =
      Obj [("incr", LitNat 1); ("decr", LitNat 0)].
  Proof. reflexivity. Qed.

  Example get_smoke :
    ({ "incr" := #1 }).["incr"]%jessie = Get (Obj [("incr", LitNat 1)]) "incr".
  Proof. reflexivity. Qed.

  Example last_field_wins_smoke :
    lookup_field_last "incr"
      [("incr", LitNat 1); ("decr", LitNat 0); ("incr", LitNat 2)] =
      Some (LitNat 2).
  Proof. reflexivity. Qed.

  Example custom_entry_app_get_smoke :
    <{ { "incr" := fn: <> => #1 }.["incr"] #() }> =
      App
        (Get (Obj [("incr", Lam BAnon (LitNat 1))]) "incr")
        LitUnit.
  Proof. reflexivity. Qed.
End JessieLang.
