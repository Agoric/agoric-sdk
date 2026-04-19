(* Atomic Iris-facing step facts for split counter capabilities. *)
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

  Example entry_cap_get_incr_atomic :
    match entry_cap_after_makeCounter with
    | Some (cap, σ) =>
        base_step (CoreGet (CoreVal cap) "incr") σ []
          (CoreVal (VPrim (PrimDyn 0%nat))) σ []
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
        base_step (CoreGet (CoreVal cap) "decr") σ []
          (CoreVal (VLit LUndefined)) σ []
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
        base_step (CoreApp (CoreVal (VPrim (PrimDyn 0%nat))) []) σ []
          (CoreVal (VLit (LJson (JNum 1)))) (store_cell σ 0%nat 1) []
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
        base_step (CoreGet (CoreVal cap) "incr") σ []
          (CoreVal (VLit LUndefined)) σ []
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
        base_step (CoreApp (CoreVal (VPrim (PrimDyn 1%nat))) []) σ []
          (CoreVal (VLit (LJson (JNum (-1))))) (store_cell σ 0%nat (-1)) []
    | None => False
    end.
  Proof.
    vm_compute.
    econstructor.
    - reflexivity.
    - reflexivity.
  Qed.
End JessieCounterIris.
