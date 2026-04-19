(* Public client syntax that cannot forge locations or primitive references. *)
From Coq Require Import List String.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.

Module JessiePublic.
  Import Justin.

  Inductive expr :=
  | Lit (l : lit)
  | Var (x : string)
  | Obj (fields : list (string * expr))
  | Get (e : expr) (field : string)
  | App (f : expr) (args : list expr)
  | LetIn (x : string) (rhs body : expr)
  | TypeOf (e : expr)
  | Cond (e0 e1 e2 : expr)
  | Binop (op : resolved_binop) (e1 e2 : expr)
  | Bzzt.

  Fixpoint compile (e : expr) : core_expr :=
    match e with
    | Lit l => CoreVal (VLit l)
    | Var x => CoreVar x
    | Obj fields =>
        CoreAllocObj (map (fun kv => (fst kv, compile (snd kv))) fields)
    | Get e1 field => CoreGet (compile e1) field
    | App f args => CoreApp (compile f) (map compile args)
    | LetIn x rhs body => CoreLetIn x (compile rhs) (compile body)
    | TypeOf e1 => CoreTypeOf (compile e1)
    | Cond e0 e1 e2 => CoreCond (compile e0) (compile e1) (compile e2)
    | Binop op e1 e2 => CoreBinop op (compile e1) (compile e2)
    | Bzzt => CoreBzzt
    end.

  Example public_expr_cannot_spell_locations :
    compile (Var "counter") = CoreVar "counter".
  Proof. reflexivity. Qed.

  Example public_expr_uses_only_literal_values :
    compile (App (Var "assert")
      [Binop EqStrictOp (Lit (LJson (JNum 2))) (Lit (LJson (JNum 2)))]) =
      CoreApp (CoreVar "assert")
        [CoreBinop EqStrictOp
          (CoreVal (VLit (LJson (JNum 2))))
          (CoreVal (VLit (LJson (JNum 2))))].
  Proof. reflexivity. Qed.
End JessiePublic.
