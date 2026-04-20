(* Modernized OCPL-style low-integrity layer for current Iris HeapLang. *)
From stdpp Require Import gmap.
From iris.algebra Require Import ofe.
From iris.bi Require Import interface derived_laws_later.
From iris.bi.lib Require Import fixpoint_banach.
From iris.proofmode Require Import proofmode.
From iris.program_logic Require Export weakestpre.
From iris.heap_lang Require Export lang metatheory primitive_laws.
From iris.heap_lang Require Import notation proofmode.

Module OCPLModernHeap.
  Open Scope expr_scope.

  Definition env := gmap string val.

  Class LowIntegrity Σ (A : Type) := Low {
    low : A -> iProp Σ;
    #[global] low_persistent a :: Persistent (low a);
    #[global] low_ne n :: Proper ((=) ==> dist n) low
  }.
  Arguments Low {_ _} _ _ _.
  Arguments low {_ _ _} _ : simpl never.
  Instance : Params (@low) 3 := {}.

  Global Instance low_proper `{LowIntegrity Σ A} :
    Proper ((=) ==> (≡)) low.
  Proof. solve_proper. Qed.

  Section low_values.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Context `{!LowIntegrity Σ loc}.

    Definition low_pre (self : val -d> iPropO Σ) : val -d> iPropO Σ :=
      OfeMor (λ v,
        match v with
        | LitV (LitLoc l) => low l
        | LitV _ => True
        | RecV f x e =>
            □ ∀ E, ▷ ∀ w, self w -∗
              WP (subst' x w (subst' f (RecV f x e) e)) @ MaybeStuck; E
                {{ v', self v' }}
        | PairV v1 v2 => ▷ (self v1 ∗ self v2)
        | InjLV v | InjRV v => ▷ self v
        end)%I.

    Global Instance low_pre_contractive :
      Contractive low_pre.
    Proof. solve_contractive. Qed.

    Definition low_val : val -d> iPropO Σ := fixpoint low_pre.

    Global Instance low_val_persistent v : Persistent (low_val v).
    Proof.
      apply (fixpoint_persistent low_pre).
      intros Φ HΦ w.
      destruct w as [l|f x e|v1 v2|vinl|vinr]; simpl.
      - destruct l; simpl; apply _.
      - apply _.
      - apply _.
      - apply _.
      - apply _.
    Qed.

    Global Instance val_low : LowIntegrity Σ val :=
      Low low_val _ _.

    Lemma low_loc l :
      low l ⊣⊢ low (A := loc) l.
    Proof. done. Qed.

    Lemma low_val_eq v :
      low v ⊣⊢ low_val v.
    Proof. done. Qed.

    Lemma low_val_unfold v :
      low v ⊣⊢
      match v with
        | LitV (LitLoc l) => low (A := loc) l
        | LitV _ => True
        | RecV f x e =>
          □ ∀ E, ▷ ∀ w, low_val w -∗
            WP (subst' x w (subst' f (RecV f x e) e)) @ MaybeStuck; E
              {{ v', low_val v' }}
      | PairV v1 v2 => ▷ (low_val v1 ∗ low_val v2)
      | InjLV v | InjRV v => ▷ low_val v
      end.
    Proof.
      rewrite low_val_eq.
      change (low_val v ⊣⊢ low_pre low_val v).
      rewrite /low_val.
      apply (fixpoint_unfold low_pre v).
    Qed.

    Global Instance env_low : LowIntegrity Σ env :=
      Low (λ γ, [∗ map] v ∈ γ, low v)%I _ _.

    Lemma low_env γ :
      low γ ⊣⊢ [∗ map] v ∈ γ, low v.
    Proof. done. Qed.

    Lemma low_env_empty :
      low (∅ : env) ⊣⊢ True.
    Proof. exact: big_sepM_empty. Qed.

    Lemma low_env_insert γ x v :
      γ !! x = None ->
      low v -∗ low γ -∗ low (<[x := v]> γ).
    Proof.
      iIntros (?) "#Hv #Hγ".
      rewrite !low_env.
      iApply (big_sepM_insert_2 (λ _ w, low w)%I with "Hv").
      iExact "Hγ".
    Qed.

    Lemma low_env_singleton x v :
      low ({[x := v]} : env) ⊣⊢ low v.
    Proof. exact: big_sepM_singleton. Qed.

    Lemma low_env_lookup γ x v :
      γ !! x = Some v ->
      low γ -∗ low v.
    Proof.
      iIntros (?) "Hγ".
      rewrite low_env.
      iDestruct (big_sepM_lookup (λ _ w, low w)%I γ x v with "Hγ") as "$"; done.
    Qed.

    Lemma low_env_delete γ x :
      low γ -∗ low (delete x γ).
    Proof.
      iIntros "Hγ".
      rewrite !low_env.
      destruct (γ !! x) as [v|] eqn:Hlookup.
      - rewrite (big_sepM_delete (λ _ w, low w)%I γ x v); [|done].
        iDestruct "Hγ" as "[_ Hγ]".
        iExact "Hγ".
      - rewrite delete_notin; [done|].
        done.
      Qed.

    Lemma low_to_low_val_ent v :
      low v ⊢ low_val v.
    Proof.
      exact (proj1 (proj1 (bi.equiv_entails _ _) (low_val_eq v))).
    Qed.

    Lemma low_val_to_low_ent v :
      low_val v ⊢ low v.
    Proof.
      exact (proj2 (proj1 (bi.equiv_entails _ _) (low_val_eq v))).
    Qed.

    Lemma low_rec_elim_ent f x e :
      low (RecV f x e) ⊢
      □ ∀ E, ▷ ∀ w, low_val w -∗
        WP (subst' x w (subst' f (RecV f x e) e)) @ MaybeStuck; E
          {{ v', low_val v' }}.
    Proof.
      exact (proj1 (proj1 (bi.equiv_entails _ _) (low_val_unfold (RecV f x e)))).
    Qed.

    Lemma low_pair_elim_ent v1 v2 :
      low (PairV v1 v2) ⊢ ▷ (low_val v1 ∗ low_val v2).
    Proof.
      exact (proj1 (proj1 (bi.equiv_entails _ _) (low_val_unfold (PairV v1 v2)))).
    Qed.

    Lemma low_pair_intro_ent v1 v2 :
      ▷ (low_val v1 ∗ low_val v2) ⊢ low (PairV v1 v2).
    Proof.
      exact (proj2 (proj1 (bi.equiv_entails _ _) (low_val_unfold (PairV v1 v2)))).
    Qed.

    Lemma low_inl_elim_ent v :
      low (InjLV v) ⊢ ▷ low_val v.
    Proof.
      exact (proj1 (proj1 (bi.equiv_entails _ _) (low_val_unfold (InjLV v)))).
    Qed.

    Lemma low_inl_intro_ent v :
      ▷ low_val v ⊢ low (InjLV v).
    Proof.
      exact (proj2 (proj1 (bi.equiv_entails _ _) (low_val_unfold (InjLV v)))).
    Qed.

    Lemma low_inr_elim_ent v :
      low (InjRV v) ⊢ ▷ low_val v.
    Proof.
      exact (proj1 (proj1 (bi.equiv_entails _ _) (low_val_unfold (InjRV v)))).
    Qed.

    Lemma low_inr_intro_ent v :
      ▷ low_val v ⊢ low (InjRV v).
    Proof.
      exact (proj2 (proj1 (bi.equiv_entails _ _) (low_val_unfold (InjRV v)))).
    Qed.

    Lemma low_to_low_val v :
      ⊢ low v -∗ low_val v.
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_to_low_val_ent v).
    Qed.

    Lemma low_val_to_low v :
      ⊢ low_val v -∗ low v.
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_val_to_low_ent v).
    Qed.

    Lemma low_rec_elim_raw f x e :
      ⊢ low (RecV f x e) -∗
        □ ∀ E, ▷ ∀ w, low_val w -∗
          WP (subst' x w (subst' f (RecV f x e) e)) @ MaybeStuck; E
            {{ v', low_val v' }}.
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_rec_elim_ent f x e).
    Qed.

    Lemma low_pair_elim_raw v1 v2 :
      ⊢ low (PairV v1 v2) -∗ ▷ (low_val v1 ∗ low_val v2).
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_pair_elim_ent v1 v2).
    Qed.

    Lemma low_pair_intro_raw v1 v2 :
      ⊢ ▷ (low_val v1 ∗ low_val v2) -∗ low (PairV v1 v2).
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_pair_intro_ent v1 v2).
    Qed.

    Lemma low_inl_elim_raw v :
      ⊢ low (InjLV v) -∗ ▷ low_val v.
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_inl_elim_ent v).
    Qed.

    Lemma low_inl_intro_raw v :
      ⊢ ▷ low_val v -∗ low (InjLV v).
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_inl_intro_ent v).
    Qed.

    Lemma low_inr_elim_raw v :
      ⊢ low (InjRV v) -∗ ▷ low_val v.
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_inr_elim_ent v).
    Qed.

    Lemma low_inr_intro_raw v :
      ⊢ ▷ low_val v -∗ low (InjRV v).
    Proof.
      apply bi.wand_intro_r. etrans; [apply bi.emp_sep_2|].
      exact (low_inr_intro_ent v).
    Qed.
  End low_values.

  Section proofmode.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Context `{!LowIntegrity Σ loc}.

    Global Instance into_sep_low_pair v1 v2 :
      IntoSep (low (PairV v1 v2)) (▷ low v1) (▷ low v2).
    Proof.
      rewrite /IntoSep.
      etrans; [exact (low_pair_elim_ent v1 v2)|].
      rewrite bi.later_sep.
      do 2 rewrite low_val_eq.
      done.
    Qed.

    Global Instance from_sep_low_pair v1 v2 :
      FromSep (low (PairV v1 v2)) (▷ low v1) (▷ low v2).
    Proof.
      rewrite /FromSep.
      etrans.
      2: exact (low_pair_intro_ent v1 v2).
      rewrite -bi.later_sep.
      do 2 rewrite low_val_eq.
      done.
    Qed.

  End proofmode.
End OCPLModernHeap.
