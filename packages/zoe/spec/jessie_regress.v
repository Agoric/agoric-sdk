From Coq Require Import List String ZArith.
Require Import jessie_lang jessie_parse jessie_justin_parse jessie_justin jessie_module jessie_iris_lang.

Import ListNotations.
Import Justin.
Import JustinExec.
Import JessieModule.
Import JustinIris.
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
  let σ1 := State 1%nat [(0%nat, HeapObj [])] [0%nat] (st_env empty_state) in
  apply_prim σ1 "id" [VLoc 0%nat] = (CoreLit (VLoc 0%nat), σ1).
Proof. reflexivity. Qed.

Example typeof_null_regression :
  run1 (CoreTypeOf (CoreLit (VJson JNull))) =
    Some (CoreLit (VJson (JStr "object")), empty_state).
Proof. reflexivity. Qed.

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
