From iris.base_logic Require Import big_op.
From iris.heap_lang Require addenda.
From iris.heap_lang Require Export heap on_val substitution.
From iris.heap_lang Require Import proofmode.
From iris.proofmode Require Import tactics.
Import addenda.list addenda.fin_maps.
Import uPred.

Local Hint Resolve to_of_val.

(** * Adversarial expressions *)
(**
	An _adversarial expression_ contains no assertions and only
	low locations. (We reserve assertions for verified code.)
*)

Class Adversarial Σ (A : Type) := Adv {
  adv : A → iProp Σ;
  adv_timeless a :> TimelessP (adv a);
  adv_persistent a :> PersistentP (adv a);
  adv_ne n :> Proper ((=) ==> dist n) adv
}.
Arguments Adv {_ _} _ _ _ _.
Arguments adv {_ _ _} _ : simpl never.
Instance: Params (@adv) 3.

Instance adv_proper `{Adversarial Σ A} : Proper ((=) ==> (≡)) adv.
Proof. solve_proper. Qed.

Section adv_expr.
  Context `{heapG Σ}.

  Definition advexpr : expr → iProp Σ :=
    fix rec e := match e with
    | Var _ | Lit _ | Unit => True
    | Assert _ => False
    | Loc l => low l
    | Rec _ _ e | UnOp _ e | Fst e | Snd e | InjL e | InjR e
    | Fork e | Alloc e | Load e
      => rec e
    | App e1 e2 | BinOp _ e1 e2 | Pair e1 e2 | Store e1 e2 => rec e1 ∗ rec e2
    | If e1 e2 e3 | Case e1 e2 e3 | CAS e1 e2 e3
      => rec e1 ∗ rec e2 ∗ rec e3
    end%I.
  Global Instance advexpr_persistent e : PersistentP (advexpr e).
  Proof. elim: e=>//; by apply _. Qed.
  Global Instance advexpr_timeless (e : expr) : TimelessP (advexpr e).
  Proof. elim: e=>//; by apply _. Qed.
  Global Instance advexpr_adv : Adversarial Σ expr := Adv advexpr _ _ _.

  Lemma adv_expr e :
    adv e ⊣⊢
    match e with
    | Var _ | Lit _ | Unit => True
    | Assert _ => False
    | Loc l => low l
    | Rec _ _ e | UnOp _ e | Fst e | Snd e | InjL e | InjR e
    | Fork e | Alloc e | Load e
      => adv e
    | App e1 e2 | BinOp _ e1 e2 | Pair e1 e2 | Store e1 e2 => adv e1 ∗ adv e2
    | If e1 e2 e3 | Case e1 e2 e3 | CAS e1 e2 e3
      => adv e1 ∗ adv e2 ∗ adv e3
    end.
  Proof. by case: e. Qed.
End adv_expr.
Typeclasses Opaque advexpr.

(** * The fundamental theorem of logical relations *)
(**
	We model adversarial values and expressions with [low v] and
	[WP e ?{{ low }}], respectively (see [low_val]). Our aim is to
	show that, under the heap invariant, all adversarial
	expressions inhabit the model.

	The proof is by induction on expressions. For the induction to
	go through, we must generalize to account for substitution of
	low values for variables. (Since the expression relation does
	not imply progress, these need not be closing substitutions.)
 *)
Section ftlr.
  Context `{heapG Σ}.
  Implicit Types γ : env.
  Implicit Types e : expr.
  Implicit Types v : val.

  Global Instance env_low : LowIntegrity Σ env :=
    Low (λ γ, [∗ map] v ∈ γ, low v)%I _ _.

  Definition confined : expr → iProp Σ := λ e, (
    ∀ γ, heap_ctx -∗ low γ -∗ adv e -∗ WP γ e ?{{ low }}
  )%I.

  Lemma low_env γ : low γ ⊣⊢ [∗ map] v ∈ γ, low v. Proof. by []. Qed.

  Lemma low_env_empty : low (∅ : env) ⊣⊢ True.
  Proof. exact: big_sepM_empty. Qed.

  Lemma low_env_insert γ x v :
    γ !! x = None → low v -∗ low γ -∗ low (<[x:=v]>γ).
  Proof.
    do 2!rewrite low_env. move=>?. rewrite big_sepM_insert //.
    iIntros. by iFrame "#".
  Qed.

  Lemma low_env_singleton x v : low ({[x:=v]} : env) ⊣⊢ low v.
  Proof. exact: big_sepM_singleton. Qed.

  Lemma low_env_lookup γ x v : γ !! x = Some v → low γ -∗ low v.
  Proof. exact: big_sepM_lookup. Qed.

  Lemma low_env_delete γ x  : low γ -∗ low (delete x γ).
  Proof.
    rewrite low_env. apply big_sepM_mono. exact: delete_subseteq. done.
  Qed.

  Lemma confined_var x : confined (Var x).
  Proof.
    iIntros (γ) "_ #Hγ _". rewrite substitute_expr.
    case Hdom: (_ !! _)=>[v|]/=; last by iApply wp_stuck_var.
    iApply wp_value'. by iApply (low_env_lookup with "[$Hγ]").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Var _)) => rewrite -confined_var.

  Lemma confined_rec f x e : □ confined e -∗ confined (Rec f x e).
  Proof.
    iIntros "#IHe". iIntros (γ) "#Hh #Hγ #He".
    rewrite adv_expr substitute_expr. set erec := substitute _ _.
    case: (decide (Closed (f :b: x :b: []) erec)) => ?;
      last by iApply wp_stuck_rec_open.
    iApply wp_value; first exact: to_val_rec.
    rewrite/erec. set γ' := (delete _ _).
    iLöb as "Hvrec". rewrite {2}low_val. iAlways. iNext.
    iIntros (v2) "#Hv2". case: (decide (x = f))=>?.
    { subst. rewrite -> subst_subst'; last done.	(* ssr rewrite fails *)
      rewrite of_val_rec subst_substitute; last by rewrite lookup_delete.
      iApply ("IHe" with "Hh [] He").
      rewrite insert_delete. iApply (low_env_insert with "Hvrec");
        first by rewrite lookup_delete.
      by iApply (low_env_delete with "Hγ"). }
    rewrite of_val_rec subst_substitute; last by rewrite lookup_delete.
    rewrite subst_substitute; last by rewrite
      lookup_insert_ne // lookup_delete_ne // lookup_delete.
    iApply ("IHe" with "Hh [] He").
    iApply (low_env_insert with "Hv2"); first by rewrite
      lookup_insert_ne // lookup_delete_ne // lookup_delete.
    iApply (low_env_insert with "Hvrec"); first by rewrite
      lookup_delete.
    do 2!iApply low_env_delete. iExact "Hγ".
  Qed.
  Hint Extern 1 (_ ⊢ confined (Rec _ _ _))
    => rewrite -confined_rec; exact: always_intro.

  Lemma confined_app e1 e2 : confined e1 ∗ confined e2 -∗ confined (App e1 e2).
  Proof.
    iIntros "[IHe1 IHe2]". iIntros (γ) "#Hh #Hγ Happ".
    rewrite adv_expr substitute_expr. iDestruct "Happ" as "(He1&He2)".
    iApply (wp_on_val_app_bind with "[IHe1 He1]").
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (App _ _)) => rewrite -confined_app.

  Lemma confined_lit lit : confined (Lit lit).
  Proof.
    iIntros (γ) "_ _ _". rewrite substitute_expr.
    iApply wp_value; first done. by rewrite low_val.
  Qed.
  Hint Extern 1 (_ ⊢ confined (Lit _)) => rewrite -confined_lit.

  Lemma confined_un_op op e : confined e -∗ confined (UnOp op e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply wp_on_val_un_op_bind. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (UnOp _ _)) => rewrite -confined_un_op.

  Lemma confined_bin_op op e1 e2 :
    confined e1 ∗ confined e2 -∗ confined (BinOp op e1 e2).
  Proof.
    iIntros "[IHe1 IHe2]". iIntros (γ) "#Hh #Hγ Hop".
    rewrite adv_expr substitute_expr. iDestruct "Hop" as "(He1&He2)".
    iApply (wp_on_val_bin_op_bind with "[IHe1 He1]").
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (BinOp _ _ _)) => rewrite -confined_bin_op.

  Lemma confined_if e e1 e2 :
    confined e ∗ confined e1 ∗ confined e2 -∗ confined (If e e1 e2).
  Proof.
    iIntros "(IHe&IHe1&IHe2)". iIntros (γ) "#Hh #Hγ Hif".
    rewrite adv_expr substitute_expr. iDestruct "Hif" as "(He&He1&He2)".
    wp_apply (wp_any_if_bind with "[IHe He]"); last iSplit.
    - by iApply ("IHe" with "Hh Hγ He").
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (If _ _ _)) => rewrite -confined_if.

  Lemma confined_unit : confined Unit.
  Proof.
    iIntros (γ) "_ _ _". rewrite substitute_expr.
    iApply wp_value; first done. by rewrite low_val.
  Qed.
  Hint Extern 1 (_ ⊢ confined Unit) => rewrite -confined_unit.

  Lemma confined_pair e1 e2 :
    confined e1 ∗ confined e2 -∗ confined (Pair e1 e2).
  Proof.
    iIntros "[IHe1 IHe2]". iIntros (γ) "#Hh #Hγ Hp".
    rewrite adv_expr substitute_expr. iDestruct "Hp" as "(He1&He2)".
    iApply (wp_on_val_pair_bind with "[IHe1 He1]").
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Pair _ _)) => rewrite -confined_pair.

  Lemma confined_fst e : confined e -∗ confined (Fst e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply wp_on_val_fst_bind. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Fst _)) => rewrite -confined_fst.

  Lemma confined_snd e : confined e -∗ confined (Snd e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply wp_on_val_snd_bind. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Snd _)) => rewrite -confined_snd.

  Lemma confined_inl e : confined e -∗ confined (InjL e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply wp_on_val_inl_bind. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (InjL _)) => rewrite -confined_inl.

  Lemma confined_inr e : confined e -∗ confined (InjR e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply wp_on_val_inr_bind. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (InjR _)) => rewrite -confined_inr.

  Lemma confined_case e e1 e2 :
    confined e ∗ confined e1 ∗ confined e2 -∗ confined (Case e e1 e2).
  Proof.
    iIntros "(IHe&IHe1&IHe2)". iIntros (γ) "#Hh #Hγ Hc".
    rewrite adv_expr substitute_expr. iDestruct "Hc" as "(He&He1&He2)".
    wp_apply (wp_on_val_case_bind with "[IHe He]"); last (iIntros (v) "Hv"; iSplit).
    - by iApply ("IHe" with "Hh Hγ He").
    - iApply (wp_on_val_app_bind with "[-Hv]").
      by iApply ("IHe1" with "Hh Hγ He1"). by wp_value.
    - iApply (wp_on_val_app_bind with "[-Hv]").
      by iApply ("IHe2" with "Hh Hγ He2"). by wp_value.
  Qed.
  Hint Extern 1 (_ ⊢ confined (Case _ _ _)) => rewrite -confined_case.

  Lemma confined_assert e : confined (Assert e).
  Proof. iIntros (γ) "_ _ He". rewrite adv_expr. by iExFalso. Qed.
  Hint Extern 1 (_ ⊢ confined (Assert _)) => rewrite -confined_assert.

  Lemma confined_fork e : confined e -∗ confined (Fork e).
  Proof.
    iIntros "IHe". iIntros (γ) "Hh Hγ He". rewrite adv_expr substitute_expr.
    wp_apply wp_on_val_fork. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Fork _)) => rewrite -confined_fork.

  Lemma confined_loc l : confined (Loc l).
  Proof.
    iIntros (γ) "_ _ ?". rewrite adv_expr substitute_expr.
    iApply wp_value; first done. by rewrite low_val.
  Qed.
  Hint Extern 1 (_ ⊢ confined (Loc _)) => rewrite -confined_loc.

  Lemma confined_alloc e : confined e -∗ confined (Alloc e).
  Proof.
    iIntros "IHe". iIntros (γ) "#Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply (wp_low_alloc_bind with "Hh"). done. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Alloc _)) => rewrite -confined_alloc.

  Lemma confined_load e : confined e -∗ confined (Load e).
  Proof.
    iIntros "IHe". iIntros (γ) "#Hh Hγ He". rewrite adv_expr substitute_expr.
    iApply (wp_low_load_bind with "Hh"). done. by iApply ("IHe" with "Hh Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Load _)) => rewrite -confined_load.

  Lemma confined_store e1 e2 :
    confined e1 ∗ confined e2 -∗ confined (Store e1 e2).
  Proof.
    iIntros "[IHe1 IHe2]". iIntros (γ) "#Hh #Hγ Hstore".
    rewrite adv_expr substitute_expr. iDestruct "Hstore" as "(He1&He2)".
    iApply (wp_low_store_bind with "Hh [IHe1 He1]"); first done.
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (Store _ _)) => rewrite -confined_store.

  Lemma confined_cas e0 e1 e2 :
    confined e0 ∗ confined e1 ∗ confined e2 -∗ confined (CAS e0 e1 e2).
  Proof.
    iIntros "(IHe0&IHe1&IHe2)". iIntros (γ) "#Hh #Hγ Hcas".
    rewrite adv_expr substitute_expr. iDestruct "Hcas" as "(He0&He1&He2)".
    iApply (wp_low_cas_bind with "Hh [IHe0 He0] [IHe1 He1]"); first done.
    - by iApply ("IHe0" with "Hh Hγ He0").
    - by iApply ("IHe1" with "Hh Hγ He1").
    - by iApply ("IHe2" with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ confined (CAS _ _ _)) => rewrite -confined_cas.

  Hint Extern 2 =>
    match goal with
    | IH : True ⊢ confined ?e |- True ⊢ confined (_ ?e) => rewrite IH
    end.
  Hint Extern 2 =>
    match goal with
    | IH1 : True ⊢ confined ?e1, IH2 : True ⊢ confined ?e2
      |- True ⊢ confined (_ ?e1 ?e2)
      => rewrite (True_sep_1 True) {1}IH1 IH2
    end.
  Hint Extern 2 =>
    match goal with
    | IH1 : True ⊢ confined ?e1, IH2 : True ⊢ confined ?e2,
      IH3 : True ⊢ confined ?e3 |- True ⊢ confined (_ ?e1 ?e2 ?e3)
      => rewrite (True_sep_1 True) {2}(True_sep_1 True) {1}IH1 {1}IH2 IH3
    end.

  Theorem ftlr e : confined e.
  Proof. rewrite/uPred_valid. by induction e; auto. Qed.

  Corollary ftlr_alt γ e Φ :
    heap_ctx ⊢ low γ -∗ adv e -∗ (∀ v, low v -∗ Φ v) -∗ WP γ e ?{{ Φ }}.
  Proof.
    iIntros "Hh Hγ He". rewrite -wp_wand. by iApply (ftlr with "Hh Hγ He").
  Qed.
End ftlr.

(** * Contexts *)
(**
	Contexts are expressions with a single hole. The following
	definition must agree with [heap_lang.expr].
*)
Inductive ctx :=
  | CHole
  | CRec of binder & binder & ctx
  | CAppL of ctx & expr
  | CAppR of expr & ctx
  | CUnOp of un_op & ctx
  | CBinOpL of bin_op & ctx & expr
  | CBinOpR of bin_op & expr & ctx
  | CIf of ctx & expr & expr
  | CIfL of expr & ctx & expr
  | CIfR of expr & expr & ctx
  | CPairL of ctx & expr
  | CPairR of expr & ctx
  | CFst of ctx
  | CSnd of ctx
  | CInjL of ctx
  | CInjR of ctx
  | CCase of ctx & expr & expr
  | CCaseL of expr & ctx & expr
  | CCaseR of expr & expr & ctx
  | CAssert of ctx
  | CFork of ctx
  | CAlloc of ctx
  | CLoad of ctx
  | CStoreL of ctx & expr
  | CStoreR of expr & ctx
  | CCASL of ctx & expr & expr
  | CCASM of expr & ctx & expr
  | CCASR of expr & expr & ctx.

Fixpoint ctx_fill (C : ctx) (e : expr) : expr :=
  let rec := λ C, ctx_fill C e in
  match C with
  | CHole => e
  | CRec f x C => Rec f x (rec C)
  | CAppL C1 e2 => App (rec C1) e2
  | CAppR e1 C2 => App e1 (rec C2)
  | CUnOp op C => UnOp op (rec C)
  | CBinOpL op C1 e2 => BinOp op (rec C1) e2
  | CBinOpR op e1 C2 => BinOp op e1 (rec C2)
  | CIf C0 e1 e2 => If (rec C0) e1 e2
  | CIfL e0 C1 e2 => If e0 (rec C1) e2
  | CIfR e0 e1 C2 => If e0 e1 (rec C2)
  | CPairL C1 e2 => Pair (rec C1) e2
  | CPairR e1 C2 => Pair e1 (rec C2)
  | CFst C => Fst (rec C)
  | CSnd C => Snd (rec C)
  | CInjL C => InjL (rec C)
  | CInjR C => InjR (rec C)
  | CCase C0 e1 e2 => Case (rec C0) e1 e2
  | CCaseL e0 C1 e2 => Case e0 (rec C1) e2
  | CCaseR e0 e1 C2 => Case e0 e1 (rec C2)
  | CAssert C => Assert (rec C)
  | CFork C => Fork (rec C)
  | CAlloc C => Alloc (rec C)
  | CLoad C => Load (rec C)
  | CStoreL C1 e2 => Store (rec C1) e2
  | CStoreR e1 C2 => Store e1 (rec C2)
  | CCASL C0 e1 e2 => CAS (rec C0) e1 e2
  | CCASM e0 C1 e2 => CAS e0 (rec C1) e2
  | CCASR e0 e1 C2 => CAS e0 e1 (rec C2)
  end.

(**
	An _adversarial context_ contains no assertions and only
	adversarial subexpressions.
*)
Section adv_ctx.
  Context `{heapG Σ}.
  Implicit Types C : ctx.

  Definition advctx : ctx → iProp Σ :=
    fix rec C := match C with
    | CHole => True
    | CAssert _ => False
    | CRec _ _ C | CUnOp _ C | CFst C | CSnd C | CInjL C | CInjR C
    | CFork C | CAlloc C | CLoad C
      => rec C
    | CAppL C1 e2 | CBinOpL _ C1 e2 | CPairL C1 e2 | CStoreL C1 e2
      => rec C1 ∗ adv e2
    | CAppR e1 C2 | CBinOpR _ e1 C2 | CPairR e1 C2 | CStoreR e1 C2
      => adv e1 ∗ rec C2
    | CIf C0 e1 e2 | CCase C0 e1 e2 | CCASL C0 e1 e2
      => rec C0 ∗ adv e1 ∗ adv e2
    | CIfL e0 C1 e2 | CCaseL e0 C1 e2 | CCASM e0 C1 e2
      => adv e0 ∗ rec C1 ∗ adv e2
    | CIfR e0 e1 C2 | CCaseR e0 e1 C2 | CCASR e0 e1 C2
      => adv e0 ∗ adv e1 ∗ rec C2
    end%I.
  Global Instance advctx_persistent C : PersistentP (advctx C).
  Proof. elim: C=>//; by apply _. Qed.
  Global Instance advctx_timeless (C : ctx) : TimelessP (advctx C).
  Proof. elim: C=>//; by apply _. Qed.
  Global Instance advctx_adv : Adversarial Σ ctx := Adv advctx _ _ _.

  Lemma adv_ctx C :
    adv C ⊣⊢
    match C with
    | CHole => True
    | CAssert _ => False
    | CRec _ _ C | CUnOp _ C | CFst C | CSnd C | CInjL C | CInjR C
    | CFork C | CAlloc C | CLoad C
      => adv C
    | CAppL C1 e2 | CBinOpL _ C1 e2 | CPairL C1 e2 | CStoreL C1 e2
      => adv C1 ∗ adv e2
    | CAppR e1 C2 | CBinOpR _ e1 C2 | CPairR e1 C2 | CStoreR e1 C2
      => adv e1 ∗ adv C2
    | CIf C0 e1 e2 | CCase C0 e1 e2 | CCASL C0 e1 e2
      => adv C0 ∗ adv e1 ∗ adv e2
    | CIfL e0 C1 e2 | CCaseL e0 C1 e2 | CCASM e0 C1 e2
      => adv e0 ∗ adv C1 ∗ adv e2
    | CIfR e0 e1 C2 | CCaseR e0 e1 C2 | CCASR e0 e1 C2
      => adv e0 ∗ adv e1 ∗ adv C2
    end%I.
  Proof. by case: C. Qed.
End adv_ctx.
Typeclasses Opaque advctx.

(** Sanity check. *)
(**
	To catch changes to [expr] that aren't reflected in [ctx], we
	embed evaluation contexts in contexts and prove the filling
	functions match up.
*)
Local Notation ectx := (list ectx_item).

Definition of_ectx_item (Ki : ectx_item) (C : ctx) : ctx :=
  match Ki with
  | AppLCtx e2 => CAppL C e2
  | AppRCtx v1 => CAppR (of_val v1) C
  | UnOpCtx op => CUnOp op C
  | BinOpLCtx op e2 => CBinOpL op C e2
  | BinOpRCtx op v1 => CBinOpR op (of_val v1) C
  | IfCtx e1 e2 => CIf C e1 e2
  | PairLCtx e2 => CPairL C e2
  | PairRCtx v1 => CPairR (of_val v1) C
  | FstCtx => CFst C
  | SndCtx => CSnd C
  | InjLCtx => CInjL C
  | InjRCtx => CInjR C
  | CaseCtx e1 e2 => CCase C e1 e2
  | AssertCtx => CAssert C
  | AllocCtx => CAlloc C
  | LoadCtx => CLoad C
  | StoreLCtx e2 => CStoreL C e2
  | StoreRCtx v1 => CStoreR (of_val v1) C
  | CasLCtx e1 e2 => CCASL C e1 e2
  | CasMCtx v0 e2 => CCASM (of_val v0) C e2
  | CasRCtx v0 v1 => CCASR (of_val v0) (of_val v1) C
  end.

Definition of_ectx : ectx → ctx := foldr of_ectx_item CHole.

Fixpoint to_ectx (C : ctx) : option ectx :=
  let rec := λ C Ki, K ← to_ectx C; Some (Ki :: K) in
  let recv := λ e C f, v ← to_val e; rec C $ f v in
  match C with
  | CHole => Some []
  | CAppL C e2 => rec C $ AppLCtx e2
  | CAppR e1 C => recv e1 C $ AppRCtx
  | CUnOp op C => rec C $ UnOpCtx op
  | CBinOpL op C e2 => rec C $ BinOpLCtx op e2
  | CBinOpR op e1 C => recv e1 C $ BinOpRCtx op
  | CIf C e1 e2 => rec C $ IfCtx e1 e2
  | CPairL C e2 => rec C $ PairLCtx e2
  | CPairR e1 C => recv e1 C PairRCtx
  | CFst C => rec C FstCtx
  | CSnd C => rec C SndCtx
  | CInjL C => rec C InjLCtx
  | CInjR C => rec C InjRCtx
  | CCase C e1 e2 => rec C $ CaseCtx e1 e2
  | CAssert C => rec C AssertCtx
  | CAlloc C => rec C AllocCtx
  | CLoad C => rec C LoadCtx
  | CStoreL C e2 => rec C $ StoreLCtx e2
  | CStoreR e1 C => recv e1 C StoreRCtx
  | CCASL C e1 e2 => rec C $ CasLCtx e1 e2
  | CCASM e0 C e2 => v0 ← to_val e0; rec C $ CasMCtx v0 e2
  | CCASR e0 e1 C => v0 ← to_val e0; v1 ← to_val e1; rec C $ CasRCtx v0 v1
  | _ => None
  end.

Lemma to_of_ectx K : to_ectx (of_ectx K) = Some K.
Proof.
  elim: K => // Ki K IH. by destruct Ki; simplify_option_eq; repeat f_equal.
Qed.

Lemma of_to_ectx C K : to_ectx C = Some K → of_ectx K = C.
Proof.
  elim: C K; intros; simplify_option_eq; auto using of_to_val with f_equal.
Qed.

Instance of_ectx_inj : Inj (=) (=) of_ectx.
Proof. move=>?? EQ. apply (inj Some). by rewrite -!to_of_ectx EQ. Qed.

Lemma to_ectx_fill C K e : to_ectx C = Some K → ctx_fill C e = fill K e.
Proof.
  elim: C K; intros; simplify_option_eq;
    auto using of_to_val, eq_sym with f_equal.
Qed.

(** * Robust safety *)
(**
	Our aim is to show that, under the heap invariant, if we plug
	a closed, semantically low expression (i.e., verified code)
	into an adversarial context, the resulting expression is
	semantically low.

	The proof is by induction on contexts, using the FTLR to zap
	the context's subexpressions to low values. As in the proof of
	the FTLR, we must generalize to account for substitution.

	TODO: This is just a special case of the more general result
	with multi-holed contexts. *That* proof is likely to be
	shorter, since we can dispense with the FTLR and we'll have
	fewer cases in the definition of contexts.
 *)
Section robust_safety.
  Context `{heapG Σ}.
  Implicit Types γ : env.
  Implicit Types C : ctx.
  Implicit Types e : expr.
  Implicit Types v : val.

  Definition verified : pbit → expr → iProp Σ := λ p e,
     (□ (⌜Closed [] e⌝ ∗ WP e @ p; ⊤ {{ low }}))%I.

  Definition safe : ctx → iProp Σ := λ C, (
    ∀ γ p e, heap_ctx -∗ adv C -∗ low γ -∗ verified p e -∗
    WP γ (ctx_fill C e) ?{{ low }}
  )%I.

  Lemma safe_alt C :
    safe C ⊣⊢
    ∀ γ p e Φ, heap_ctx -∗ adv C -∗ low γ -∗ verified p e -∗
    (∀ v, low v -∗ Φ v) -∗ WP γ (ctx_fill C e) ?{{ Φ }}.
  Proof.
    iSplit.
    -  iIntros "Hsafe". iIntros (γ p e Φ) "Hh HC Hγ He".
      rewrite -wp_wand. by iApply ("Hsafe" with "Hh HC Hγ He").
    - iIntros "Halt". iIntros (γ p e) "Hh HC Hγ He".
      iApply ("Halt" with "Hh HC Hγ He []"). by iIntros.
  Qed.

  Lemma safe_hole : safe CHole.
  Proof.
    iIntros (γ p e) "_ _ _ >(%&He) /=". iApply (wp_forget_progress p).
    by rewrite substitute_closed.
  Qed.
  Hint Extern 1 (_ ⊢ safe CHole) => rewrite -safe_hole.

  Lemma safe_rec f x C : □ safe C -∗ safe (CRec f x C).
  Proof.
    (* TODO: Lots of duplication with confined_rec. *)
    iIntros "#IH". iIntros (γ p e) "#Hh #HC #Hγ #He /=".
    rewrite adv_ctx substitute_expr. set erec := substitute _ _.
    case: (decide (Closed (f :b: x :b: []) erec)) => ?;
      last by iApply wp_stuck_rec_open.
    iApply wp_value; first exact: to_val_rec.
    rewrite/erec. set γ' := (delete _ _).
    iLöb as "Hvrec". rewrite {2}low_val. iAlways. iNext.
    iIntros (v2) "#Hv2". case: (decide (x = f))=>?.
    { subst. rewrite -> subst_subst'; last done.	(* ssr rewrite fails *)
      rewrite of_val_rec subst_substitute; last by rewrite lookup_delete.
      iApply ("IH" with "Hh HC [] [He]"); last iExact "He".	(* iNext bug *)
      rewrite insert_delete. iApply (low_env_insert with "Hvrec");
        first by rewrite lookup_delete.
      by iApply (low_env_delete with "Hγ"). }
    rewrite of_val_rec subst_substitute; last by rewrite lookup_delete.
    rewrite subst_substitute; last by rewrite
      lookup_insert_ne // lookup_delete_ne // lookup_delete.
    iApply ("IH" with "Hh HC [] [He]"); last iExact "He".	(* iNext bug *)
    iApply (low_env_insert with "Hv2"); first by rewrite
      lookup_insert_ne // lookup_delete_ne // lookup_delete.
    iApply (low_env_insert with "Hvrec"); first by rewrite
      lookup_delete.
    do 2!iApply low_env_delete. iExact "Hγ".
  Qed.
  Hint Extern 1 (_ ⊢ safe (CRec _ _ _))
    => rewrite -safe_rec; exact: always_intro.

  Lemma safe_app_l C1 e2 : safe C1 -∗ safe (CAppL C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Happ #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Happ" as "(HC1&He2)".
    iApply (wp_on_val_app_bind with "[-He2]").
    - by iApply ("IH" with "Hh HC1 Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CAppL _ _)) => rewrite -safe_app_l.

  Lemma safe_app_r e1 C2 : safe C2 -∗ safe (CAppR e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Happ #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Happ" as "(He1&HC2)".
    wp_apply (wp_on_val_app_bind with "[He1]").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC2 Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CAppR _ _)) => rewrite -safe_app_r.

  Lemma safe_un_op op C : safe C -∗ safe (CUnOp op C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    iApply wp_on_val_un_op_bind. by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CUnOp _ _)) => rewrite -safe_un_op.

  Lemma safe_bin_op_l op C1 e2 : safe C1 -∗ safe (CBinOpL op C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hop #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hop" as "(HC1&He2)".
    iApply (wp_on_val_bin_op_bind with "[-He2]").
    - by iApply ("IH" with "Hh HC1 Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CBinOpL _ _ _)) => rewrite -safe_bin_op_l.

  Lemma safe_bin_op_r op e1 C2 : safe C2 -∗ safe (CBinOpR op e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hop #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hop" as "(He1&HC2)".
    iApply (wp_on_val_bin_op_bind with "[He1]").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC2 Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CBinOpR _ _ _)) => rewrite -safe_bin_op_r.

  Lemma safe_if C e1 e2 : safe C -∗ safe (CIf C e1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hif #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hif" as "(HC&He1&He2)".
    wp_apply (wp_any_if_bind with "[-He1 He2]"); last iSplit.
    - by iApply ("IH" with "Hh HC Hγ He").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CIf _ _ _)) => rewrite -safe_if.

  Lemma safe_if_l e0 C1 e2 : safe C1 -∗ safe (CIfL e0 C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hif #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hif" as "(He0&HC&He2)".
    wp_apply (wp_any_if_bind with "[He0]"); last iSplit.
    - by iApply (ftlr with "Hh Hγ He0").
    - by iApply ("IH" with "Hh HC Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CIfL _ _ _)) => rewrite -safe_if_l.

  Lemma safe_if_r e0 e1 C2 : safe C2 -∗ safe (CIfR e0 e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hif #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hif" as "(He0&He1&HC)".
    wp_apply (wp_any_if_bind with "[He0]"); last iSplit.
    - by iApply (ftlr with "Hh Hγ He0").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CIfR _ _ _)) => rewrite -safe_if_r.

  Lemma safe_pair_l C1 e2 : safe C1 -∗ safe (CPairL C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hp #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hp" as "(HC1&He2)".
    wp_apply (wp_on_val_pair_bind with "[-He2]").
    - by iApply ("IH" with "Hh HC1 Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CPairL _ _)) => rewrite -safe_pair_l.

  Lemma safe_pair_r e1 C2 : safe C2 -∗ safe (CPairR e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hp #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hp" as "(He1&HC2)".
    wp_apply (wp_on_val_pair_bind with "[He1]").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC2 Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CPairR _ _)) => rewrite -safe_pair_r.

  Lemma safe_fst C : safe C -∗ safe (CFst C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    wp_apply wp_on_val_fst_bind. by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CFst _)) => rewrite -safe_fst.

  Lemma safe_snd C : safe C -∗ safe (CSnd C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    wp_apply wp_on_val_snd_bind. by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CSnd _)) => rewrite -safe_snd.

  Lemma safe_inl C : safe C -∗ safe (CInjL C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    wp_apply wp_on_val_inl_bind. by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CInjL _)) => rewrite -safe_inl.

  Lemma safe_inr C : safe C -∗ safe (CInjR C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    wp_apply wp_on_val_inr_bind. by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CInjR _)) => rewrite -safe_inr.

  Lemma safe_case C e1 e2 : safe C -∗ safe (CCase C e1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(HC&He1&He2)".
    wp_apply (wp_on_val_case_bind with "[-He1 He2]");
      last (iIntros (v0) "Hv0"; iSplit; wp_bind (γ _)).
    - by iApply ("IH" with "Hh HC Hγ He").
    - iApply (ftlr_alt with "Hh Hγ He1"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
    - iApply (ftlr_alt with "Hh Hγ He2"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCase _ _ _)) => rewrite -safe_case.

  Lemma safe_case_l e0 C1 e2 : safe C1 -∗ safe (CCaseL e0 C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(He0&HC&He2)".
    wp_apply (wp_on_val_case_bind with "[He0]");
      last (iIntros (v0) "Hv0"; iSplit; wp_bind (γ _)).
    - by iApply (ftlr with "Hh Hγ He0").
    - rewrite safe_alt. iApply ("IH" with "Hh HC Hγ He"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
    - iApply (ftlr_alt with "Hh Hγ He2"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCaseL _ _ _)) => rewrite -safe_case_l.

  Lemma safe_case_r e0 e1 C2 : safe C2 -∗ safe (CCaseR e0 e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(He0&He1&HC)".
    wp_apply (wp_on_val_case_bind with "[He0]");
      last (iIntros (v0) "Hv0"; iSplit; wp_bind (γ _)).
    - by iApply (ftlr with "Hh Hγ He0").
    - iApply (ftlr_alt with "Hh Hγ He1"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
    - rewrite safe_alt. iApply ("IH" with "Hh HC Hγ He"). iIntros (f) "Hf".
      by iApply (wp_on_val_app_bind with "[Hf] [Hv0]"); wp_value.
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCaseR _ _ _)) => rewrite -safe_case_r.

  Lemma safe_assert C : safe (CAssert C).
  Proof. iIntros (γ p e) "_ Hc _ _ /=". rewrite adv_ctx. by iExFalso. Qed.
  Hint Extern 1 (_ ⊢ safe (CAssert _)) => rewrite -safe_assert.

  Lemma safe_fork C : safe C -∗ safe (CFork C).
  Proof.
    iIntros "IH". iIntros (γ p e) "Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr. wp_apply wp_on_val_fork.
    by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CFork _)) => rewrite -safe_fork.

  Lemma safe_alloc C : safe C -∗ safe (CAlloc C).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    iApply (wp_low_alloc_bind with "Hh"); first done.
    by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CAlloc _)) => rewrite -safe_alloc.

  Lemma safe_load C : safe C -∗ safe (CLoad C).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh HC Hγ He /=".
    rewrite adv_ctx substitute_expr.
    iApply (wp_low_load_bind with "Hh"); first done.
    by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CLoad _)) => rewrite -safe_load.

  Lemma safe_store_l C1 e2 : safe C1 -∗ safe (CStoreL C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hp #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hp" as "(HC1&He2)".
    iApply (wp_low_store_bind with "Hh [-He2]"); first done.
    - by iApply ("IH" with "Hh HC1 Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CStoreL _ _)) => rewrite -safe_store_l.

  Lemma safe_store_r e1 C2 : safe C2 -∗ safe (CStoreR e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hp #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hp" as "(He1&HC2)".
    iApply (wp_low_store_bind with "Hh [He1]"); first done.
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC2 Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CStoreR _ _)) => rewrite -safe_store_r.

  Lemma safe_cas_l C e1 e2 : safe C -∗ safe (CCASL C e1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(HC&He1&He2)".
    wp_apply (wp_low_cas_bind with "Hh [-He1 He2] [He1]"); first done.
    - by iApply ("IH" with "Hh HC Hγ He").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCASL _ _ _)) => rewrite -safe_cas_l.

  Lemma safe_cas_m e0 C1 e2 : safe C1 -∗ safe (CCASM e0 C1 e2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(He0&HC&He2)".
    wp_apply (wp_low_cas_bind with "Hh [He0] [-He2]"); first done.
    - by iApply (ftlr with "Hh Hγ He0").
    - by iApply ("IH" with "Hh HC Hγ He").
    - by iApply (ftlr with "Hh Hγ He2").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCASM _ _ _)) => rewrite -safe_cas_m.

  Lemma safe_cas_r e0 e1 C2 : safe C2 -∗ safe (CCASR e0 e1 C2).
  Proof.
    iIntros "IH". iIntros (γ p e) "#Hh Hc #Hγ He /=".
    rewrite adv_ctx substitute_expr. iDestruct "Hc" as "(He0&He1&HC)".
    wp_apply (wp_low_cas_bind with "Hh [He0] [He1]"); first done.
    - by iApply (ftlr with "Hh Hγ He0").
    - by iApply (ftlr with "Hh Hγ He1").
    - by iApply ("IH" with "Hh HC Hγ He").
  Qed.
  Hint Extern 1 (_ ⊢ safe (CCASR _ _ _)) => rewrite -safe_cas_r.

  Hint Extern 2 =>
    match goal with
    | IH : True ⊢ safe ?C |- True ⊢ safe (_ ?C) => rewrite IH
    end.

  Theorem robust_safetyI' C : safe C.
  Proof. rewrite/uPred_valid. by induction C; auto. Qed.

  (** The internal version of [robust_safety]. *)
  Corollary robust_safetyI C γ p e :
    heap_ctx ⊢ adv C -∗ low γ -∗ verified p e -∗ WP γ (ctx_fill C e) ?{{ low }}.
  Proof.
    iIntros "Hh HC Hγ #(% & He)".
    iApply (robust_safetyI' with "Hh HC Hγ"). by iAlways; iSplit.
  Qed.
End robust_safety.

(** * Adversaries *)
(**
	To state the [robust_safety] theorem, we define a special case
	of adversarial contexts at the meta-level. A _(meta-level)
	adversary_ is a context containing neither locations nor
	assertions.
*)
Definition AdvExpr : expr → Prop :=
  fix rec e := match e with
  | Var _ | Lit _ | Unit => True
  | Assert _ | Loc _ => False
  | Rec _ _ e | UnOp _ e | Fst e | Snd e | InjL e | InjR e
  | Fork e | Alloc e | Load e
    => rec e
  | App e1 e2 | BinOp _ e1 e2 | Pair e1 e2 | Store e1 e2 => rec e1 ∧ rec e2
  | If e1 e2 e3 | Case e1 e2 e3 | CAS e1 e2 e3
    => rec e1 ∧ rec e2 ∧ rec e3
  end.

Definition AdvCtx : ctx → Prop :=
  fix rec C := match C with
  | CHole => True
  | CAssert _ => False
  | CRec _ _ C | CUnOp _ C | CFst C | CSnd C | CInjL C | CInjR C
  | CFork C | CAlloc C | CLoad C
    => rec C
  | CAppL C1 e2 | CBinOpL _ C1 e2 | CPairL C1 e2 | CStoreL C1 e2
    => rec C1 ∧ AdvExpr e2
  | CAppR e1 C2 | CBinOpR _ e1 C2 | CPairR e1 C2 | CStoreR e1 C2
    => AdvExpr e1 ∧ rec C2
  | CIf C0 e1 e2 | CCase C0 e1 e2 | CCASL C0 e1 e2
    => rec C0 ∧ AdvExpr e1 ∧ AdvExpr e2
  | CIfL e0 C1 e2 | CCaseL e0 C1 e2 | CCASM e0 C1 e2
    => AdvExpr e0 ∧ rec C1 ∧ AdvExpr e2
  | CIfR e0 e1 C2 | CCaseR e0 e1 C2 | CCASR e0 e1 C2
    => AdvExpr e0 ∧ AdvExpr e1 ∧ rec C2
  end.

Section adversary.
  Context `{heapG Σ}.
  Implicit Types C : ctx.
  Implicit Types e : expr.

  Lemma adv_expr_i e : AdvExpr e → adv e.
  Proof.
    rewrite/uPred_valid.
    elim: e => //; intros;
    lazymatch goal with
    | IH0 : (AdvExpr ?e0 → True ⊢ adv ?e0),
      IH1 : (AdvExpr ?e1 → True ⊢ adv ?e1),
      IH2 : (AdvExpr ?e2 → True ⊢ adv ?e2),
      He : (AdvExpr (?f ?e0 ?e1 ?e2)) |- True ⊢ adv (?f ?e0 ?e1 ?e2)
      => rewrite adv_expr; destruct He as (?&?&?); iSplit; [| iSplit];
        [by rewrite -IH0 | by rewrite -IH1 | by rewrite -IH2]
    | IH1 : (AdvExpr ?e1 → True ⊢ adv ?e1),
      IH2 : (AdvExpr ?e2 → True ⊢ adv ?e2),
      He : (AdvExpr (?f ?e1 ?e2)) |- True ⊢ adv (?f ?e1 ?e2)
      => rewrite adv_expr; destruct He as [??]; iSplit;
        [by rewrite -IH1 | by rewrite -IH2]
    end.
  Qed.

  Lemma adv_ctx_i C : AdvCtx C → adv C.
  Proof.	(* TODO: Automate. *)
    elim: C => //=.
    (* application *)
    - move=>C1 IH e2 [] ??. rewrite adv_ctx.
      iSplit. by iApply IH. by iApply adv_expr_i.
    - move=>e1 C2 IH [] ??. rewrite adv_ctx.
      iSplit. by iApply adv_expr_i. by iApply IH.
    (* binary operations *)
    - move=>op C1 IH e2 [] ??. rewrite adv_ctx.
      iSplit. by iApply IH. by iApply adv_expr_i.
    - move=>op e1 C2 IH [] ??. rewrite adv_ctx.
      iSplit. by iApply adv_expr_i. by iApply IH.
    (* if *)
    - move=>C0 IH e1 e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply IH. by iApply adv_expr_i.
      by iApply adv_expr_i.
    - move=>e0 C1 IH e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply IH.
      by iApply adv_expr_i.
    - move=>e0 e1 C2 IH [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply adv_expr_i.
      by iApply IH.
    (* pairing *)
    - move=>C1 IH e2 [] ??. rewrite adv_ctx.
      iSplit. by iApply IH. by iApply adv_expr_i.
    - move=>e1 C2 IH [] ??. rewrite adv_ctx.
      iSplit. by iApply adv_expr_i. by iApply IH.
    (* case *)
    - move=>C0 IH e1 e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply IH. by iApply adv_expr_i.
      by iApply adv_expr_i.
    - move=>e0 C1 IH e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply IH.
      by iApply adv_expr_i.
    - move=>e0 e1 C2 IH [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply adv_expr_i.
      by iApply IH.
    (* store *)
    - move=>C1 IH e2 [] ??. rewrite adv_ctx.
      iSplit. by iApply IH. by iApply adv_expr_i.
    - move=>e1 C2 IH [] ??. rewrite adv_ctx.
      iSplit. by iApply adv_expr_i. by iApply IH.
    (* CAS *)
    - move=>C0 IH e1 e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply IH. by iApply adv_expr_i.
      by iApply adv_expr_i.
    - move=>e0 C1 IH e2 [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply IH.
      by iApply adv_expr_i.
    - move=>e0 e1 C2 IH [] ? [] ??. rewrite adv_ctx.
      iSplit; [|iSplit]. by iApply adv_expr_i. by iApply adv_expr_i.
      by iApply IH.
  Qed.
End adversary.
