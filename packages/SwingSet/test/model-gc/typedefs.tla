------------------------------ MODULE typedefs --------------------------------
(*
  For the main model file please see userspace.tla.
  This file defines types and auxiliary operators.
*)

(* Swingset Userspace Typedefs
   ========================

    @typeAlias: VAT = Str;

    NOTE: promiseId is only relevant for "promise" and "resolver" types.
    @typeAlias: SLIT = [ type: Str, promiseId: Int, watchers: Set(VAT), creator: VAT ];

    @typeAlias: BANK = Int -> SLIT;

    @typeAlias: STATE = [ bank: BANK, curr: VAT, cnt_promise: Int, step: Str, resolve_target: Int, step_cnt: Int ];

*)

SANY_DONT_FORGET_ME == FALSE

===============================================================================
