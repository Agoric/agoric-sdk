(* Direct HeapLang encoding of makeCounter, for OCPL/Iris-style reuse. *)
From Coq Require Import ZArith Lia.
From stdpp Require Import gmap.
From iris.proofmode Require Import proofmode.
From iris.base_logic.lib Require Export invariants.
From iris.program_logic Require Export weakestpre.
From iris.heap_lang Require Export lang adequacy.
From iris.heap_lang Require Import proofmode notation.
From iris.heap_lang.lib Require Import assert.

Module JessieCounterHeapLang.
  Open Scope expr_scope.

  Definition incr_cap (l : loc) : val :=
    λ: <>, #l <- (! #l + #1);; ! #l.

  Definition decr_cap (l : loc) : val :=
    λ: <>, #l <- (! #l - #1);; ! #l.

  Definition makeCounter : val :=
    λ: <>,
      let: "counter" := ref #0 in
      let: "incr" := λ: <>, "counter" <- (! "counter" + #1);; ! "counter" in
      let: "decr" := λ: <>, "counter" <- (! "counter" - #1);; ! "counter" in
      ("incr", "decr").

  Definition cUp_of : val := λ: "c", Fst "c".

  Definition checked_client_body : val :=
    λ: "attacker",
      let: "c" := makeCounter #() in
      let: "cUp" := cUp_of "c" in
      "attacker" "cUp";;
      assert: (#0 < ((Fst "c") #())).

  Definition overshared_client_body : val :=
    λ: "attacker",
      let: "c" := makeCounter #() in
      "attacker" "c";;
      assert: (#0 < ((Fst "c") #())).

  Definition hole_attacker : val := λ: "cUp", #().
  Definition single_incr_attacker : val := λ: "cUp", "cUp" #().
  Definition single_decr_attacker : val := λ: "c", (Snd "c") #().

  Section proof.
    Context `{!heapGS Σ}.

    Lemma checked_client_from_mono_attacker_wp (attacker : val) :
      (forall (l : loc) (n : Z),
        {{{ l ↦ #n }}}
          attacker (incr_cap l)
        {{{ (v : val) (m : Z), RET v; ⌜(n <= m)%Z⌝ ∗ l ↦ #m }}}) ->
      {{{ True }}} checked_client_body attacker {{{ RET #(); True }}}.
    Proof.
      iIntros (Hatt Φ) "_ HΦ".
      rewrite /checked_client_body /cUp_of /makeCounter.
      wp_lam.
      wp_alloc l as "Hl".
      wp_pures.
      wp_bind (attacker _).
      rewrite /incr_cap.
      specialize (Hatt l 0%Z).
      wp_apply (Hatt with "Hl").
      iIntros (v m) "[%Hmono Hl]".
      wp_pures.
      wp_apply wp_assert.
      wp_load.
      wp_op.
      wp_store.
      wp_load.
      wp_op.
      iModIntro.
      iSplit.
      - iPureIntro.
        do 2 f_equal.
        apply bool_decide_eq_true_2.
        lia.
      - iNext. by iApply "HΦ".
    Qed.

    Lemma hole_attacker_mono_wp l n :
      {{{ l ↦ #n }}}
        hole_attacker (incr_cap l)
      {{{ RET #(); ⌜True⌝ ∗ l ↦ #n }}}.
    Proof.
      iIntros (Φ) "Hl HΦ".
      rewrite /hole_attacker /incr_cap.
      wp_lam.
      iApply "HΦ".
      iFrame.
      done.
    Qed.

    Lemma single_incr_attacker_mono_wp (l : loc) (n : Z) :
      {{{ l ↦ #n }}}
        single_incr_attacker (incr_cap l)
      {{{ (v : val), RET v; ∃ m : Z, ⌜v = #m⌝ ∗ ⌜(n <= m)%Z⌝ ∗ l ↦ #m }}}.
    Proof.
      iIntros (Φ) "Hl HΦ".
      rewrite /single_incr_attacker /incr_cap.
      wp_lam.
      wp_pures.
      wp_load.
      wp_op.
      wp_store.
      wp_load.
      iApply ("HΦ" $! #(n + 1)).
      iExists (n + 1)%Z.
      iFrame.
      iPureIntro.
      split; first reflexivity.
      lia.
    Qed.

    Lemma checked_client_hole_wp :
      {{{ True }}} checked_client_body hole_attacker {{{ RET #(); True }}}.
    Proof.
      iIntros (Φ) "_ HΦ".
      iApply (checked_client_from_mono_attacker_wp hole_attacker).
      - iIntros (l n Φ') "Hl HΦ'".
        iApply (hole_attacker_mono_wp with "Hl").
        iNext.
        iIntros "[_ Hl]".
        iApply ("HΦ'" $! #() n).
        iSplit.
        + iPureIntro. lia.
        + iFrame.
      - done.
      - iExact "HΦ".
    Qed.

    Lemma checked_client_single_incr_wp :
      {{{ True }}} checked_client_body single_incr_attacker {{{ RET #(); True }}}.
    Proof.
      iIntros (Φ) "_ HΦ".
      iApply (checked_client_from_mono_attacker_wp single_incr_attacker).
      - iIntros (l n Φ') "Hl HΦ'".
        iApply (single_incr_attacker_mono_wp with "Hl").
        iNext.
        iIntros (v) "(%m & -> & %Hmono & Hl)".
        iApply ("HΦ'" $! #m m).
        iSplit.
        + iPureIntro. done.
        + iFrame.
      - done.
      - iExact "HΦ".
    Qed.
  End proof.

  Theorem checked_client_hole_adequate :
    adequate NotStuck (checked_client_body hole_attacker)
      {| heap := ∅; used_proph_id := ∅ |}
      (λ v _, @eq val v (LitV LitUnit)).
  Proof.
    eapply (heap_adequacy heapΣ).
    iIntros (?) "_".
    by wp_apply checked_client_hole_wp.
  Qed.

  Theorem checked_client_single_incr_adequate :
    adequate NotStuck (checked_client_body single_incr_attacker)
      {| heap := ∅; used_proph_id := ∅ |}
      (λ v _, @eq val v (LitV LitUnit)).
  Proof.
    eapply (heap_adequacy heapΣ).
    iIntros (?) "_".
    by wp_apply checked_client_single_incr_wp.
  Qed.
End JessieCounterHeapLang.
