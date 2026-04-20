(* Modernized OCPL-style value-elimination lemmas over the modern `low` predicate. *)
From iris.proofmode Require Import proofmode.
From iris.heap_lang Require Export primitive_laws.
From iris.heap_lang Require Import notation proofmode tactics.
From OCPL Require Import modern_heap modern_lifting.

Module OCPLModernOnVal.
  Import OCPLModernHeap OCPLModernLifting.

  Section wp_on_val.
    Context {Σ : gFunctors}.
    Context {hlc : has_lc}.
    Context `{!heapGS_gen hlc Σ}.
    Context `{!LowIntegrity Σ loc}.

    Lemma wp_on_val_app E v1 v2 :
      low v1 -∗
      low v2 -∗
      WP App (Val v1) (Val v2) @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv1 Hv2".
      destruct v1 as [lit|f x e|v11 v12|v1'|v1']; simpl.
      - iApply (wp_stuck_app_nrec with "[]"); [done|done|simpl; tauto|done].
      - iPoseProof (low_rec_elim_raw f x e with "Hv1") as "#Hrec".
        wp_pures.
        iSpecialize ("Hrec" $! E).
        wp_apply ("Hrec" with "Hv2").
      - iApply (wp_stuck_app_nrec with "[]"); [done|done|simpl; tauto|done].
      - iApply (wp_stuck_app_nrec with "[]"); [done|done|simpl; tauto|done].
      - iApply (wp_stuck_app_nrec with "[]"); [done|done|simpl; tauto|done].
    Qed.

    Lemma wp_on_val_app_raw E v1 v2 :
      ⊢ low v1 -∗
        low v2 -∗
        WP App (Val v1) (Val v2) @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv1 Hv2".
      iApply (wp_on_val_app with "Hv1 Hv2").
    Qed.

    Lemma wp_on_val_app_bind E e1 e2 :
      WP e1 @ MaybeStuck; E {{ v, low v }} -∗
      WP e2 @ MaybeStuck; E {{ v, low v }} -∗
      WP App e1 e2 @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He1 He2".
      wp_bind e2.
      wp_smart_apply (wp_wand with "He2") as (v2) "Hv2".
      wp_bind e1.
      wp_smart_apply (wp_wand with "He1") as (v1) "Hv1".
      by iApply (wp_on_val_app with "Hv1 Hv2").
    Qed.

    Lemma wp_on_val_pair E v1 v2 :
      ▷ low v1 -∗
      ▷ low v2 -∗
      WP Pair (Val v1) (Val v2) @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv1 Hv2".
      wp_pures.
      iApply low_pair_intro_raw.
      by iFrame.
    Qed.

    Lemma wp_on_val_pair_raw E v1 v2 :
      ⊢ ▷ low v1 -∗
        ▷ low v2 -∗
        WP Pair (Val v1) (Val v2) @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv1 Hv2".
      iApply (wp_on_val_pair with "Hv1 Hv2").
    Qed.

    Lemma wp_on_val_pair_bind E e1 e2 :
      WP e1 @ MaybeStuck; E {{ v, low v }} -∗
      WP e2 @ MaybeStuck; E {{ v, low v }} -∗
      WP Pair e1 e2 @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He1 He2".
      wp_bind e2.
      wp_smart_apply (wp_wand with "He2") as (v2) "Hv2".
      wp_bind e1.
      wp_smart_apply (wp_wand with "He1") as (v1) "Hv1".
      by iApply (wp_on_val_pair with "Hv1 Hv2").
    Qed.

    Lemma wp_on_val_fst E v :
      low v -∗
      WP Fst (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      destruct v as [lit|f x e|v1 v2|v0|v0].
      - iApply (wp_stuck_fst with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_fst with "[]"); [done|simpl; tauto|done].
      - iPoseProof (low_pair_elim_raw with "Hv") as "Hpair".
        iApply lifting.wp_pure_step_later; first done.
        iIntros "!> _".
        iDestruct "Hpair" as "[Hv1 _]".
        iApply wp_value_fupd'.
        by iApply low_val_to_low.
      - iApply (wp_stuck_fst with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_fst with "[]"); [done|simpl; tauto|done].
    Qed.

    Lemma wp_on_val_fst_raw E v :
      ⊢ low v -∗
        WP Fst (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      iApply (wp_on_val_fst with "Hv").
    Qed.

    Lemma wp_on_val_fst_bind E e :
      WP e @ MaybeStuck; E {{ v, low v }} -∗
      WP Fst e @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He".
      wp_bind e.
      wp_smart_apply (wp_wand with "He") as (v) "Hv".
      by iApply (wp_on_val_fst with "Hv").
    Qed.

    Lemma wp_on_val_snd E v :
      low v -∗
      WP Snd (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      destruct v as [lit|f x e|v1 v2|v0|v0].
      - iApply (wp_stuck_snd with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_snd with "[]"); [done|simpl; tauto|done].
      - iPoseProof (low_pair_elim_raw with "Hv") as "Hpair".
        iApply lifting.wp_pure_step_later; first done.
        iIntros "!> _".
        iDestruct "Hpair" as "[_ Hv2]".
        iApply wp_value_fupd'.
        by iApply low_val_to_low.
      - iApply (wp_stuck_snd with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_snd with "[]"); [done|simpl; tauto|done].
    Qed.

    Lemma wp_on_val_snd_raw E v :
      ⊢ low v -∗
        WP Snd (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      iApply (wp_on_val_snd with "Hv").
    Qed.

    Lemma wp_on_val_snd_bind E e :
      WP e @ MaybeStuck; E {{ v, low v }} -∗
      WP Snd e @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He".
      wp_bind e.
      wp_smart_apply (wp_wand with "He") as (v) "Hv".
      by iApply (wp_on_val_snd with "Hv").
    Qed.

    Lemma wp_on_val_inl E v :
      ▷ low v -∗
      WP InjL (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      wp_pures.
      iApply low_inl_intro_raw.
      done.
    Qed.

    Lemma wp_on_val_inl_raw E v :
      ⊢ ▷ low v -∗
        WP InjL (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      iApply (wp_on_val_inl with "Hv").
    Qed.

    Lemma wp_on_val_inl_bind E e :
      WP e @ MaybeStuck; E {{ v, low v }} -∗
      WP InjL e @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He".
      wp_bind e.
      wp_smart_apply (wp_wand with "He") as (v) "Hv".
      by iApply (wp_on_val_inl with "Hv").
    Qed.

    Lemma wp_on_val_inr E v :
      ▷ low v -∗
      WP InjR (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      wp_pures.
      iApply low_inr_intro_raw.
      done.
    Qed.

    Lemma wp_on_val_inr_raw E v :
      ⊢ ▷ low v -∗
        WP InjR (Val v) @ MaybeStuck; E {{ v', low v' }}.
    Proof.
      iIntros "Hv".
      iApply (wp_on_val_inr with "Hv").
    Qed.

    Lemma wp_on_val_inr_bind E e :
      WP e @ MaybeStuck; E {{ v, low v }} -∗
      WP InjR e @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He".
      wp_bind e.
      wp_smart_apply (wp_wand with "He") as (v) "Hv".
      by iApply (wp_on_val_inr with "Hv").
    Qed.

    Lemma wp_on_val_case E v e1 e2 :
      low v -∗
      ▷ (∀ v0, low v0 -∗
        WP App e1 (Val v0) @ MaybeStuck; E {{ v, low v }} ∧
        WP App e2 (Val v0) @ MaybeStuck; E {{ v, low v }}) -∗
      WP Case (Val v) e1 e2 @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv Hk".
      destruct v as [lit|f x e|v0 v1|v0|v0].
      - iApply (wp_stuck_case with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_case with "[]"); [done|simpl; tauto|done].
      - iApply (wp_stuck_case with "[]"); [done|simpl; tauto|done].
      - iPoseProof (low_inl_elim_raw with "Hv") as "Hin".
        iApply lifting.wp_pure_step_later; first done.
        iIntros "!> _".
        iDestruct "Hin" as "Hv".
        iDestruct ("Hk" with "Hv") as "[Hinl _]".
        done.
      - iPoseProof (low_inr_elim_raw with "Hv") as "Hin".
        iApply lifting.wp_pure_step_later; first done.
        iIntros "!> _".
        iDestruct "Hin" as "Hv".
        iDestruct ("Hk" with "Hv") as "[_ Hinr]".
        done.
    Qed.

    Lemma wp_on_val_case_raw E v e1 e2 :
      ⊢ low v -∗
        ▷ (∀ v0, low v0 -∗
          WP App e1 (Val v0) @ MaybeStuck; E {{ v, low v }} ∧
          WP App e2 (Val v0) @ MaybeStuck; E {{ v, low v }}) -∗
        WP Case (Val v) e1 e2 @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "Hv Hk".
      iApply (wp_on_val_case with "Hv Hk").
    Qed.

    Lemma wp_on_val_case_bind E e0 e1 e2 :
      WP e0 @ MaybeStuck; E {{ v, low v }} -∗
      ▷ (∀ v0, low v0 -∗
        WP App e1 (Val v0) @ MaybeStuck; E {{ v, low v }} ∧
        WP App e2 (Val v0) @ MaybeStuck; E {{ v, low v }}) -∗
      WP Case e0 e1 e2 @ MaybeStuck; E {{ v, low v }}.
    Proof.
      iIntros "He0 Hk".
      wp_bind e0.
      wp_smart_apply (wp_wand with "He0") as (v) "Hv".
      by iApply (wp_on_val_case with "Hv Hk").
    Qed.
  End wp_on_val.
End OCPLModernOnVal.
