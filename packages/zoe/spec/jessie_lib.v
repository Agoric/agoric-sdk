(* Builtin primitive names. *)
From Coq Require Import List String.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.

Module JessieLib.
  Import Justin.

  Definition builtin_prim_names : list (string * prim_name) :=
    [ ("freeze", PrimFreeze);
      ("harden", PrimHarden);
      ("assert", PrimAssert);
      ("id", PrimId);
      ("fail", PrimFail) ].
End JessieLib.
