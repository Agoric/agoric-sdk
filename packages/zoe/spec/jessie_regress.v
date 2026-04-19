(* Cross-layer regression examples spanning parsing, execution, and Iris facts. *)
From Coq Require Import List String ZArith.
Require Import jessie_lang jessie_parse jessie_justin_parse jessie_justin jessie_counter
  jessie_counter_spec jessie_counter_reach jessie_connectivity jessie_step_connectivity
  jessie_module jessie_iris_lang jessie_counter_iris jessie_surface_exec
  jessie_counter_parse.

Import ListNotations.
Import Justin.
Import JustinExec.
Import JessieCounterCase.
Import JessieCounterSpec.
Import JessieCounterReach.
Import JessieConnectivity.
Import JessieStepConnectivity.
Import JessieModule.
Import JustinIris.
Import JessieCounterIris.
Import JessieCounterSurface.
Open Scope string_scope.
Open Scope Z_scope.

Example json_surface_smoke :
  parse_json "{""abc"":123}" = Some (JObj [("abc", JNum 123)]).
Proof. reflexivity. Qed.

Example justin_surface_smoke :
  parse_justin "typeof x === ""string"" ? x : undefined" =
    Some (Cond
      (EqStrict (TypeOf (Var "x")) (Lit (LJson (JStr "string"))))
      (Var "x")
      (Lit LUndefined)).
Proof. reflexivity. Qed.

Example bigint_surface_smoke :
  parse_justin "9898n" = Some (Lit (LBigInt 9898)).
Proof. reflexivity. Qed.

Example elaboration_refines_add :
  elaborates [("x", TyString)]
    (Add (Var "x") (Lit (LJson (JStr "abc"))))
    (CoreBinop ConcatStr (CoreVar "x") (CoreVal (VLit (LJson (JStr "abc"))))).
Proof.
  econstructor.
  - reflexivity.
  - constructor.
Qed.

Example exec_hardened_id :
  let σ1 := State 1%nat 0%nat [(0%nat, HeapObj [])] [0%nat] (st_env empty_state) [] [] in
  apply_prim σ1 (PrimBuiltin PrimId) [VLoc 0%nat] = (CoreVal (VLoc 0%nat), σ1).
Proof. reflexivity. Qed.

Example shallow_freeze_vs_harden_regression :
  let σ0 := State 2%nat 0%nat
    [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
    [] (st_env empty_state) [] [] in
  apply_prim σ0 (PrimBuiltin PrimFreeze) [VLoc 0%nat] <>
  apply_prim σ0 (PrimBuiltin PrimHarden) [VLoc 0%nat].
Proof. discriminate. Qed.

Example typeof_null_regression :
  run1 (CoreTypeOf (CoreVal (VLit (LJson JNull)))) =
    Some (CoreVal (VLit (LJson (JStr "object"))), empty_state).
Proof. reflexivity. Qed.

Example makeCounter_assert_works :
  fst (counter_normalize 20 counter_empty_state makeCounter_assert_prog) = CoreVal (VLit LUndefined).
Proof. reflexivity. Qed.

Example makeCounter_final_cell_is_two :
  snd (counter_normalize 20 counter_empty_state makeCounter_assert_prog) =
    State 2%nat 2%nat
      [(1%nat, HeapObj [("incr", VPrim (PrimDyn 0%nat));
                        ("decr", VPrim (PrimDyn 1%nat))])]
      [1%nat]
      (st_env counter_empty_state)
      [(0%nat, 2)]
      [(0%nat, DynCellDelta 0%nat 1);
       (1%nat, DynCellDelta 0%nat (-1))].
Proof. reflexivity. Qed.

Example makeCounter_surface_parse_works :
  parse_makeCounter_program <> None.
Proof. vm_compute. discriminate. Qed.

Example makeCounter_surface_compile_matches_core :
  compile_makeCounter_fixture
    (match parse_makeCounter_program with Some p => p | None => [] end) =
  Some makeCounter_surface_prog.
Proof. vm_compute. reflexivity. Qed.

Example makeCounter_surface_compile_matches_regression :
  compile_makeCounter_fixture
    (match parse_makeCounter_program with Some p => p | None => [] end) =
  Some makeCounter_surface_prog.
Proof. vm_compute. reflexivity. Qed.

Example makeCounter_surface_exec_works :
  fst (match run_surface_program 40
    (match parse_makeCounter_program with Some p => p | None => [] end) with
  | Some res => res
  | None => (JessieSurfaceExec.VLit LUndefined, JessieSurfaceExec.empty_state)
  end) = JessieSurfaceExec.VLit LUndefined.
Proof. vm_compute. reflexivity. Qed.

Example entry_cap_split_works :
  entry_cap_after_makeCounter <> None.
Proof. vm_compute. discriminate. Qed.

Example exit_cap_split_works :
  exit_cap_after_makeCounter <> None.
Proof. vm_compute. discriminate. Qed.

Example entry_cap_hides_decr :
  match entry_cap_after_makeCounter with
  | Some (cap, σ) => invoke_cap_method σ cap "decr"
  | None => None
  end = None.
Proof. vm_compute. reflexivity. Qed.

Example exit_cap_hides_incr :
  match exit_cap_after_makeCounter with
  | Some (cap, σ) => invoke_cap_method σ cap "incr"
  | None => None
  end = None.
Proof. vm_compute. reflexivity. Qed.

Example entry_cap_two_calls_reach_two :
  match entry_cap_after_makeCounter with
  | Some (cap, σ) =>
      match invoke_cap_trace σ cap ["incr"; "incr"] with
      | Some σ' => lookup_cell σ' 0%nat
      | None => None
      end
  | None => None
  end = Some 2.
Proof. vm_compute. reflexivity. Qed.

Example exit_cap_two_calls_reach_minus_two :
  match exit_cap_after_makeCounter with
  | Some (cap, σ) =>
      match invoke_cap_trace σ cap ["decr"; "decr"] with
      | Some σ' => lookup_cell σ' 0%nat
      | None => None
      end
  | None => None
  end = Some (-2).
Proof. vm_compute. reflexivity. Qed.

Example entry_cap_three_calls_stay_nonnegative :
  match entry_cap_after_makeCounter with
  | Some (cap, σ) =>
      match invoke_cap_trace σ cap ["incr"; "incr"; "incr"] with
      | Some σ' => exists n, lookup_cell σ' 0%nat = Some n /\ 0 <= n
      | None => False
      end
  | None => False
  end.
Proof.
  exact (entry_cap_trace_nonnegative ["incr"; "incr"; "incr"] _ eq_refl).
Qed.

Example exit_cap_three_calls_stay_nonpositive :
  match exit_cap_after_makeCounter with
  | Some (cap, σ) =>
      match invoke_cap_trace σ cap ["decr"; "decr"; "decr"] with
      | Some σ' => exists n, lookup_cell σ' 0%nat = Some n /\ n <= 0
      | None => False
      end
  | None => False
  end.
Proof.
  exact (exit_cap_trace_nonpositive ["decr"; "decr"; "decr"] _ eq_refl).
Qed.

Example entry_cap_root_reaches_only_incr_regression :
  match entry_cap_after_makeCounter with
  | Some (cap, σ) => reaches_dyn σ cap 0%nat /\ ~ reaches_dyn σ cap 1%nat
  | None => False
  end.
Proof. exact entry_cap_root_reaches_only_incr. Qed.

Example exit_cap_root_reaches_only_decr_regression :
  match exit_cap_after_makeCounter with
  | Some (cap, σ) => reaches_dyn σ cap 1%nat /\ ~ reaches_dyn σ cap 0%nat
  | None => False
  end.
Proof. exact exit_cap_root_reaches_only_decr. Qed.

Example makeCounter_connectivity_smoke_object :
  val_reaches state_after_makeCounter counter_after_makeCounter (CObj 1%nat).
Proof. exact makeCounter_result_reaches_fresh_object. Qed.

Example makeCounter_connectivity_smoke_cell :
  val_reaches state_after_makeCounter counter_after_makeCounter (CCell 0%nat).
Proof. exact makeCounter_result_reaches_fresh_cell. Qed.

Example module_end_to_end :
  eval_module 6
    (Module [("y", VLit (LJson (JNum 2)))]
      [ExportDecl "x" (CoreVal (VLit (LJson (JNum 1))));
       ExportDecl "default" (CoreBinop AddNum (CoreVar "y") (CoreVar "x"))]) =
    Some [("x", VLit (LJson (JNum 1))); ("default", VLit (LJson (JNum 3)))].
Proof. reflexivity. Qed.

Example iris_to_of_val_smoke :
  to_val (of_val (VLit (LJson (JNum 9)))) = Some (VLit (LJson (JNum 9))).
Proof. reflexivity. Qed.

Example iris_ctx_fill_smoke :
  fill_item (BinOpLCtx EqStrictOp (CoreAllocObj [])) (CoreAllocObj []) =
    CoreBinop EqStrictOp (CoreAllocObj []) (CoreAllocObj []).
Proof. reflexivity. Qed.
