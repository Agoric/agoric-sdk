(* Modernized OCPL-style adversary/context layer for current Iris HeapLang. *)
From Coq Require Import Bool.
From iris.proofmode Require Import proofmode.
From iris.base_logic.lib Require Export invariants.
From iris.program_logic Require Export weakestpre.
From iris.heap_lang Require Export lang primitive_laws metatheory adequacy.
From iris.heap_lang Require Import notation proofmode tactics.
From iris.heap_lang.lib Require Import assert.
From OCPL Require Import modern_heap modern_lifting modern_on_val.

Module OCPLModernRobustSafety.
  Import OCPLModernHeap OCPLModernLifting OCPLModernOnVal.
  Open Scope expr_scope.

  (* TODO: keep HeapLang as the proof foundation, but add a tiny Jessie surface
     language with `Obj` / `Get` that desugars into HeapLang terms. That is the
     right way to recover JS-like object notation without giving up strong reuse. *)

  (* OCPL reserves assertions for verified code. In modern HeapLang, `assert: e`
     expands to application of the library value `assert`, so the adversary
     filter must exclude that value explicitly rather than by matching a
     dedicated AST constructor. *)
  Definition allowed_val (v : val) : bool :=
    bool_decide (v ≠ assert).

  Class Adversarial Σ (A : Type) := Adv {
    adv : A -> iProp Σ;
    #[global] adv_ne n :: Proper ((=) ==> dist n) adv
  }.
  Arguments Adv {_ _} _ _.
  Arguments adv {_ _ _} _ : simpl never.
  Instance: Params (@adv) 3 := {}.

  Global Instance adv_proper `{Adversarial Σ A} :
    Proper ((=) ==> (≡)) adv.
  Proof. solve_proper. Qed.

  Section adversary.
    Context {Σ : gFunctors}.
    Context `{!LowIntegrity Σ loc}.

    Fixpoint advval (v : val) : iProp Σ :=
      ⌜allowed_val v = true⌝ ∗
      match v with
      | LitV (LitLoc l) => low l
      | LitV _ => True
      | RecV _ _ e => advexpr e
      | PairV v1 v2 => advval v1 ∗ advval v2
      | InjLV v | InjRV v => advval v
      end
    with advexpr (e : expr) : iProp Σ :=
      match e with
      | Val v => advval v
      | Var _ => True
      | Rec _ _ e => advexpr e
      | App e1 e2 => advexpr e1 ∗ advexpr e2
      | UnOp _ e => advexpr e
      | BinOp _ e1 e2 => advexpr e1 ∗ advexpr e2
      | If e0 e1 e2 => advexpr e0 ∗ advexpr e1 ∗ advexpr e2
      | Pair e1 e2 => advexpr e1 ∗ advexpr e2
      | Fst e | Snd e | InjL e | InjR e | Free e | Load e | Fork e => advexpr e
      | Case e0 e1 e2 => advexpr e0 ∗ advexpr e1 ∗ advexpr e2
      | AllocN e1 e2 | Store e1 e2 | Xchg e1 e2 | FAA e1 e2 =>
          advexpr e1 ∗ advexpr e2
      | CmpXchg e0 e1 e2 | Resolve e0 e1 e2 =>
          advexpr e0 ∗ advexpr e1 ∗ advexpr e2
      | NewProph => True
      end.

    Global Instance advexpr_adv : Adversarial Σ expr := Adv advexpr _.
    Global Instance advval_adv : Adversarial Σ val := Adv advval _.

    Lemma adv_expr e :
      adv e ⊣⊢ advexpr e.
    Proof. done. Qed.

    Lemma adv_val v :
      adv v ⊣⊢ advval v.
    Proof. done. Qed.
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
    Context `{!LowIntegrity Σ loc}.

    Fixpoint advctx (C : ctx) : iProp Σ :=
      match C with
      | CHole => True
      | CRec _ _ C | CUnOp _ C | CFst C | CSnd C | CInjL C | CInjR C
      | CFree C | CLoad C | CFork C => advctx C
      | CAppL C e2 | CBinOpL _ C e2 | CPairL C e2 | CAllocNL C e2
      | CStoreL C e2 | CXchgL C e2 | CFAAL C e2 =>
          advctx C ∗ advexpr e2
      | CAppR e1 C | CBinOpR _ e1 C | CPairR e1 C | CAllocNR e1 C
      | CStoreR e1 C | CXchgR e1 C | CFAAR e1 C =>
          advexpr e1 ∗ advctx C
      | CIf C0 e1 e2 | CCase C0 e1 e2 | CCmpXchgL C0 e1 e2
      | CResolve0 C0 e1 e2 =>
          advctx C0 ∗ advexpr e1 ∗ advexpr e2
      | CCmpXchgM e0 C1 e2 | CResolve1 e0 C1 e2 =>
          advexpr e0 ∗ advctx C1 ∗ advexpr e2
      | CCmpXchgR e0 e1 C2 | CResolve2 e0 e1 C2 =>
          advexpr e0 ∗ advexpr e1 ∗ advctx C2
      end.

    Global Instance advctx_adv : Adversarial Σ ctx := Adv advctx _.

    Lemma adv_ctx C :
      adv C ⊣⊢ advctx C.
    Proof. done. Qed.
  End adversary_ctx.

  Section ftlr.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Context `{!LowIntegrity Σ loc}.

    Definition confined (e : expr) : iProp Σ :=
      ∀ γ, low γ -∗ advexpr e -∗
        WP (subst_map γ e) @ MaybeStuck; ⊤ {{ v, low v }}.

    Lemma confined_var x :
      ⊢ confined (Var x).
    Proof.
      iIntros (γ) "Hγ _".
      rewrite /confined /=.
      destruct (γ !! x) as [v|] eqn:Hlookup.
      - iApply wp_value.
        by iApply (low_env_lookup with "Hγ").
      - by iApply (wp_stuck_var with "[]").
    Qed.

    Lemma confined_app e1 e2 :
      confined e1 ∗ confined e2 -∗ confined (App e1 e2).
    Proof.
      iIntros "[IHe1 IHe2]" (γ) "#Hγ Happ".
      rewrite /confined /=.
      iDestruct "Happ" as "[He1 He2]".
      iPoseProof ("IHe1" $! γ with "Hγ He1") as "Hwp1".
      iPoseProof ("IHe2" $! γ with "Hγ He2") as "Hwp2".
      iApply (wp_on_val_app_bind ⊤ (subst_map γ e1) (subst_map γ e2) with "Hwp1 Hwp2").
    Qed.

    Lemma confined_pair e1 e2 :
      confined e1 ∗ confined e2 -∗ confined (Pair e1 e2).
    Proof.
      iIntros "[IHe1 IHe2]" (γ) "#Hγ Hp".
      rewrite /confined /=.
      iDestruct "Hp" as "[He1 He2]".
      iPoseProof ("IHe1" $! γ with "Hγ He1") as "Hwp1".
      iPoseProof ("IHe2" $! γ with "Hγ He2") as "Hwp2".
      iApply (wp_on_val_pair_bind ⊤ (subst_map γ e1) (subst_map γ e2) with "Hwp1 Hwp2").
    Qed.

    Lemma confined_fst e :
      confined e -∗ confined (Fst e).
    Proof.
      iIntros "IHe" (γ) "#Hγ He".
      rewrite /confined /=.
      iPoseProof ("IHe" $! γ with "Hγ He") as "Hwp".
      iApply (wp_on_val_fst_bind ⊤ (subst_map γ e)).
      iExact "Hwp".
    Qed.

    Lemma confined_snd e :
      confined e -∗ confined (Snd e).
    Proof.
      iIntros "IHe" (γ) "#Hγ He".
      rewrite /confined /=.
      iPoseProof ("IHe" $! γ with "Hγ He") as "Hwp".
      iApply (wp_on_val_snd_bind ⊤ (subst_map γ e)).
      iExact "Hwp".
    Qed.

    Lemma confined_inl e :
      confined e -∗ confined (InjL e).
    Proof.
      iIntros "IHe" (γ) "#Hγ He".
      rewrite /confined /=.
      iPoseProof ("IHe" $! γ with "Hγ He") as "Hwp".
      iApply (wp_on_val_inl_bind ⊤ (subst_map γ e)).
      iExact "Hwp".
    Qed.

    Lemma confined_inr e :
      confined e -∗ confined (InjR e).
    Proof.
      iIntros "IHe" (γ) "#Hγ He".
      rewrite /confined /=.
      iPoseProof ("IHe" $! γ with "Hγ He") as "Hwp".
      iApply (wp_on_val_inr_bind ⊤ (subst_map γ e)).
      iExact "Hwp".
    Qed.

    (* TODO: port upstream `confined_case` once the modern `wp_on_val_case_bind`
       continuation pattern is nailed down for current Iris proofmode. *)
  End ftlr.

  Section robust_safety.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Context `{!LowIntegrity Σ loc}.

    Definition verified (s : stuckness) (e : expr) : iProp Σ :=
      □ (⌜is_closed_expr ∅ e = true⌝ ∗ WP e @ s; ⊤ {{ v, low v }}).

    Definition safe (C : ctx) : iProp Σ :=
      ∀ γ s e, advctx C -∗ low γ -∗ verified s e -∗
        WP (subst_map γ (ctx_fill C e)) @ s; ⊤ {{ v, low v }}.

    Lemma safe_alt C :
      safe C ⊣⊢
      ∀ γ s e Φ, advctx C -∗ low γ -∗ verified s e -∗
        (∀ v, low v -∗ Φ v) -∗
        WP (subst_map γ (ctx_fill C e)) @ s; ⊤ {{ Φ }}.
    Proof.
      iSplit.
      - iIntros "Hsafe" (γ s e Φ) "HC Hγ He HΦ".
        iPoseProof ("Hsafe" $! γ s e with "HC Hγ He") as "Hs".
        iApply (wp_wand with "Hs").
        iIntros (v) "Hv".
        by iApply ("HΦ" with "Hv").
      - iIntros "Halt" (γ s e) "HC Hγ He".
        iApply ("Halt" with "HC Hγ He []").
        by iIntros (v) "Hv".
    Qed.

    Lemma safe_hole :
      ⊢ safe CHole.
    Proof.
      iIntros (γ s e) "_ #Hγ #He".
      rewrite /verified /safe /ctx_fill /=.
      iDestruct "He" as "#(%Hclosed & He)".
      assert (is_closed_expr ∅ e) as Hclosed'.
      { by rewrite Hclosed. }
      rewrite (subst_map_is_closed_empty e γ Hclosed').
      iExact "He".
    Qed.
  End robust_safety.

  (* TODO: the next port step is to reintroduce OCPL's `confined`
     constructor lemmas here, now using `modern_on_val.v` as the underlying
     value-elimination layer. *)

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

  Fixpoint to_ectx (C : ctx) : option (list ectx_item) :=
    match C with
    | CHole => Some []
    | CAppL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (AppLCtx v2 :: K)
        | _, _ => None
        end
    | CAppR e1 C =>
        match to_ectx C with
        | Some K => Some (AppRCtx e1 :: K)
        | None => None
        end
    | CUnOp op C =>
        match to_ectx C with
        | Some K => Some (UnOpCtx op :: K)
        | None => None
        end
    | CBinOpL op C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (BinOpLCtx op v2 :: K)
        | _, _ => None
        end
    | CBinOpR op e1 C =>
        match to_ectx C with
        | Some K => Some (BinOpRCtx op e1 :: K)
        | None => None
        end
    | CIf C0 e1 e2 =>
        match to_ectx C0 with
        | Some K => Some (IfCtx e1 e2 :: K)
        | None => None
        end
    | CPairL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (PairLCtx v2 :: K)
        | _, _ => None
        end
    | CPairR e1 C =>
        match to_ectx C with
        | Some K => Some (PairRCtx e1 :: K)
        | None => None
        end
    | CFst C =>
        match to_ectx C with
        | Some K => Some (FstCtx :: K)
        | None => None
        end
    | CSnd C =>
        match to_ectx C with
        | Some K => Some (SndCtx :: K)
        | None => None
        end
    | CInjL C =>
        match to_ectx C with
        | Some K => Some (InjLCtx :: K)
        | None => None
        end
    | CInjR C =>
        match to_ectx C with
        | Some K => Some (InjRCtx :: K)
        | None => None
        end
    | CCase C0 e1 e2 =>
        match to_ectx C0 with
        | Some K => Some (CaseCtx e1 e2 :: K)
        | None => None
        end
    | CAllocNL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (AllocNLCtx v2 :: K)
        | _, _ => None
        end
    | CAllocNR e1 C =>
        match to_ectx C with
        | Some K => Some (AllocNRCtx e1 :: K)
        | None => None
        end
    | CFree C =>
        match to_ectx C with
        | Some K => Some (FreeCtx :: K)
        | None => None
        end
    | CLoad C =>
        match to_ectx C with
        | Some K => Some (LoadCtx :: K)
        | None => None
        end
    | CStoreL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (StoreLCtx v2 :: K)
        | _, _ => None
        end
    | CStoreR e1 C =>
        match to_ectx C with
        | Some K => Some (StoreRCtx e1 :: K)
        | None => None
        end
    | CXchgL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (XchgLCtx v2 :: K)
        | _, _ => None
        end
    | CXchgR e1 C =>
        match to_ectx C with
        | Some K => Some (XchgRCtx e1 :: K)
        | None => None
        end
    | CCmpXchgL C e1 e2 =>
        match to_val e1, to_val e2, to_ectx C with
        | Some v1, Some v2, Some K => Some (CmpXchgLCtx v1 v2 :: K)
        | _, _, _ => None
        end
    | CCmpXchgM e0 C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (CmpXchgMCtx e0 v2 :: K)
        | _, _ => None
        end
    | CCmpXchgR e0 e1 C =>
        match to_ectx C with
        | Some K => Some (CmpXchgRCtx e0 e1 :: K)
        | None => None
        end
    | CFAAL C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (FaaLCtx v2 :: K)
        | _, _ => None
        end
    | CFAAR e1 C =>
        match to_ectx C with
        | Some K => Some (FaaRCtx e1 :: K)
        | None => None
        end
    | CFork _ => None
    | CResolve0 C e1 e2 =>
        match to_val e1, to_val e2, to_ectx C with
        | Some v1, Some v2, Some K =>
            match K with
            | [] => None
            | Ki :: K' => Some (ResolveLCtx Ki v1 v2 :: K')
            end
        | _, _, _ => None
        end
    | CResolve1 e0 C e2 =>
        match to_val e2, to_ectx C with
        | Some v2, Some K => Some (ResolveMCtx e0 v2 :: K)
        | _, _ => None
        end
    | CResolve2 e0 e1 C =>
        match to_ectx C with
        | Some K => Some (ResolveRCtx e0 e1 :: K)
        | None => None
        end
    | CRec _ _ _ => None
    end.

  Definition supported_ectx_item (Ki : ectx_item) : Prop :=
    match Ki with
    | ResolveLCtx _ _ _ | ResolveMCtx _ _ | ResolveRCtx _ _ => False
    | _ => True
    end.

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

  Example to_ectx_smoke :
    to_ectx (of_ectx [AppLCtx #(); FstCtx]) = Some [AppLCtx #(); FstCtx].
  Proof. reflexivity. Qed.
End OCPLModernRobustSafety.
