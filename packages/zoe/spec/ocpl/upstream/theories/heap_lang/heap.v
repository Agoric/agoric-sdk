From iris.prelude Require Import gmultiset.
From iris.algebra Require Import auth gmap coPset csum agree.
From iris.algebra Require Export gset frac.
From iris.base_logic.lib Require Export invariants.
From iris.base_logic.lib Require Import own fractional.
From iris.base_logic Require Import big_op.
From iris.heap_lang Require addenda.
From iris.heap_lang Require Export on_val lifting.
From iris.heap_lang Require Import proofmode_basics.
From iris.proofmode Require Import tactics.
Import uPred.
Import addenda.fin_maps.
Import addenda.option addenda.gmap addenda.csum.
Import addenda.lib_auth addenda.algebra_auth.

Local Hint Resolve to_of_val.

Definition heapN : namespace := nroot .@ "heap".

(** The CMRAs we need. *)
Local Notation heap := (gmap loc val).
Definition heapUR : ucmraT :=
  gmapUR loc (csumR (prodR fracR (agreeR valC)) unitR).
Local Notation Hval q v := (Cinl (q%Qp, to_agree v)).
Local Notation Lval := (Cinr ()).

Local Notation locset := (gset loc).
Definition domUR : ucmraT := gmapUR loc (csumR (exclR unitR) unitR).
Local Notation Fresh := (Cinl (Excl ())).
Local Notation Live := (Cinr ()).

Local Notation authG Σ R := (inG Σ (authR R)).
Class heapG Σ := HeapG {
  heap_ownP_inG :> ownPG heap_lang Σ;
  heap_heapG_inG :> authG Σ heapUR;
  heap_domG_inG :> authG Σ domUR;
  heap_name : gname * gname
}.

Class heapPreG Σ := HeapPreG {
  heap_preG_ownP_inG : ownPPreG heap_lang Σ;
  heap_preG_heapG_inG : authG Σ heapUR;
  heap_preG_domG_inG : authG Σ domUR
}.
(*
 * Lower priority than [heapG]'s instances so the occurrence of
 * [heap_ctx] in the statement of [heap_adequacy] refers to the
 * "inner" [heapG] rather than the "outer" [heapPreG].
 *)
Existing Instance heap_preG_ownP_inG | 30.
Existing Instance heap_preG_heapG_inG | 30.
Existing Instance heap_preG_domG_inG | 30.

Local Notation authΣ R := (GFunctor (constRF (authR R))).
Definition heapΣ : gFunctors := #[ ownPΣ state; authΣ heapUR; authΣ domUR ].
Instance subG_heapPreG {Σ} : subG heapΣ Σ → heapPreG Σ.
Proof. intros [?[??]%subG_inv]%subG_inv. constructor; apply _. Qed.

(** * Heap resources and the heap invariant *)
Section definitions.
  Context `{ownPG heap_lang Σ, authG Σ heapUR, authG Σ domUR}.
  Context (γ : gname * gname).
  Implicit Types l : loc.
  Implicit Types q : Qp.
  Implicit Types v : val.
  Implicit Types h : heap.

  (** High vs low locations *)
  Definition mapsto_def l q v : iProp Σ := own (γ.1) (◯ {[l := Hval q v]}).
  Definition mapsto_aux : { x | x = @mapsto_def }. by eexists. Qed.
  Definition mapsto := proj1_sig mapsto_aux.
  Definition mapsto_eq : @mapsto = @mapsto_def := proj2_sig mapsto_aux.

  Definition lowloc_def l : iProp Σ := own (γ.1) (◯ ({[l := Lval]} : heapUR)).
  Definition lowloc_aux : { x | x = @lowloc_def }. by eexists. Qed.
  Definition lowloc' := proj1_sig lowloc_aux.
  Definition lowloc_eq : @lowloc' = @lowloc_def := proj2_sig lowloc_aux.

  (** Low values *)
  Notation lowval' := (on_val lowloc').

  (** Fresh vs live locations *)
  Definition fresh_def l : iProp Σ := own (γ.2) (◯ {[l := Fresh]}).
  Definition fresh_aux : { x | x = @fresh_def }. by eexists. Qed.
  Definition fresh' := proj1_sig fresh_aux.
  Definition fresh_eq : @fresh' = @fresh_def := proj2_sig fresh_aux.

  Definition liveloc_def l : iProp Σ := own (γ.2) (◯ ({[l := Live]} : domUR)).
  Definition liveloc_aux : { x | x = @liveloc_def }. by eexists. Qed.
  Definition liveloc' := proj1_sig liveloc_aux.
  Definition liveloc_eq : @liveloc' = @liveloc_def := proj2_sig liveloc_aux.

  (**
	Invariant: The state is good and sends every high location to
	its value and every low location to a low value. Orthogonally,
	every location in the state's heap is either fresh or live.
  *)

  Definition to_high : heap → heapUR := fmap (λ v, Hval 1 v).
  Definition to_low : heap → heapUR  := fmap (λ _, Lval).
  Definition to_heap (h h' : heap) : heapUR := to_high h ⋅ to_low h'.

  Definition to_fresh : locset → domUR := to_gmap Fresh.
  Definition to_live : locset → domUR  := to_gmap Live.
  Definition to_dom (L L' : locset) : domUR := to_fresh L ⋅ to_live L'.

  Definition hinv' : iProp Σ := (
    ∃ h h' L L', ⌜dom _ (h ∪ h') = L ∪ L'⌝ ∗
    ownP (good_state (h ∪ h')) ∗
    own (γ.1) (● to_heap h h') ∗ ([∗ map] v ∈ h', lowval' v) ∗
    own (γ.2) (● to_dom L L')
  )%I.
  Definition heap_ctx' : iProp Σ := inv heapN hinv'%I.

  Global Instance heap_ctx'_persistent : PersistentP heap_ctx'.
  Proof. apply _. Qed.
End definitions.

Notation "l ↦{ q } v" := (mapsto heap_name l q v)
  (at level 20, q at level 50, format "l  ↦{ q }  v") : uPred_scope.
Notation "l ↦ v" := (mapsto heap_name l 1 v) (at level 20) : uPred_scope.
Notation "l ↦{ q } -" := (∃ v, l ↦{q} v)%I
  (at level 20, q at level 50, format "l  ↦{ q }  -") : uPred_scope.
Notation "l ↦ -" := (l ↦{1} -)%I (at level 20) : uPred_scope.
Notation lowloc := (lowloc' heap_name).
Notation lowval := (on_val lowloc).
Notation fresh := (fresh' heap_name).
Notation liveloc := (liveloc' heap_name).
Notation live L := ([∗ set] l ∈ L, liveloc l)%I (only parsing).
Local Notation hinv := (hinv' heap_name).
Notation heap_ctx := (heap_ctx' heap_name).

(** We can establish the heap invariant. *)

Lemma heap_ctx_alloc `{ownPG heap_lang Σ, authG Σ heapUR, authG Σ domUR} E h :
  ownP (good_state h) ={E}=∗ ∃ γ, heap_ctx' γ.
Proof.
  iIntros "Hσ". set aH := to_heap h ∅. set aD := to_dom ∅ (dom _ h).
  iMod (own_alloc (Auth (Excl' aH) aH)) as (γh) "Hh".
  { split=>// l. rewrite lookup_op !lookup_fmap. by case (h !! l). }
  iMod (own_alloc (Auth (Excl' aD) aD)) as (γd) "Hd".
  { split=>// l. rewrite lookup_op !lookup_to_gmap.
    rewrite option_guard_False // left_id.
    case Hdom: (decide (l ∈ dom locset h)).
    by rewrite option_guard_True. by rewrite option_guard_False. }
  rewrite (auth_both_op aH). iDestruct "Hh" as "[Hh _]".
  rewrite (auth_both_op aD). iDestruct "Hd" as "[Hd _]".
  set γ := (γh, γd).
  iMod (inv_alloc heapN _ (hinv' γ)%I with "[-]") as "?"; last by iExists γ.
  iNext. iExists h, ∅, ∅, (dom _ h).
  rewrite right_id big_sepM_empty union_empty_l_L.
  by iFrame "Hσ Hh Hd".
Qed.

(** Under the heap invariant, we can observe the ambient state is good. *)

Lemma heap_ctx_is_good `{heapG Σ} E :
 ↑heapN ⊆ E → heap_ctx ={E,∅}=∗ ∃ σ, ownP σ ∧ ⌜is_good σ⌝.
Proof.
  iIntros (?) "Hctx". iMod (fupd_intro_mask' _ (↑heapN)) as "_"; first done.
  iInv heapN as (h h' L L') "(_ & >Hσ & _ & _ & _)" "_".
  rewrite subseteq_empty_difference_L //. iModIntro.
  iExists (good_state (h ∪ h')). by iFrame "Hσ".
Qed.

(** * Low integrity predicates *)
Class LowIntegrity Σ (A : Type) := Low {
  low : A → iProp Σ;
  low_persistent a :> PersistentP (low a);
  low_ne n :> Proper ((=) ==> dist n) low
}.
Arguments Low {_ _} _ _ _.
Arguments low {_ _ _} _ : simpl never.
Instance: Params (@low) 3.

Instance low_proper `{LowIntegrity Σ A} : Proper ((=) ==> (≡)) low.
Proof. solve_proper. Qed.

Section low.
  Context `{heapG Σ}.

  (**
    Locations start off high and may be marked low by the
    (irreversible) ghost move [heap_mark_low].
  *)
  Global Instance lowloc_persistent l : PersistentP (lowloc l).
  Proof. rewrite lowloc_eq. apply _. Qed.
  Global Instance lowloc_timeless l : TimelessP (lowloc l).
  Proof. rewrite lowloc_eq. apply _. Qed.
  Global Instance loc_low : LowIntegrity Σ loc := Low lowloc _ _.
  Global Instance loc_low_timeless (l : loc) : TimelessP (low l).
  Proof. rewrite /low/=. apply _. Qed.

  Lemma low_loc l : low l ⊣⊢ lowloc l. Proof. by []. Qed.

  (** Low values lift low locations to values. *)
  Global Instance val_low : LowIntegrity Σ val := Low lowval _ _.

  Lemma low_val_eq v : low v ⊣⊢ on_val lowloc v. Proof. by []. Qed.

  Lemma low_val v :
    low v ⊣⊢
    match v with
    | RecV f x e _ => □ ▷ ∀ v, low v -∗
      WP subst' x (of_val v) (subst' f (Rec f x e) e) ?{{ low }}
    | LocV l => low l
    | LitV _ | UnitV => True
    | PairV v1 v2 => ▷ (low v1 ∗ low v2)
    | InjLV v | InjRV v => ▷ low v
    end.
  Proof. by rewrite low_val_eq on_val_elim. Qed.

  Lemma low_rec f x e `{!Closed (f :b: x :b: []) e} :
    low (RecV f x e) ⊣⊢
    □ ▷ ∀ v Φ, low v -∗ (∀ v', low v' -∗ Φ v') -∗
    WP subst' x (of_val v) (subst' f (Rec f x e) e) ?{{ Φ }}.
  Proof. by rewrite low_val_eq on_val_rec. Qed.

  Global Instance low_val_loc_timeless l : TimelessP (low (LocV l)).
  Proof. by rewrite /TimelessP low_val timelessP. Qed.
  Global Instance low_val_rec_except_0 f x e `{!Closed (f :b: x :b: []) e} :
    IsExcept0 (low (RecV f x e)).
  Proof. apply _. Qed.
  Global Instance low_val_pair_except_0 v1 v2 : IsExcept0 (low (PairV v1 v2)).
  Proof. apply _. Qed.
  Global Instance low_val_inl_except_0 v : IsExcept0 (low (InjLV v)).
  Proof. apply _. Qed.
  Global Instance low_val_inr_except_0 v : IsExcept0 (low (InjRV v)).
  Proof. apply _. Qed.
End low.

Ltac simpl_low :=
  repeat match goal with
  | |- context [low (LocV ?l)] => rewrite (low_val (LocV l))
  | |- context [low (LitV ?lit)] => rewrite (low_val (LitV lit))
  | |- context [low UnitV] => rewrite (low_val UnitV)
  | |- context [low (PairV ?v1 ?v2)] => rewrite (low_val (PairV v1 v2))
  | |- context [low (InjLV ?v)] => rewrite (low_val (InjLV v))
  | |- context [low (InjRV ?v)] => rewrite (low_val (InjRV v))
  | |- context [(▷ True)%I] => rewrite later_True
  end.
Local Hint Extern 5 => simpl_low.

(** * Bookkeeping *)
Module internal.
Section internal.
  Context `{heapG Σ}.
  Implicit Types l : loc.
  Implicit Types q : Qp.
  Implicit Types v : val.
  Implicit Types h : heap.

  (** Map operations and [to_heap] *)

  Lemma lookup_to_high_None h l : h !! l = None → to_high h !! l = None.
  Proof. by rewrite /to_high lookup_fmap=> ->. Qed.
  Lemma lookup_to_low_None h l : h !! l = None → to_low h !! l = None.
  Proof. by rewrite /to_low lookup_fmap=> ->. Qed.
  Lemma lookup_to_heap_None h h' l :
    (h ∪ h') !! l = None → to_heap h h' !! l = None.
  Proof.
    move=> /lookup_union_None [??].
    by rewrite lookup_op lookup_to_high_None ?lookup_to_low_None.
  Qed.

  Lemma lookup_to_high_Some h l v :
    h !! l = Some v → to_high h !! l = Some(Hval 1 v).
  Proof. by rewrite /to_high lookup_fmap=>->. Qed.
  Lemma lookup_to_low_Some h l v : h !! l = Some v → to_low h !! l = Some Lval.
  Proof. by rewrite /to_low lookup_fmap=>->. Qed.
  Lemma lookup_to_heap_Some h h' l v :
    h !! l = Some v → h' !! l = None → to_heap h h' !! l = Some (Hval 1 v).
  Proof.
    rewrite /to_heap lookup_op.
    by move=>/lookup_to_high_Some->/lookup_to_low_None->.
  Qed.

  Lemma to_heap_high_insert h h' l v :
    h' !! l = None →
    to_heap (<[l:=v]> h) h' = <[l:=Hval 1 v]> (to_heap h h').
  Proof.
    move=>?. rewrite /to_heap /to_high fmap_insert. apply/map_eq => l'.
    case: (decide (l = l'))=> [<-|?].
    - rewrite insert_op_l //. by rewrite lookup_to_low_None.
    - by rewrite lookup_op lookup_insert_ne // lookup_insert_ne // -lookup_op.
  Qed.
  Lemma to_heap_low_insert h h' l v :
    h !! l = None → to_heap h (<[l:=v]> h') = <[l:=Lval]>(to_heap h h').
  Proof.
    move=>?. rewrite /to_heap /to_low fmap_insert. apply/map_eq=> l'.
    case: (decide (l = l'))=> [<-|?].
    - rewrite insert_op_r //. by rewrite lookup_to_high_None.
    - by rewrite lookup_op lookup_insert_ne // lookup_insert_ne // -lookup_op.
  Qed.
  Lemma to_heap_low_insert_override h h' l v1 v2 :
    h' !! l = Some v1 → to_heap h h' = to_heap h (<[l:=v2]> h').
  Proof.
    move=>Hlow. apply/map_eq=> l'. rewrite 2!lookup_op. f_equiv.
    rewrite /to_low 2!lookup_fmap. case: (decide (l = l')) =>[<-|?].
    - by rewrite Hlow lookup_insert.
    - by rewrite lookup_insert_ne.
  Qed.

  Lemma to_heap_delete h h' l :
    h' !! l = None →
    delete l (to_heap h h') = to_heap (delete l h) h'.
  Proof.
    move=>Hdom. rewrite /to_heap /to_high fmap_delete.
    apply/map_eq=> l'. rewrite lookup_op. case: (decide (l = l'))=> [<-|?].
    - by rewrite !lookup_delete lookup_to_low_None.
    - by rewrite lookup_delete_ne // lookup_delete_ne // -lookup_op.
  Qed.

  (** Set operations and [to_dom] *)

  Local Ltac crack l L :=
    case: (decide (l ∈ L))=>?;
    [rewrite option_guard_True //|rewrite option_guard_False //].

  Lemma lookup_to_fresh_None L l : l ∉ L → to_fresh L !! l = None.
  Proof. move=>?. by rewrite lookup_to_gmap option_guard_False. Qed.
  Lemma lookup_to_live_None L' l : l ∉ L' → to_live L' !! l = None.
  Proof. move=>?. by rewrite lookup_to_gmap option_guard_False. Qed.
  Lemma lookup_to_dom_None L L' l : l ∉ L ∪ L' → to_dom L L' !! l = None.
  Proof.
    move/not_elem_of_union=>[??].
    by rewrite lookup_op lookup_to_fresh_None // lookup_to_live_None.
  Qed.

  Lemma to_dom_fresh_insert L L' l :
    l ∉ L' → to_dom ({[l]} ∪ L) L' = <[l:=Fresh]> (to_dom L L').
  Proof.
    move=>?. rewrite/to_dom/to_fresh to_gmap_union_singleton.
    by rewrite insert_op_l // lookup_to_live_None.
  Qed.

  Lemma to_dom_delete L L' l :
    l ∉ L' → delete l (to_dom L L') = to_dom (L ∖ {[l]}) L'.
  Proof.
    move=>?. apply/map_eq=> x. rewrite lookup_op 2!lookup_to_gmap.
    case: (decide (l = x))=>[<-|?].
    - by rewrite lookup_delete // !option_guard_False //
        elem_of_difference elem_of_singleton =>-[].
    - rewrite lookup_delete_ne //.
      rewrite lookup_op 2!lookup_to_gmap. f_equal. crack x L.
      + by rewrite option_guard_True // elem_of_difference
          elem_of_singleton.
      + rewrite option_guard_False // elem_of_difference. by case; auto.
  Qed.

  Lemma to_dom_live_insert L L' l :
    to_dom (L ∖ {[l]}) ({[l]} ∪ L') = <[l:=Live]> (to_dom (L ∖ {[l]}) L').
  Proof.
    apply/map_eq=>x. rewrite lookup_op !lookup_to_gmap.
    case: (decide (l = x))=>[<-|?].
    - rewrite lookup_insert option_guard_False.
      + rewrite option_guard_True // elem_of_union elem_of_singleton.
        by left.
      + rewrite not_elem_of_difference elem_of_singleton. by right.
    - rewrite lookup_insert_ne // lookup_op 2!lookup_to_gmap.
      f_equal. crack x L'.
      + by rewrite option_guard_True.
      + rewrite elem_of_union. by right.
      + by rewrite option_guard_False.
      + by rewrite not_elem_of_union not_elem_of_singleton.
  Qed.

  Lemma dom_mark_live h h' L L' l :
    l ∈ L → dom locset (h ∪ h') = L ∪ L' →
    dom locset (h ∪ h') = L ∖ {[l]} ∪ ({[l]} ∪ L').
  Proof.
    move=>?->. set L'' := L ∖ {[l]}. unfold_leibniz=>x. rewrite elem_of_union.
    by case: (decide (l = x))=>[<-|?]; set_solver.
  Qed.

  Lemma dom_alloc_fresh h h' L L' l v :
    (h ∪ h') !! l = None → dom locset (h ∪ h') = L ∪ L' →
    dom locset (<[l:=v]> h ∪ h') = {[l]} ∪ L∪ L'.
  Proof.
    move=>? HD. unfold_leibniz=>x. rewrite -assoc -HD. fold_leibniz.
    rewrite -insert_union_l elem_of_union elem_of_singleton !elem_of_dom.
    split=>[-[] u|[?|-[] u]]; case: (decide (l = x))=>[<-|?].
    - move=>_. by left.
    - rewrite lookup_insert_ne // => ?. by right; exists u.
    - subst. exists v. by rewrite lookup_insert.
    - done.
    - move=>_. exists v. by rewrite lookup_insert.
    - move=>?. exists u. by rewrite lookup_insert_ne.
  Qed.

  Lemma dom_store_high h h' L L' l v1 v2 :
    h !! l = Some v1 → h' !! l = None → dom locset (h ∪ h') = L ∪ L' →
    dom locset (<[l:=v2]> h ∪ h') = L ∪ L'.
  Proof.
    move=>?? <-. unfold_leibniz=>x. fold_leibniz.
    rewrite !elem_of_dom. split=>-[] u; case: (decide (l = x))=>[<-|?].
    - move=>_. exists v1. exact: lookup_union_Some_l.
    - rewrite -insert_union_l lookup_insert_ne // =>?. by exists u.
    - move=>_. exists v2. by rewrite -insert_union_l lookup_insert.
    - move=>?. exists u. by rewrite -insert_union_l lookup_insert_ne.
  Qed.

  Lemma dom_low_insert_override h h' L L' l v1 v2 :
    h !! l = None → h' !! l = Some v1 → dom locset (h ∪ h') = L ∪ L' →
    dom locset (h ∪ <[l:=v2]> h') = L ∪ L'.
  Proof.
    move=>?? <-. unfold_leibniz=>x. fold_leibniz.
    rewrite !elem_of_dom -insert_union_r //.
    split=>-[] u; case: (decide (l = x))=>[<-|?].
    - move=>_. exists v1. exact: lookup_union_Some_r'.
    - rewrite lookup_insert_ne // => ?. by exists u.
    - move=>_. exists v2. by rewrite lookup_insert.
    - move=>?. exists u. by rewrite lookup_insert_ne.
  Qed.

  (** Validity *)

  Remark to_heap_disjoint h h' : ✓ to_heap h h' → h ⊥ₘ h'.
  Proof.
    move=>Hv. rewrite map_disjoint_spec=>l ? ? EQ EQ'; move/(_ l): Hv.
    by rewrite /to_heap lookup_op /to_high /to_low 2!lookup_fmap EQ EQ'.
  Qed.

  Lemma to_heap_high_included h h' l q v :
    ✓ to_heap h h' → {[l := Hval q v]} ≼ to_heap h h' →
    h !! l = Some v ∧ h' !! l = None.
  Proof.
    rewrite singleton_included => /(_ l) Hv [] u []; move: Hv.
    rewrite !lookup_op !lookup_fmap.
    case EQ: (h !! l)=>[vh|]; case EQ': (h' !! l)=>[vl|] /=.
    - by rewrite -Some_op Some_valid.
    - rewrite right_id.
      intros Hv (?&Heq&Heq')%(equiv_Some_inv_r _ _ u) Hinc; last done.
      apply (inj Some) in Heq. move: Heq Heq' Hinc => <- => Heq.
      case/Some_included.
      + by move: Heq=><- /csum_equivE [] _ /= /to_agree_inj
          /leibniz_equiv_iff ->.
      + move=> Hinc; move: Hinc Heq.
        case/csum_included; first by move=>->/csum_equivE.
        case; last by move=> [?] [?] [].
        move=> [[qa ua]] [[qb ub]] [] [<-<-] [] ->.
        move=> /prod_included/= [] _ Hinc.
        move=>/csum_equivE/= [] /= _ => Heq.
        rewrite <- Heq in Hinc.
        by move: Hinc => /to_agree_included /leibniz_equiv_iff ->.
    - rewrite left_id => _ Heq. apply (inj Some) in Heq. rewrite <- Heq.
      case/Some_included; first by move=>/csum_equivE.
      case/csum_included; first done.
      case. by move=> [?] [?] [] _ []. by move=> [?] [?] [].
    - rewrite right_id. by move=> _ /option_equivE.
  Qed.

  Lemma to_heap_low_included h h' l :
    ✓ to_heap h h' → {[l := Lval]} ≼ to_heap h h' →
    h !! l = None ∧ is_Some(h' !! l).
  Proof.
    rewrite singleton_included => /(_ l) Hv [] u []; move: Hv.
    rewrite !lookup_op /to_high /to_low !lookup_fmap.
    case EQ: (h !! l)=>[vh|]; case EQ': (h' !! l)=>[vl|] /=.
    - by rewrite -Some_op Some_valid.
    - rewrite right_id => _ Heq Hinc. apply Some_equiv_inj in Heq.
      case/Some_included: Hinc Heq; first by move=><- /csum_equivE.
      case/csum_included; first by move=>-> /csum_equivE.
      case; first by move=> [?] [?] [].
      by move=> [?] [?] [] _ [] -> _ /csum_equivE.
    - move=>_ _ _. split. done. by exists vl.
    - rewrite right_id. by move=> _ /option_equivE.
  Qed.

  Lemma to_dom_fresh_included L L' l :
    ✓ to_dom L L' → {[l := Fresh]} ≼ to_dom L L' → l ∈ L ∧ l ∉ L'.
  Proof.
    rewrite singleton_included => /(_ l) Hv [] u []; move: Hv.
    rewrite !lookup_op !lookup_to_gmap.
    crack l L; crack l L'; rewrite left_id.
    - case=>EQ. apply Some_equiv_inj in EQ. rewrite -EQ.
      case/Some_included; first by move/csum_equivE.
      by case/csum_included => // -[] [] ? [] ? [] ? [] ?.
    - by move=>_ /option_equivE.
  Qed.

  (** Updates *)

  Lemma to_heap_mark_low h h' l v :
    ✓ to_heap h h' → {[l := Hval 1 v]} ≼ to_heap h h' →
    (to_heap h h', {[l := Hval 1 v]}) ~l~>
    (to_heap (delete l h) (<[l:=v]> h'), {[l := Lval]}).
  Proof.
    move=>Hv /to_heap_high_included -/(_ Hv)[_ ?].
    etransitivity; first by apply delete_singleton_local_update, _.
    rewrite to_heap_delete // to_heap_low_insert; last by rewrite lookup_delete.
    apply alloc_singleton_local_update; last done.
    apply lookup_to_heap_None, lookup_union_None. by rewrite lookup_delete.
  Qed.

  Lemma to_dom_mark_live L L' l :
    ✓ to_dom L L' → {[l := Fresh]} ≼ to_dom L L' →
    (to_dom L L', {[l := Fresh]}) ~l~>
    (to_dom (L ∖ {[l]}) ({[l]} ∪ L'), {[l := Live]}).
  Proof.
    move=>Hv /to_dom_fresh_included -/(_ Hv)[_ ?].
    etransitivity; first by apply delete_singleton_local_update, _.
    rewrite to_dom_delete // to_dom_live_insert.
    apply alloc_singleton_local_update; last done.
    rewrite lookup_op !lookup_to_gmap !option_guard_False //.
    rewrite not_elem_of_difference elem_of_singleton. by right.
  Qed.

  Lemma to_heap_alloc_high h h' l v :
    (h ∪ h') !! l = None →
    (to_heap h h', ∅) ~l~> (to_heap (<[l:=v]> h) h', {[l := Hval 1 v]}).
  Proof.
    move=>Hdom.
    rewrite to_heap_high_insert; last by move: Hdom=>/lookup_union_None[].
    apply alloc_singleton_local_update. by apply lookup_to_heap_None. done.
  Qed.

  Lemma to_dom_alloc_fresh L L' l :
    l ∉ L ∪ L' →
    (to_dom L L', ∅) ~l~> (to_dom ({[l]} ∪ L) L', {[l := Fresh]}).
  Proof.
    move=>Hdom. rewrite to_dom_fresh_insert;
      last by move: Hdom=>/not_elem_of_union [].
    apply alloc_singleton_local_update; last done.
    by apply lookup_to_dom_None.
  Qed.

  Lemma to_heap_store_high h h' l v1 v2 :
    ✓ to_heap h h' → h !! l = Some v1 → h' !! l = None →
    (to_heap h h', {[l := Hval 1 v1]}) ~l~>
    (to_heap (<[l:=v2]> h) h', {[l := Hval 1 v2]}).
  Proof.
    move=>???. rewrite to_heap_high_insert //.
    eapply singleton_local_update; first exact: lookup_to_heap_Some.
    exact: exclusive_local_update.
  Qed.
End internal.
End internal.

(** * Heap interface *)
Section heap.
  Context `{heapG Σ}.
  Implicit Types l : loc.
  Implicit Types q : Qp.
  Implicit Types v : val.
  Implicit Types h : heap.
  Import internal.

  (** ** Structure *)
  (** High locations enjoy their usual properties. *)

  Global Instance mapsto_timeless l q v : TimelessP (l ↦{q} v).
  Proof. rewrite mapsto_eq. apply _. Qed.
  Global Instance mapsto_fractional l v : Fractional (λ q, l ↦{q} v)%I.
  Proof.
    intros p q. rewrite mapsto_eq -own_op -auth_frag_op.
    by rewrite op_singleton Cinl_op pair_op agree_idemp.
  Qed.
  Global Instance mapsto_as_fractional l q v :
    AsFractional (l ↦{q} v) (λ q, l ↦{q} v)%I q.
  Proof. split. done. apply _. Qed.

  Lemma mapsto_agree l q1 q2 v1 v2 : l ↦{q1} v1 ∗ l ↦{q2} v2 ⊢ ⌜v1 = v2⌝.
  Proof.
    rewrite mapsto_eq -own_op -auth_frag_op.
    rewrite own_valid auth_validI /= discrete_valid.
    rewrite op_singleton singleton_valid Cinl_op pair_op.
    by f_equiv=>-[] _ /agree_op_inv/to_agree_inj/leibniz_equiv_iff.
  Qed.

  Global Instance heap_ex_mapsto_fractional l : Fractional (λ q, l ↦{q} -)%I.
  Proof.
    intros p q. iSplit.
    - iDestruct 1 as (v) "[H1 H2]". iSplitL "H1"; eauto.
    - iIntros "[H1 H2]". iDestruct "H1" as (v1) "H1". iDestruct "H2" as (v2) "H2".
      iDestruct (mapsto_agree with "[$H1 $H2]") as %->. iExists v2. by iFrame.
  Qed.
  Global Instance heap_ex_mapsto_as_fractional l q :
    AsFractional (l ↦{q} -) (λ q, l ↦{q} -)%I q.
  Proof. split. done. apply _. Qed.

  Lemma mapsto_valid l q v : l ↦{q} v ⊢ ✓ q.
  Proof.
    rewrite mapsto_eq /mapsto_def own_valid auth_validI /=.
    rewrite 2!discrete_valid. f_equiv. rewrite singleton_valid. by case.
  Qed.
  Lemma mapsto_valid_2 l q1 q2 v1 v2 : l ↦{q1} v1 ∗ l ↦{q2} v2 ⊢ ✓ (q1 + q2)%Qp.
  Proof.
    iIntros "[H1 H2]". iDestruct (mapsto_agree with "[$H1 $H2]") as %->.
    iApply (mapsto_valid l _ v2). by iFrame.
  Qed.

  (** Low locations are disjoint from high locations. *)

  Lemma high_not_low l q v : l ↦{q} v ∗ low l ⊢ False.
  Proof.
    rewrite mapsto_eq low_loc lowloc_eq.
    rewrite -own_op own_valid auth_validI /= discrete_valid.
    by rewrite op_singleton singleton_valid.
  Qed.

  (** High locations containing low values can be marked low. *)

  Lemma heap_mark_low E l v :
    ↑heapN ⊆ E →
    heap_ctx ⊢  l ↦ v -∗ ▷ low v ={E}=∗ low l.
  Proof.
    rewrite mapsto_eq low_loc lowloc_eq. iIntros (?) "Hctx Hl Hv".
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_high_included h h' l 1 v) => // ??.
    iMod (own_update_2 with "Hh Hl") as "[Hh Hl]".
    { eapply auth_update. exact: to_heap_mark_low. }
    iMod ("Hcl" with "[-Hl]"); last by iFrame. iNext.
    iExists (delete l h), (<[l:=v]> h'), L, L'. iFrame "Hd Hh".
    rewrite -delete_insert_union //. iFrame "Hσ %".
    rewrite big_sepM_insert //. by iFrame "Hv Hlow".
  Qed.

  (** Fresh locations are exclusive. *)

  Global Instance fresh_timeless l : TimelessP (fresh l).
  Proof. rewrite fresh_eq. apply _. Qed.

  Lemma fresh_exclusive l : fresh l ∗ fresh l ⊢ False.
  Proof.
    rewrite fresh_eq -own_op -auth_frag_op.
    rewrite own_valid auth_validI /= discrete_valid.
    by rewrite op_singleton singleton_valid.
  Qed.

  (** Live locations persist and are disjoint from fresh locations. *)

  Global Instance liveloc_timeless l : TimelessP (liveloc l).
  Proof. rewrite liveloc_eq. apply _. Qed.
  Global Instance liveloc_persistent l : PersistentP (liveloc l).
  Proof. rewrite liveloc_eq. apply _. Qed.

  Lemma fresh_not_live l : fresh l ∗ liveloc l ⊢ False.
  Proof.
    rewrite fresh_eq liveloc_eq -own_op -auth_frag_op.
    rewrite own_valid auth_validI /= discrete_valid.
    by rewrite op_singleton singleton_valid.
  Qed.

  (** Fresh locations can be marked live. *)

  Lemma heap_mark_liveloc E l :
    ↑heapN ⊆ E →
    heap_ctx ⊢ fresh l ={E}=∗ liveloc l.
  Proof.
    rewrite fresh_eq liveloc_eq. iIntros (?) "Hctx Hl".
    iInv heapN as (h h' L L') "(>% & Hσ & Hh & Hlow & >Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hd Hl") as %[??]%auth_valid_discrete_2.
    case: (to_dom_fresh_included L L' l)=>// ??.
    iMod (own_update_2 with "Hd Hl") as "[Hd Hl]".
    { eapply auth_update. exact: to_dom_mark_live. }
    iMod ("Hcl" with "[-Hl]"); last by iFrame. iNext.
    iExists h, h', (L ∖ {[l]}), ({[l]} ∪ L'). iFrame "Hσ Hh Hlow Hd".
    by rewrite (dom_mark_live _ _ L L' l).
  Qed.

  (** ** Operational rules *)

  Lemma wp_alloc_fresh p E e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx }}} Alloc e @ p; E
    {{{ l, RET LocV l; l ↦ v ∗ fresh l }}}.
  Proof.
    iIntros (<-%of_to_val ? Φ) "Hctx HΦ". rewrite mapsto_eq fresh_eq.
    iInv heapN as (h h' L L') "(>HD & Hσ & >Hh & Hlow & >Hd)" "Hcl".
    iApply (wp_alloc_big with "Hσ"); first done. iNext.
    iIntros (l) "/= [% Hσ]". rewrite insert_union_l.
    iMod (own_update with "Hh") as "[Hh Hl]".
    { eapply auth_update_alloc. exact: to_heap_alloc_high. }
    iDestruct "HD" as %HD.
    iMod (own_update with "Hd") as "[Hd Hf]".
    { eapply auth_update_alloc. apply (to_dom_alloc_fresh _ _ l).
      by rewrite -HD not_elem_of_dom. }
    iMod ("Hcl" with "[-Hf Hl HΦ]"); last by iApply ("HΦ" with "[$Hl $Hf]").
    iNext. iExists (<[l:=v]> h), h', ({[l]} ∪ L), L'. iFrame "Hσ Hh Hlow Hd".
    by rewrite (dom_alloc_fresh _ _ L L').
  Qed.

  Lemma wp_load p E l q v :
    ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ l ↦{q} v }}} Load (Loc l) @ p; E
    {{{ RET v; l ↦{q} v }}}.
  Proof.
    iIntros (? Φ) "[Hctx >Hl] HΦ". rewrite mapsto_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_high_included h h' l q v) => // ??.
    iApply (wp_load_big with "Hσ"); [done|exact: lookup_union_Some_l|].
    iNext. iIntros "Hσ".
    iMod ("Hcl" with "[-Hl HΦ]"); last by iApply ("HΦ" with "Hl").
    iNext. iExists h, h', L, L'. by iFrame "Hσ Hh Hlow Hd".
  Qed.

  Lemma wp_load_low p E l :
    ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ low l }}} Load (Loc l) @ p; E
    {{{ v, RET v; low v }}}.
  Proof.
    iIntros (? Φ) "[Hctx >Hl] HΦ". rewrite low_loc lowloc_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_low_included h h' l) => // ? [v ?].
    iApply (wp_load_big with "Hσ"); [done|exact: lookup_union_Some_r'|].
    iNext. iIntros "Hσ".
    iDestruct (big_sepM_lookup _ _ l v with "Hlow") as "#Hv"; first done.
    iMod ("Hcl" with "[-HΦ]"); last by iApply ("HΦ" with "Hv").
    iNext. iExists h, h', L, L'. by iFrame "Hσ Hh Hlow Hd".
  Qed.

  Lemma wp_store p E l v' e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ l ↦ v' }}} Store (Loc l) e @ p; E
    {{{ RET UnitV; l ↦ v }}}.
  Proof.
    iIntros (<-%of_to_val ? Φ) "[Hctx >Hl] HΦ". rewrite mapsto_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_high_included h h' l 1 v') => // ??.
    iApply (wp_store_big with "Hσ"); [done|exact: lookup_union_Some_l|].
    iNext. iIntros "Hσ". iMod (own_update_2 with "Hh Hl") as "[Hh Hl]".
    { eapply auth_update. exact: to_heap_store_high. }
    iMod ("Hcl" with "[-Hl HΦ]"); last by iApply ("HΦ" with "Hl").
    iNext. iExists (<[l:=v]> h), h', L, L'. iFrame "Hh Hlow Hd".
    rewrite insert_union_l. iFrame "Hσ".
    by rewrite (dom_store_high _ _ L L' _ v').
  Qed.

  Lemma wp_store_low p E l e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ low  l ∗ ▷ low  v }}} Store (Loc l) e @ p; E
    {{{ RET UnitV; True }}}.
  Proof.
    iIntros (<-%of_to_val ? Φ) "(Hctx & >Hl & Hv) HΦ".
    rewrite low_loc lowloc_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_low_included h h' l) => // ? [v' ?].
    iApply (wp_store_big with "Hσ"); [done|exact: lookup_union_Some_r'|].
    iNext. iIntros "Hσ". iMod ("Hcl" with "[-HΦ]"); last by iApply "HΦ".
    iNext. iExists h, (<[l:=v]>h'), L, L'. iFrame "Hd".
    rewrite insert_union_r //. iFrame "Hσ".
    rewrite (to_heap_low_insert_override _ _ l v' v) //. iFrame "Hh".
    iDestruct (big_sepM_insert_override_2 _ h' l v' v with "Hlow [Hv]")
      as "Hlow"; auto. iFrame "Hlow".
    by rewrite (dom_low_insert_override _ _ L L' _ v').
  Qed.

  Lemma wp_cas_fail p E l q v' e1 v1 e2 v2 :
    to_val e1 = Some v1 → to_val e2 = Some v2 → v' ≠ v1 → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ l ↦{q} v' }}} CAS (Loc l) e1 e2 @ p; E
    {{{ RET LitV (LitBool false); l ↦{q} v' }}}.
  Proof.
    iIntros (<-%of_to_val <-%of_to_val ?? Φ) "[Hctx >Hl] HΦ". rewrite mapsto_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_high_included h h' l q v') => // ??.
    iApply (wp_cas_fail_big with "Hσ");
      [done|exact: lookup_union_Some_l|done|].
    iNext. iIntros "Hσ".
    iMod ("Hcl" with "[-Hl HΦ]"); last by iApply ("HΦ" with "Hl").
    iNext. iExists h, h', L, L'. by iFrame.
  Qed.

  Lemma wp_cas_suc p E l e1 v1 e2 v2 :
    to_val e1 = Some v1 → to_val e2 = Some v2 → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ l ↦ v1 }}} CAS (Loc l) e1 e2 @ p; E
    {{{ RET LitV (LitBool true); l ↦ v2 }}}.
  Proof.
    iIntros (<-%of_to_val <-%of_to_val ? Φ) "[Hcx >Hl] HΦ". rewrite mapsto_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_high_included h h' l 1 v1) => // ??.
    iApply (wp_cas_suc_big with "Hσ");
      [done|exact: lookup_union_Some_l|].
    iNext. iIntros "Hσ". iMod (own_update_2 with "Hh Hl") as "[Hh Hl]".
    { eapply auth_update. exact: to_heap_store_high. }
    iMod ("Hcl" with "[-Hl HΦ]"); last by iApply ("HΦ" with "Hl").
    iNext. iExists (<[l:=v2]> h), h', L, L'. iFrame "Hh Hlow Hd".
    rewrite insert_union_l. iFrame "Hσ".
    by rewrite (dom_store_high _ _ L L' _ v1).
  Qed.

  Lemma wp_cas_low p E l e1 v1 e2 v2 :
    to_val e1 = Some v1 → to_val e2 = Some v2 → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ low l ∗ ▷ low v2 }}} CAS (Loc l) e1 e2 @ p; E
    {{{ b, RET LitV (LitBool b); True }}}.
  Proof.
    iIntros (<-%of_to_val <-%of_to_val ? Φ) "(Hctx & >Hl & Hv) HΦ".
    rewrite low_loc lowloc_eq.
    iInv heapN as (h h' L L') "(>% & Hσ & >Hh & Hlow & Hd)" "Hcl".
    iDestruct (own_valid_2 with "Hh Hl") as %[??]%auth_valid_discrete_2.
    case: (to_heap_low_included h h' l) => // ? [v' ?].
    case: (decide (v' = v1)) => [<-|?].
    - iApply (wp_cas_suc_big with "Hσ");
        [done|exact: lookup_union_Some_r'|].
      iNext. iIntros "Hσ". iMod ("Hcl" with "[-HΦ]"); last by iApply "HΦ".
      iNext. iExists h, (<[l:=v2]>h'), L, L'. iFrame "Hd".
      rewrite insert_union_r //. iFrame "Hσ".
      rewrite (to_heap_low_insert_override _ _ l v' v2) //. iFrame "Hh".
      iDestruct (big_sepM_insert_override_2 _ h' l v' v2 with "Hlow [Hv]")
        as "Hlow"; auto. iFrame "Hlow".
      by rewrite (dom_low_insert_override _ _ L L' _ v').
    - iApply (wp_cas_fail_big with "Hσ");
        [done|exact: lookup_union_Some_r'|done|].
      iNext. iIntros "Hσ". iMod ("Hcl" with "[-HΦ]"); last by iApply "HΦ".
      iNext. iExists h, h', L, L'. by iFrame.
  Qed.
End heap.
Typeclasses Opaque mapsto lowloc' fresh' liveloc' heap_ctx'.

(** ** Derived rules *)
Section derived.
  Context `{heapG Σ}.
  Implicit Types e : expr.
  Implicit Types v : val.

  Lemma fresh_not_elem_of_live l L : fresh l -∗ live L -∗ ⌜l ∉ L⌝.
  Proof.
    induction L as [|x L Hx IH] using collection_ind_L.
    { iIntros "Hl _". iPureIntro. exact: not_elem_of_empty. }
    iIntros "Hl HL".
    rewrite big_sepS_union; last by move=>?/elem_of_singleton->.
    rewrite big_sepS_singleton. iDestruct "HL" as "[Hx HL]".
    iDestruct (IH with "Hl HL") as "%". rewrite not_elem_of_union.
    case: (decide (l = x))=>?; last first.
    { iFrame. iPureIntro. by rewrite not_elem_of_singleton. }
    subst. iExFalso. by iApply (fresh_not_live with "[$Hl $Hx]").
  Qed.

  Lemma heap_mark_live E l L :
    ↑heapN ⊆ E →
    heap_ctx -∗ fresh l -∗ live L ={E}=∗ ⌜l ∉ L⌝ ∗ live ({[l]} ∪ L).
  Proof.
    iIntros (?) "Hh Hl HL".
    iDestruct (fresh_not_elem_of_live with "Hl HL") as "%". iFrame "%".
    rewrite big_sepS_union //;
      last by rewrite elem_of_disjoint=>x /elem_of_singleton=>->.
    rewrite big_sepS_singleton. iFrame "HL".
    by iApply (heap_mark_liveloc with "Hh Hl").
  Qed.

  (**
	We can allocate high and low locations, tracking
	freshness or not.
  *)
  Lemma wp_alloc p E e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx }}} Alloc e @ p; E {{{ l, RET LocV l; l ↦ v }}}.
  Proof.
    iIntros (?? Φ) "Hh HΦ".
    iApply (wp_alloc_fresh with "Hh"); eauto. iNext. iIntros (l) "[Hl _]".
    by iApply "HΦ".
  Qed.

  Lemma wp_alloc_low_fresh p E e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ low v }}} Alloc e @ p; E
    {{{ l, RET LocV l; low l ∗ fresh l }}}.
  Proof.
    iIntros (?? Φ) "[#Hh Hv] HΦ". rewrite -wp_fupd.
    iApply (wp_alloc_fresh with "Hh"); eauto. iNext. iIntros (l) "[Hl Hf]".
    rewrite [low _]later_intro. iMod (heap_mark_low with "Hh Hl Hv") as "Hl".
    done. by iApply ("HΦ" with "[$Hl $Hf]").
  Qed.

  Lemma wp_alloc_low p E e v :
    to_val e = Some v → ↑heapN ⊆ E →
    {{{ heap_ctx ∗ ▷ low v }}} Alloc e @ p; E
    {{{ l, RET LocV l; low l }}}.
  Proof.
    iIntros (?? Φ) "[Hh Hv] HΦ".
    iApply (wp_alloc_low_fresh with "[$Hh $Hv]"); eauto. iNext.
    iIntros (l) "[Hl _]". by iApply "HΦ".
  Qed.

  (** We can always eliminate low values. *)
  Lemma wp_low_alloc_bind E e :
    ↑heapN ⊆ E →
    heap_ctx -∗
    WP e @ E ?{{ low }} -∗
    WP Alloc e @ E ?{{ low }}.
  Proof.
    iIntros (?) "Hh He".
    wp_apply (wp_wand with "He"). iIntros (v) "Hv".
    by iApply (wp_alloc_low with "[$Hh Hv]"); auto.
  Qed.

  Lemma wp_low_load_bind E e :
    ↑heapN ⊆ E →
    heap_ctx -∗
    WP e @ E ?{{ low }} -∗
    WP Load e @ E ?{{ low }}.
  Proof.
    iIntros (?) "Hh He".
    iApply (wp_on_val_load_bind with "He"). iIntros (l) "Hl".
    by iApply (wp_load_low with "[$Hh Hl]"); auto.
  Qed.

  Lemma wp_low_store_bind E e1 e2:
    ↑heapN ⊆ E →
    heap_ctx -∗
    WP e1 @ E ?{{ low }} -∗
    WP e2 @ E ?{{ low }} -∗
    WP Store e1 e2 @ E ?{{ low }}.
  Proof.
    iIntros (?) "Hh He1 He2".
    iApply (wp_on_val_store_bind with "He1 He2 [Hh]"). iIntros (l1 v2) "Hl1 Hv2".
    by iApply (wp_store_low with "[$Hh Hl1 Hv2]"); auto.
  Qed.

  Lemma wp_low_cas_bind E e0 e1 e2 Φ1 :
    ↑heapN ⊆ E →
    heap_ctx -∗
    WP e0 @ E ?{{ low }} -∗
    WP e1 @ E ?{{ Φ1 }} -∗
    WP e2 @ E ?{{ low }} -∗
    WP CAS e0 e1 e2 @ E ?{{ low }}.
  Proof.
    iIntros (?) "Hh He0 He1 He2".
    iApply (wp_on_val_cas_bind with "He0 He1 He2").
    iIntros (l0 v1 v2) "Hl0 Hv2".
    by iApply (wp_cas_low with "[$Hh $Hl0 $Hv2]"); auto.
  Qed.
End derived.
