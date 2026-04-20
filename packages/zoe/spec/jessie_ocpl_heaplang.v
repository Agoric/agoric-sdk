(* OCPL-style adversary/context layer, adapted to modern Iris HeapLang. *)
From Coq Require Import Bool.
From iris.proofmode Require Import proofmode.
From iris.heap_lang Require Export lang metatheory.
From iris.heap_lang Require Import notation.
From iris.heap_lang.lib Require Import assert.

Module JessieOcplHeapLang.
  Open Scope expr_scope.

  (* OCPL reserves assertions for verified code. In modern HeapLang, `assert: e`
     expands to application of the library value `assert`, so the adversary
     filter must exclude that value explicitly rather than by matching a
     dedicated AST constructor. *)
  Definition allowed_val (v : val) : bool :=
    bool_decide (v ≠ assert).

  Section adversary.
    Context {Σ : gFunctors}.
    Variable loc_ok : loc -> iProp Σ.

    Fixpoint adv_val (v : val) : iProp Σ :=
      ⌜allowed_val v = true⌝ ∗
      match v with
      | LitV (LitLoc l) => loc_ok l
      | LitV _ => True
      | RecV _ _ e => adv_expr e
      | PairV v1 v2 => adv_val v1 ∗ adv_val v2
      | InjLV v | InjRV v => adv_val v
      end
    with adv_expr (e : expr) : iProp Σ :=
      match e with
      | Val v => adv_val v
      | Var _ => True
      | Rec _ _ e => adv_expr e
      | App e1 e2 => adv_expr e1 ∗ adv_expr e2
      | UnOp _ e => adv_expr e
      | BinOp _ e1 e2 => adv_expr e1 ∗ adv_expr e2
      | If e0 e1 e2 => adv_expr e0 ∗ adv_expr e1 ∗ adv_expr e2
      | Pair e1 e2 => adv_expr e1 ∗ adv_expr e2
      | Fst e | Snd e | InjL e | InjR e | Free e | Load e | Fork e => adv_expr e
      | Case e0 e1 e2 => adv_expr e0 ∗ adv_expr e1 ∗ adv_expr e2
      | AllocN e1 e2 | Store e1 e2 | Xchg e1 e2 | FAA e1 e2 =>
          adv_expr e1 ∗ adv_expr e2
      | CmpXchg e0 e1 e2 | Resolve e0 e1 e2 =>
          adv_expr e0 ∗ adv_expr e1 ∗ adv_expr e2
      | NewProph => True
      end.
  End adversary.

  Inductive ctx :=
  | CHole
  | CRec (f x : binder) (C : ctx)
  | CAppL (C : ctx) (e2 : expr)
  | CAppR (e1 : expr) (C : ctx)
  | CUnOp (op : un_op) (C : ctx)
  | CBinOpL (op : bin_op) (C : ctx) (e2 : expr)
  | CBinOpR (op : bin_op) (e1 : expr) (C : ctx)
  | CIf (C0 : ctx) (e1 e2 : expr)
  | CPairL (C : ctx) (e2 : expr)
  | CPairR (e1 : expr) (C : ctx)
  | CFst (C : ctx)
  | CSnd (C : ctx)
  | CInjL (C : ctx)
  | CInjR (C : ctx)
  | CCase (C0 : ctx) (e1 e2 : expr)
  | CAllocNL (C : ctx) (e2 : expr)
  | CAllocNR (e1 : expr) (C : ctx)
  | CFree (C : ctx)
  | CLoad (C : ctx)
  | CStoreL (C : ctx) (e2 : expr)
  | CStoreR (e1 : expr) (C : ctx)
  | CXchgL (C : ctx) (e2 : expr)
  | CXchgR (e1 : expr) (C : ctx)
  | CCmpXchgL (C : ctx) (e1 e2 : expr)
  | CCmpXchgM (e0 : expr) (C : ctx) (e2 : expr)
  | CCmpXchgR (e0 e1 : expr) (C : ctx)
  | CFAAL (C : ctx) (e2 : expr)
  | CFAAR (e1 : expr) (C : ctx)
  | CFork (C : ctx)
  | CResolve0 (C : ctx) (e1 e2 : expr)
  | CResolve1 (e0 : expr) (C : ctx) (e2 : expr)
  | CResolve2 (e0 e1 : expr) (C : ctx).

  Fixpoint ctx_fill (C : ctx) (e : expr) : expr :=
    let rec := ctx_fill in
    match C with
    | CHole => e
    | CRec f x C => Rec f x (rec C e)
    | CAppL C e2 => App (rec C e) e2
    | CAppR e1 C => App e1 (rec C e)
    | CUnOp op C => UnOp op (rec C e)
    | CBinOpL op C e2 => BinOp op (rec C e) e2
    | CBinOpR op e1 C => BinOp op e1 (rec C e)
    | CIf C0 e1 e2 => If (rec C0 e) e1 e2
    | CPairL C e2 => Pair (rec C e) e2
    | CPairR e1 C => Pair e1 (rec C e)
    | CFst C => Fst (rec C e)
    | CSnd C => Snd (rec C e)
    | CInjL C => InjL (rec C e)
    | CInjR C => InjR (rec C e)
    | CCase C0 e1 e2 => Case (rec C0 e) e1 e2
    | CAllocNL C e2 => AllocN (rec C e) e2
    | CAllocNR e1 C => AllocN e1 (rec C e)
    | CFree C => Free (rec C e)
    | CLoad C => Load (rec C e)
    | CStoreL C e2 => Store (rec C e) e2
    | CStoreR e1 C => Store e1 (rec C e)
    | CXchgL C e2 => Xchg (rec C e) e2
    | CXchgR e1 C => Xchg e1 (rec C e)
    | CCmpXchgL C e1 e2 => CmpXchg (rec C e) e1 e2
    | CCmpXchgM e0 C e2 => CmpXchg e0 (rec C e) e2
    | CCmpXchgR e0 e1 C => CmpXchg e0 e1 (rec C e)
    | CFAAL C e2 => FAA (rec C e) e2
    | CFAAR e1 C => FAA e1 (rec C e)
    | CFork C => Fork (rec C e)
    | CResolve0 C e1 e2 => Resolve (rec C e) e1 e2
    | CResolve1 e0 C e2 => Resolve e0 (rec C e) e2
    | CResolve2 e0 e1 C => Resolve e0 e1 (rec C e)
    end.

  Section adversary_ctx.
    Context {Σ : gFunctors}.
    Variable loc_ok : loc -> iProp Σ.

    Fixpoint adv_ctx (C : ctx) : iProp Σ :=
      match C with
      | CHole => True
      | CRec _ _ C | CUnOp _ C | CFst C | CSnd C | CInjL C | CInjR C
      | CFree C | CLoad C | CFork C => adv_ctx C
      | CAppL C e2 | CBinOpL _ C e2 | CPairL C e2 | CAllocNL C e2
      | CStoreL C e2 | CXchgL C e2 | CFAAL C e2 =>
          adv_ctx C ∗ adv_expr loc_ok e2
      | CAppR e1 C | CBinOpR _ e1 C | CPairR e1 C | CAllocNR e1 C
      | CStoreR e1 C | CXchgR e1 C | CFAAR e1 C =>
          adv_expr loc_ok e1 ∗ adv_ctx C
      | CIf C0 e1 e2 | CCase C0 e1 e2 | CCmpXchgL C0 e1 e2
      | CResolve0 C0 e1 e2 =>
          adv_ctx C0 ∗ adv_expr loc_ok e1 ∗ adv_expr loc_ok e2
      | CCmpXchgM e0 C1 e2 | CResolve1 e0 C1 e2 =>
          adv_expr loc_ok e0 ∗ adv_ctx C1 ∗ adv_expr loc_ok e2
      | CCmpXchgR e0 e1 C2 | CResolve2 e0 e1 C2 =>
          adv_expr loc_ok e0 ∗ adv_expr loc_ok e1 ∗ adv_ctx C2
      end.
  End adversary_ctx.

  Fixpoint of_ectx_item (Ki : ectx_item) (C : ctx) : ctx :=
    match Ki with
    | AppLCtx v2 => CAppL C (Val v2)
    | AppRCtx e1 => CAppR e1 C
    | UnOpCtx op => CUnOp op C
    | BinOpLCtx op v2 => CBinOpL op C (Val v2)
    | BinOpRCtx op e1 => CBinOpR op e1 C
    | IfCtx e1 e2 => CIf C e1 e2
    | PairLCtx v2 => CPairL C (Val v2)
    | PairRCtx e1 => CPairR e1 C
    | FstCtx => CFst C
    | SndCtx => CSnd C
    | InjLCtx => CInjL C
    | InjRCtx => CInjR C
    | CaseCtx e1 e2 => CCase C e1 e2
    | AllocNLCtx v2 => CAllocNL C (Val v2)
    | AllocNRCtx e1 => CAllocNR e1 C
    | FreeCtx => CFree C
    | LoadCtx => CLoad C
    | StoreLCtx v2 => CStoreL C (Val v2)
    | StoreRCtx e1 => CStoreR e1 C
    | XchgLCtx v2 => CXchgL C (Val v2)
    | XchgRCtx e1 => CXchgR e1 C
    | CmpXchgLCtx v1 v2 => CCmpXchgL C (Val v1) (Val v2)
    | CmpXchgMCtx e0 v2 => CCmpXchgM e0 C (Val v2)
    | CmpXchgRCtx e0 e1 => CCmpXchgR e0 e1 C
    | FaaLCtx v2 => CFAAL C (Val v2)
    | FaaRCtx e1 => CFAAR e1 C
    | ResolveLCtx Ki v1 v2 => of_ectx_item Ki (CResolve0 C (Val v1) (Val v2))
    | ResolveMCtx e0 v2 => CResolve1 e0 C (Val v2)
    | ResolveRCtx e0 e1 => CResolve2 e0 e1 C
    end.

  Definition of_ectx : list ectx_item -> ctx := fold_right of_ectx_item CHole.

  Example ctx_fill_hole e :
    ctx_fill CHole e = e.
  Proof. reflexivity. Qed.

  Example allowed_val_blocks_assert :
    allowed_val assert = false.
  Proof.
    unfold allowed_val.
    apply bool_decide_false.
    congruence.
  Qed.

  Example of_ectx_smoke :
    ctx_fill (of_ectx [AppLCtx #(); FstCtx]) "f" = (Fst "f") #().
  Proof. reflexivity. Qed.
End JessieOcplHeapLang.
