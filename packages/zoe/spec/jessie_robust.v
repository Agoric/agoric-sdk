(* OCPL-style goodness and adversary scaffolding for the minimal language. *)
From Coq Require Import List String ZArith.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.
Open Scope jessie_scope.

Module JessieRobust.
  Import JessieLang.

  (* OCPL-style goodness bit: verified code uses `assert:`, adversarial code
     does not, and failed assertions flip the monitor to a bad state. *)
  Definition good_state := bool.
  Definition initial_good_state : good_state := true.
  Definition bad_state : good_state := false.
  Definition is_good (σ : good_state) : Prop := σ = true.

  Definition add_binder (b : binder) (Γ : list string) : list string :=
    match b with
    | BAnon => Γ
    | BNamed x => x :: Γ
    end.

  Inductive AdvExpr : list string -> expr -> Prop :=
  | AdvVar Γ x :
      In x Γ ->
      AdvExpr Γ (Var x)
  | AdvLitNat Γ n :
      AdvExpr Γ (LitNat n)
  | AdvLitUnit Γ :
      AdvExpr Γ LitUnit
  | AdvRec Γ f x e :
      AdvExpr (add_binder x (add_binder f Γ)) e ->
      AdvExpr Γ (Rec f x e)
  | AdvApp Γ e1 e2 :
      AdvExpr Γ e1 ->
      AdvExpr Γ e2 ->
      AdvExpr Γ (App e1 e2)
  | AdvLetIn Γ x e1 e2 :
      AdvExpr Γ e1 ->
      AdvExpr (add_binder x Γ) e2 ->
      AdvExpr Γ (LetIn x e1 e2)
  | AdvObj Γ fields :
      AdvFields Γ fields ->
      AdvExpr Γ (Obj fields)
  | AdvGet Γ e field :
      AdvExpr Γ e ->
      AdvExpr Γ (Get e field)
  | AdvAlloc Γ e :
      AdvExpr Γ e ->
      AdvExpr Γ (Alloc e)
  | AdvLoad Γ e :
      AdvExpr Γ e ->
      AdvExpr Γ (Load e)
  | AdvStore Γ e1 e2 :
      AdvExpr Γ e1 ->
      AdvExpr Γ e2 ->
      AdvExpr Γ (Store e1 e2)
  | AdvBinOp Γ op e1 e2 :
      AdvExpr Γ e1 ->
      AdvExpr Γ e2 ->
      AdvExpr Γ (BinOp op e1 e2)
  with AdvFields : list string -> list (string * expr) -> Prop :=
  | AdvFieldsNil Γ :
      AdvFields Γ []
  | AdvFieldsCons Γ k e fields :
      AdvExpr Γ e ->
      AdvFields Γ fields ->
      AdvFields Γ ((k, e) :: fields).

  Inductive ctx :=
  | CHole
  | CRec (f x : binder) (C : ctx)
  | CAppL (C : ctx) (e2 : expr)
  | CAppR (e1 : expr) (C : ctx)
  | CLetIn (x : binder) (C : ctx) (e2 : expr)
  | CObjField (done : list (string * expr)) (key : string) (C : ctx)
      (pending : list (string * expr))
  | CGet (C : ctx) (field : string)
  | CAlloc (C : ctx)
  | CLoad (C : ctx)
  | CStoreL (C : ctx) (e2 : expr)
  | CStoreR (e1 : expr) (C : ctx)
  | CAssert (C : ctx)
  | CBinOpL (op : binop) (C : ctx) (e2 : expr)
  | CBinOpR (op : binop) (e1 : expr) (C : ctx).

  Fixpoint fill (C : ctx) (e : expr) : expr :=
    match C with
    | CHole => e
    | CRec f x C => Rec f x (fill C e)
    | CAppL C e2 => App (fill C e) e2
    | CAppR e1 C => App e1 (fill C e)
    | CLetIn x C e2 => LetIn x (fill C e) e2
    | CObjField done key C pending =>
        Obj (done ++ (key, fill C e) :: pending)
    | CGet C field => Get (fill C e) field
    | CAlloc C => Alloc (fill C e)
    | CLoad C => Load (fill C e)
    | CStoreL C e2 => Store (fill C e) e2
    | CStoreR e1 C => Store e1 (fill C e)
    | CAssert C => Assert (fill C e)
    | CBinOpL op C e2 => BinOp op (fill C e) e2
    | CBinOpR op e1 C => BinOp op e1 (fill C e)
    end.

  Definition AdvCtxOn (x : string) (C : ctx) : Prop :=
    AdvExpr [x] (fill C x).

  Definition AdvCtx (C : ctx) : Prop :=
    AdvCtxOn "arg" C.

  Definition attacker_body (x : string) (C : ctx) : expr :=
    fill C x.

  Example hole_is_adversarial :
    AdvCtx CHole.
  Proof. unfold AdvCtx. constructor. simpl. auto. Qed.

  Example projected_field_is_adversarial :
    AdvExpr ["arg"] ("arg".["field"])%jessie.
  Proof. econstructor. constructor. simpl. auto. Qed.

  Example single_field_call_ctx_is_adversarial :
    AdvCtx (CAppL (CGet CHole "field") #()).
  Proof.
    unfold AdvCtx; simpl.
    econstructor.
    - econstructor. constructor. simpl. auto.
    - constructor.
  Qed.

  Definition robust_safety_goal
      (exported : string)
      (build_client : expr -> expr)
      (monitored_eval : expr -> good_state) : Prop :=
    forall C, AdvCtxOn exported C ->
      is_good (monitored_eval (build_client (attacker_body exported C))).

  (* TODO: instantiate robust_safety_goal for concrete case studies such as
     makeCounter, where `build_client` links verified code against an attacker
     body produced by `attacker_body exported C`. *)
End JessieRobust.
