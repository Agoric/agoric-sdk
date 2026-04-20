From iris.heap_lang Require Import heap adequacy.
From iris.proofmode Require Import tactics.
From iris.heap_lang Require Import proofmode notation.
Import uPred.

(** * Read-only locations *)

Definition readonly : val := λ: "r" <>, ! "r".
Definition usetwo : expr :=
  let: "r" := ref #2 in
  let: "w" := readonly "r" in
  let: "use" := λ: <>, assert: (! ("r") = #2) in
  ("use", "w").

Section proof.
  Context `{heapG Σ}.
  Implicit Types l : loc.

  (* Triples to match paper. (WP would be simpler.) *)
  Lemma readonly_spec :
    (∀ l, {{{ True }}} ! l {{{ v, RET v; low v }}} -∗
    {{{ True }}} readonly l {{{ f, RET f; low f }}})%I.
  Proof.
    iIntros (l) "#Hderef !#". iIntros (Φ) "_ HΦ". wp_lam. iApply "HΦ". clear Φ.
    rewrite low_val. iAlways. iNext. iIntros (arg) "_". simpl_subst.
    iApply wp_forget_progress.
    iApply ("Hderef" with "[]"); first done. iNext. by iIntros.
  Qed.

  Context (N : namespace) (HN : heapN ⊥ N).
  Definition usetwo_inv l : iProp Σ := (inv N (l ↦ #2))%I.

  Lemma usetwo_deref l p :
    {{{ heap_ctx ∗ usetwo_inv l }}} ! l @ p; ⊤ {{{ RET #2; True }}}.
  Proof.
    iIntros (Φ) "#(Hh & Hinv) HΦ".
    iInv N as "Hl" "Hclose". wp_load. iMod ("Hclose" with "[$Hl]"). iModIntro.
    by iApply "HΦ".
  Qed.

  Lemma usetwo_use l :
    heap_ctx ∗ usetwo_inv l ⊢ low (LamV <> (assert: ! l = #2)).
  Proof.
    iIntros "#(Hh & Hinv)".
    rewrite low_val. iAlways. iNext. iIntros (arg) "_". simpl_subst.
      wp_bind (! _)%E.
    wp_apply (usetwo_deref with "[$Hh $Hinv]"). iIntros "_".
    wp_apply wp_assert. wp_op=>?; last done. iSplit. done. by simpl_low.
  Qed.

  Lemma usetwo_spec : {{{ heap_ctx }}} usetwo {{{ v, RET v; low v }}}.
  Proof.
    iIntros (Φ) "#Hh HΦ". rewrite/usetwo.
    wp_alloc l as "Hl". wp_let.
    iMod (inv_alloc N _ (l ↦ #2)%I with "[$Hl]") as "#Hinv".
    (* Here we pay for not using WP in [readonly_spec]. *)
    iDestruct (readonly_spec $! l with "[]") as ">HRO".
    { iAlways. iIntros (Ψ) "_ HΨ".
      wp_apply (usetwo_deref with "[$Hh $Hinv]"). iIntros "_".
      iApply "HΨ". by simpl_low. }
    wp_apply ("HRO" with "[]"); first done.
    iIntros (w) "Hw". wp_let. wp_lam.
    iApply "HΦ". simpl_low. iNext. iFrame.
    by iApply (usetwo_use with "[$Hh $Hinv]").
  Qed.
End proof.

Lemma usetwo_safe C t2 σ2 :
  AdvCtx C →
  rtc step ([ctx_fill C usetwo], good_state ∅) (t2, σ2) →
  is_good σ2.
Proof.
  set Σ : gFunctors := #[heapΣ].
  set N : namespace := nroot .@ "usetwo".
  move=>??. eapply (robust_safety Σ); try done.
  { naive_solver eauto using is_closed_of_val. }
  iIntros (?) "Hh". wp_apply (usetwo_spec N with "Hh"); auto with ndisj.
Qed.

Print Assumptions usetwo_safe.
