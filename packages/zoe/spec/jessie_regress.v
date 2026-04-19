From Coq Require Import List String ZArith.
Require Import jessie_lang jessie_parse jessie_justin_parse jessie_justin jessie_counter jessie_module jessie_iris_lang jessie_counter_iris jessie_counter_parse.

Import ListNotations.
Import Justin.
Import JustinExec.
Import JessieCounterCase.
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
      (EqStrict (TypeOf (Var "x")) (Lit (VJson (JStr "string"))))
      (Var "x")
      (Lit VUndefined)).
Proof. reflexivity. Qed.

Example bigint_surface_smoke :
  parse_justin "9898n" = Some (Lit (VBigInt 9898)).
Proof. reflexivity. Qed.

Example elaboration_refines_add :
  elaborates [("x", TyString)]
    (Add (Var "x") (Lit (VJson (JStr "abc"))))
    (CoreBinop ConcatStr (CoreVar "x") (CoreLit (VJson (JStr "abc")))).
Proof.
  econstructor.
  - reflexivity.
  - constructor.
Qed.

Example exec_hardened_id :
  let σ1 := State 1%nat [(0%nat, HeapObj [])] [0%nat] (st_env empty_state) [] [] in
  apply_prim σ1 "id" [VLoc 0%nat] = (CoreLit (VLoc 0%nat), σ1).
Proof. reflexivity. Qed.

Example shallow_freeze_vs_harden_regression :
  let σ0 := State 2%nat
    [(1%nat, HeapObj []); (0%nat, HeapObj [("child", VLoc 1%nat)])]
    [] (st_env empty_state) [] [] in
  apply_prim σ0 "freeze" [VLoc 0%nat] <>
  apply_prim σ0 "harden" [VLoc 0%nat].
Proof. discriminate. Qed.

Example typeof_null_regression :
  run1 (CoreTypeOf (CoreLit (VJson JNull))) =
    Some (CoreLit (VJson (JStr "object")), empty_state).
Proof. reflexivity. Qed.

Example makeCounter_assert_works :
  fst (counter_normalize 20 counter_empty_state makeCounter_assert_prog) = CoreLit VUndefined.
Proof. reflexivity. Qed.

Example makeCounter_final_cell_is_two :
  snd (counter_normalize 20 counter_empty_state makeCounter_assert_prog) =
    State 2%nat
      [(1%nat, HeapObj [("incr", VPrim "counter.incr.z");
                        ("decr", VPrim "counter.decr.z")])]
      [1%nat]
      (st_env counter_empty_state)
      [(0%nat, 2)]
      [("counter.incr.z", CounterIncr 0%nat);
       ("counter.decr.z", CounterDecr 0%nat)].
Proof. reflexivity. Qed.

Example makeCounter_surface_parse_works :
  parse_makeCounter_program <> None.
Proof. vm_compute. discriminate. Qed.

Example makeCounter_surface_compile_matches_core :
  compile_surface_program
    (match parse_makeCounter_program with Some p => p | None => [] end) =
  Some makeCounter_assert_prog.
Proof. vm_compute. reflexivity. Qed.

Example makeCounter_surface_compile_matches_regression :
  compile_surface_program
    (match parse_makeCounter_program with Some p => p | None => [] end) =
  Some makeCounter_assert_prog.
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

Example module_end_to_end :
  eval_module 6
    (Module [("y", VJson (JNum 2))]
      [ExportDecl "x" (CoreLit (VJson (JNum 1)));
       ExportDecl "default" (CoreBinop AddNum (CoreVar "y") (CoreVar "x"))]) =
    Some [("x", VJson (JNum 1)); ("default", VJson (JNum 3))].
Proof. reflexivity. Qed.

Example iris_to_of_val_smoke :
  to_val (of_val (VJson (JNum 9))) = Some (VJson (JNum 9)).
Proof. reflexivity. Qed.

Example iris_ctx_fill_smoke :
  fill_item (BinOpLCtx EqStrictOp (CoreAllocObj [])) (CoreAllocObj []) =
    CoreBinop EqStrictOp (CoreAllocObj []) (CoreAllocObj []).
Proof. reflexivity. Qed.
