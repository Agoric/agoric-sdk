From Coq Require Import List String ZArith.
Require Import jessie_lang jessie_justin jessie_counter jessie_iris_lang.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterIris.
  Import Justin.
  Import JustinExec.
  Import JessieCounterCase.
  Import JustinIris.

  Definition counter_after_makeCounter : val :=
    match fst (apply_prim empty_state "makeCounter" []) with
    | CoreLit v => v
    | _ => VUndefined
    end.

  Definition state_after_makeCounter : state :=
    snd (apply_prim empty_state "makeCounter" []).

  Definition entry_cap_after_makeCounter : option (val * state) :=
    alloc_entry_cap state_after_makeCounter counter_after_makeCounter.

  Definition exit_cap_after_makeCounter : option (val * state) :=
    alloc_exit_cap state_after_makeCounter counter_after_makeCounter.

  Example entry_cap_get_incr_atomic :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        base_step (CoreGet (CoreLit cap) "incr") σ []
          (CoreLit (VPrim (counter_incr_name 0%nat))) σ []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.

  Example entry_cap_get_decr_missing_atomic :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        base_step (CoreGet (CoreLit cap) "decr") σ []
          (CoreLit VUndefined) σ []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.

  Example entry_cap_call_incr_atomic :
    match entry_cap_after_makeCounter with
    | Some (_, σ) =>
        base_step (CoreApp (CoreLit (VPrim (counter_incr_name 0%nat))) []) σ []
          (CoreLit (VJson (JNum 1))) (store_cell σ 0%nat 1) []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.

  Example exit_cap_get_incr_missing_atomic :
    match exit_cap_after_makeCounter with
    | Some (cap, σ) =>
        base_step (CoreGet (CoreLit cap) "incr") σ []
          (CoreLit VUndefined) σ []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.

  Example exit_cap_call_decr_atomic :
    match exit_cap_after_makeCounter with
    | Some (_, σ) =>
        base_step (CoreApp (CoreLit (VPrim (counter_decr_name 0%nat))) []) σ []
          (CoreLit (VJson (JNum (-1)))) (store_cell σ 0%nat (-1)) []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.
End JessieCounterIris.
