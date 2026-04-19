From Coq Require Import List String ZArith.
From iris.program_logic Require Export language ectx_language.

Import ListNotations.
Open Scope Z_scope.
Open Scope string_scope.

Inductive jval :=
| JNull
| JBool (b : bool)
| JNum (n : Z)
| JStr (s : string)
| JArr (xs : list jval)
| JObj (fields : list (string * jval)).

Inductive json_expr :=
| JsonLit (v : jval).

Definition json_val := jval.
Definition json_state := unit.
Definition json_observation := unit.
Definition json_ectx := unit.

Definition json_of_val (v : json_val) : json_expr := JsonLit v.

Definition json_to_val (e : json_expr) : option json_val :=
  match e with
  | JsonLit v => Some v
  end.

Definition json_empty_ectx : json_ectx := tt.

Definition json_comp_ectx (_ _ : json_ectx) : json_ectx := tt.

Definition json_fill (_ : json_ectx) (e : json_expr) : json_expr := e.

Inductive json_base_step :
  json_expr ->
  json_state ->
  list json_observation ->
  json_expr ->
  json_state ->
  list json_expr ->
  Prop :=.

Lemma json_to_of_val v :
  json_to_val (json_of_val v) = Some v.
Proof. reflexivity. Qed.

Lemma json_of_to_val e v :
  json_to_val e = Some v -> json_of_val v = e.
Proof.
  destruct e as [v']; simpl.
  intros [= <-].
  reflexivity.
Qed.

Lemma json_fill_empty e :
  json_fill json_empty_ectx e = e.
Proof. reflexivity. Qed.

Lemma json_fill_comp K1 K2 e :
  json_fill K1 (json_fill K2 e) = json_fill (json_comp_ectx K1 K2) e.
Proof. reflexivity. Qed.

Global Instance json_fill_inj K :
  Inj (=) (=) (json_fill K).
Proof. intros e1 e2 H; exact H. Qed.

Lemma json_fill_val K e :
  is_Some (json_to_val (json_fill K e)) -> is_Some (json_to_val e).
Proof. exact (fun H => H). Qed.

Lemma json_ectx_mixin :
  EctxLanguageMixin
    json_of_val
    json_to_val
    json_empty_ectx
    json_comp_ectx
    json_fill
    json_base_step.
Proof.
  split.
  - exact json_to_of_val.
  - exact json_of_to_val.
  - intros ?????? Hstep. inversion Hstep.
  - exact json_fill_empty.
  - exact json_fill_comp.
  - exact json_fill_inj.
  - exact json_fill_val.
  - intros K' K_redex e1' e1_redex σ1 κ e2 σ2 efs Heq Hnval Hstep.
    inversion Hstep.
  - intros K e σ1 κ e2 σ2 efs Hstep.
    inversion Hstep.
Qed.

Canonical Structure json_ectx_lang : ectxLanguage :=
  @EctxLanguage
    json_expr
    json_val
    json_ectx
    json_state
    json_observation
    json_of_val
    json_to_val
    json_empty_ectx
    json_comp_ectx
    json_fill
    json_base_step
    json_ectx_mixin.

Canonical Structure json_lang := LanguageOfEctx json_ectx_lang.

Lemma json_expr_is_value e :
  exists v, json_to_val e = Some v.
Proof. destruct e; eexists; reflexivity. Qed.

Lemma json_irreducible e σ :
  irreducible (Λ := json_lang) e σ.
Proof.
  intros κ e' σ' efs Hstep.
  destruct Hstep as [K e1' e2' He1 He2 Hbase].
  inversion Hbase.
Qed.

Module Justin.

  Definition loc := nat.

  Inductive ty :=
  | TyUnknown
  | TyNull
  | TyBool
  | TyNumber
  | TyBigInt
  | TyString
  | TyObject
  | TyPrim
  | TyUndefined.

  Definition refine_env := list (string * ty).

  Inductive val :=
  | VJson (v : jval)
  | VBigInt (n : Z)
  | VUndefined
  | VLoc (l : loc)
  | VPrim (name : string).

  Inductive expr :=
  | Lit (v : val)
  | Var (x : string)
  | Obj (fields : list (string * expr))
  | Get (e : expr) (field : string)
  | App (f : expr) (args : list expr)
  | LetIn (x : string) (rhs body : expr)
  | TypeOf (e : expr)
  | Cond (e0 e1 e2 : expr)
  | EqStrict (e1 e2 : expr)
  | Add (e1 e2 : expr).

  Inductive resolved_binop :=
  | ConcatStr
  | AddNum
  | EqStrictOp.

  Inductive core_expr :=
  | CoreLit (v : val)
  | CoreVar (x : string)
  | CoreAllocObj (fields : list (string * core_expr))
  | CoreGet (e : core_expr) (field : string)
  | CoreApp (f : core_expr) (args : list core_expr)
  | CoreLetIn (x : string) (rhs body : core_expr)
  | CoreTypeOf (e : core_expr)
  | CoreCond (e0 e1 e2 : core_expr)
  | CoreBinop (op : resolved_binop) (e1 e2 : core_expr)
  | CoreBzzt.

  Definition empty_env : refine_env := [].

  Fixpoint lookup_ty (Γ : refine_env) (x : string) : ty :=
    match Γ with
    | [] => TyUnknown
    | (y, τ) :: Γ' => if String.eqb x y then τ else lookup_ty Γ' x
    end.

  Definition bind_ty (Γ : refine_env) (x : string) (τ : ty) : refine_env :=
    (x, τ) :: Γ.

  Definition typeof_json (v : jval) : string :=
    match v with
    | JNull => "object"
    | JBool _ => "boolean"
    | JNum _ => "number"
    | JStr _ => "string"
    | JArr _ => "object"
    | JObj _ => "object"
    end.

  Definition typeof_val (v : val) : string :=
    match v with
    | VJson jv => typeof_json jv
    | VBigInt _ => "bigint"
    | VUndefined => "undefined"
    | VLoc _ => "object"
    | VPrim _ => "function"
    end.

  Definition classify_val (v : val) : ty :=
    match v with
    | VJson JNull => TyNull
    | VJson (JBool _) => TyBool
    | VJson (JNum _) => TyNumber
    | VJson (JStr _) => TyString
    | VJson (JArr _) => TyObject
    | VJson (JObj _) => TyObject
    | VBigInt _ => TyBigInt
    | VUndefined => TyUndefined
    | VLoc _ => TyObject
    | VPrim _ => TyPrim
    end.

  Definition ty_of_typeof_tag (tag : string) : option ty :=
    if String.eqb tag "string" then Some TyString else
    if String.eqb tag "number" then Some TyNumber else
    if String.eqb tag "bigint" then Some TyBigInt else
    if String.eqb tag "boolean" then Some TyBool else
    if String.eqb tag "object" then Some TyObject else
    if String.eqb tag "function" then Some TyPrim else
    if String.eqb tag "undefined" then Some TyUndefined else
    if String.eqb tag "null" then Some TyNull else
    None.

  Definition refine_typeof_branch
      (Γ : refine_env) (x tag : string) : option refine_env :=
    match ty_of_typeof_tag tag with
    | Some τ => Some (bind_ty Γ x τ)
    | None => None
    end.

  Inductive elaborates : refine_env -> expr -> core_expr -> Prop :=
  | ElabLit Γ v :
      elaborates Γ (Lit v) (CoreLit v)
  | ElabVar Γ x :
      elaborates Γ (Var x) (CoreVar x)
  | ElabTypeOf Γ e e' :
      elaborates Γ e e' ->
      elaborates Γ (TypeOf e) (CoreTypeOf e')
  | ElabEqStrict Γ e1 e2 e1' e2' :
      elaborates Γ e1 e1' ->
      elaborates Γ e2 e2' ->
      elaborates Γ (EqStrict e1 e2) (CoreBinop EqStrictOp e1' e2')
  | ElabCond Γ e0 e1 e2 e0' e1' e2' :
      elaborates Γ e0 e0' ->
      elaborates Γ e1 e1' ->
      elaborates Γ e2 e2' ->
      elaborates Γ (Cond e0 e1 e2) (CoreCond e0' e1' e2')
  | ElabAddString Γ x y y' :
      lookup_ty Γ x = TyString ->
      elaborates Γ y y' ->
      elaborates Γ (Add (Var x) y) (CoreBinop ConcatStr (CoreVar x) y')
  | ElabAddNumber Γ x y y' :
      lookup_ty Γ x = TyNumber ->
      elaborates Γ y y' ->
      elaborates Γ (Add (Var x) y) (CoreBinop AddNum (CoreVar x) y').

  Example lookup_ty_miss :
    lookup_ty empty_env "x" = TyUnknown.
  Proof. reflexivity. Qed.

  Example refine_string_branch :
    refine_typeof_branch empty_env "x" "string" = Some [("x", TyString)].
  Proof. reflexivity. Qed.

  Example classify_prim :
    classify_val (VPrim "harden") = TyPrim.
  Proof. reflexivity. Qed.

  Example typeof_null_is_object :
    typeof_val (VJson JNull) = "object".
  Proof. reflexivity. Qed.

  Example classify_bigint :
    classify_val (VBigInt 9898) = TyBigInt.
  Proof. reflexivity. Qed.

End Justin.

Module JessieSurface.
  Import Justin.

  Inductive expr :=
  | Base (e : Justin.expr)
  | Obj (fields : list (string * expr))
  | Get (e : expr) (field : string)
  | Call (f : expr) (args : list expr)
  | Arrow0 (body : stmt)
  | AssignAdd (x : string) (delta : Z)
  | EqStrict (e1 e2 : expr)
  | Harden (e : expr)
  with stmt :=
  | SConst (x : string) (rhs : expr)
  | SLet (x : string) (rhs : expr)
  | SReturn (e : expr)
  | SExpr (e : expr)
  | SBlock (ss : list stmt).

  Definition program := list stmt.
End JessieSurface.
