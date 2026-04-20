(* Direct HeapLang encoding of makeCounter, for OCPL/Iris-style reuse. *)
From stdpp Require Import gmap.
From iris.proofmode Require Import proofmode.
From iris.base_logic.lib Require Export invariants.
From iris.program_logic Require Export weakestpre.
From iris.heap_lang Require Export lang adequacy.
From iris.heap_lang Require Import proofmode notation.
From iris.heap_lang.lib Require Import assert.

Module JessieCounterHeapLang.
  Open Scope expr_scope.

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

    Lemma checked_client_hole_wp :
      {{{ True }}} checked_client_body hole_attacker {{{ RET #(); True }}}.
    Proof.
      iIntros (Φ) "_ HΦ".
      rewrite /checked_client_body /hole_attacker /cUp_of /makeCounter.
      wp_lam.
      wp_alloc l as "Hl".
      wp_pures.
      wp_rec.
      wp_pures.
      wp_load.
      wp_op.
      wp_store.
      wp_load.
      wp_op.
      wp_if.
      by iApply "HΦ".
    Qed.

    Lemma checked_client_single_incr_wp :
      {{{ True }}} checked_client_body single_incr_attacker {{{ RET #(); True }}}.
    Proof.
      iIntros (Φ) "_ HΦ".
      rewrite /checked_client_body /single_incr_attacker /cUp_of /makeCounter.
      wp_lam.
      wp_alloc l as "Hl".
      wp_pures.
      wp_load.
      wp_op.
      wp_store.
      wp_load.
      wp_pures.
      wp_rec.
      wp_pures.
      wp_load.
      wp_op.
      wp_store.
      wp_load.
      wp_op.
      wp_if.
      by iApply "HΦ".
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
