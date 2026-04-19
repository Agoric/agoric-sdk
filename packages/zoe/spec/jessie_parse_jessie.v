(* Parser for the Jessie surface layer centered on [parse_program] as a target for Jessica's Jessie grammar: <https://github.com/agoric-labs/jessica/blob/master/lib/quasi-jessie.js.ts>. *)
From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang jessie_json jessie_parse jessie_justin_parse.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieParseJessie.
  Import Justin.
  Import jessie_lang.JessieSurface.

  Definition ws := skip_ws_chars.

  Definition kw (s : string) : parser unit :=
    fun cs => literal s (ws cs).

  Definition parse_field_name : parser string :=
    fun cs =>
      match parse_ident cs with
      | Some out => Some out
      | None => parse_string (ws cs)
      end.

  Definition parse_base_expr (fuel : nat) : parser expr :=
    fun cs =>
      match parse_cond fuel cs with
      | Some (e, rest) => Some (Base e, rest)
      | None => None
      end.

  Fixpoint parse_expr (fuel : nat) : parser expr
  with parse_stmt (fuel : nat) : parser stmt
  with parse_stmt_list (fuel : nat) : parser (list stmt)
  with parse_args (fuel : nat) : parser (list expr)
  with parse_obj_fields (fuel : nat) : parser (list (string * expr)).
  Proof.
    - destruct fuel as [|fuel']; [exact parse_error|].
      refine (fun cs =>
        let cs := ws cs in
        match parse_ident cs with
        | Some (x, rest1) =>
            let rest1 := ws rest1 in
            match rest1 with
            | "+"%char :: "="%char :: rest2 =>
                match parse_int rest2 with
                | Some (n, rest3) => Some (AssignAdd x n, rest3)
                | None => None
                end
            | "-"%char :: "="%char :: rest2 =>
                match parse_int rest2 with
                | Some (n, rest3) => Some (AssignAdd x (- n), rest3)
                | None => None
                end
            | "("%char :: resta =>
                match parse_args fuel' resta with
                | Some (args, resta') => Some (Call (Base (Var x)) args, resta')
                | None => None
                end
            | _ =>
                match parse_base_expr fuel' cs with
                | Some (e, rest) => Some (e, rest)
                | None => None
                end
            end
        | None =>
            match cs with
            | "("%char :: ")"%char :: rest_after_parens =>
                match ws rest_after_parens with
                | "="%char :: ">"%char :: resta =>
                    match parse_expr fuel' resta with
                    | Some (e, restb) => Some (Arrow0 (SReturn e), restb)
                    | None =>
                        match parse_stmt fuel' resta with
                        | Some (s, restb) => Some (Arrow0 s, restb)
                        | None => None
                        end
                    end
                | _ => None
                end
            | "{"%char :: resto =>
                match parse_obj_fields fuel' resto with
                | Some (flds, rest1) => Some (Obj flds, rest1)
                | None => None
                end
            | "("%char :: restp =>
                match parse_expr fuel' restp with
                | Some (e, rest1) =>
                    match ws rest1 with
                    | ")"%char :: rest2 => Some (e, rest2)
                    | _ => None
                    end
                | None => None
                end
            | _ =>
                match parse_base_expr fuel' cs with
                | Some (e, rest) => Some (e, rest)
                | None => None
                end
            end
        end).
    - destruct fuel as [|fuel']; [exact parse_error|].
      refine (fun cs =>
        let cs := ws cs in
        match cs with
        | "{"%char :: rest =>
            match parse_stmt_list fuel' rest with
            | Some (ss, rest') => Some (SBlock ss, rest')
            | None => None
            end
        | _ =>
            match kw "const" cs with
            | Some (_, rest1) =>
                match parse_ident rest1 with
                | Some (x, rest2) =>
                    match ws rest2 with
                    | "="%char :: rest3 =>
                        match parse_expr fuel' rest3 with
                        | Some (e, rest4) =>
                            match ws rest4 with
                            | ";"%char :: rest5 => Some (SConst x e, rest5)
                            | _ => None
                            end
                        | None => None
                        end
                    | _ => None
                    end
                | None => None
                end
            | None =>
                match kw "let" cs with
                | Some (_, rest1) =>
                    match parse_ident rest1 with
                    | Some (x, rest2) =>
                        match ws rest2 with
                        | "="%char :: rest3 =>
                            match parse_expr fuel' rest3 with
                            | Some (e, rest4) =>
                                match ws rest4 with
                                | ";"%char :: rest5 => Some (SLet x e, rest5)
                                | _ => None
                                end
                            | None => None
                            end
                        | _ => None
                        end
                    | None => None
                    end
                | None =>
                    match kw "return" cs with
                    | Some (_, rest1) =>
                        match parse_expr fuel' rest1 with
                        | Some (e, rest2) =>
                            match ws rest2 with
                            | ";"%char :: rest3 => Some (SReturn e, rest3)
                            | _ => None
                            end
                        | None => None
                        end
                    | None =>
                        match parse_expr fuel' cs with
                        | Some (e, rest1) =>
                            match ws rest1 with
                            | ";"%char :: rest2 => Some (SExpr e, rest2)
                            | _ => None
                            end
                        | None => None
                        end
                    end
                end
            end
        end).
    - destruct fuel as [|fuel']; [exact parse_error|].
      refine (fun cs =>
        let cs := ws cs in
        match cs with
        | [] => Some ([], [])
        | "}"%char :: rest => Some ([], rest)
        | _ =>
            match parse_stmt fuel' cs with
            | Some (s, rest1) =>
                match parse_stmt_list fuel' rest1 with
                | Some (ss, rest2) => Some (s :: ss, rest2)
                | None => None
                end
            | None => None
            end
        end).
    - destruct fuel as [|fuel']; [exact parse_error|].
      refine (fun cs =>
        let cs := ws cs in
        match cs with
        | ")"%char :: rest => Some ([], rest)
        | _ =>
            match parse_expr fuel' cs with
            | Some (e, rest1) =>
                let rest1 := ws rest1 in
                match rest1 with
                | ","%char :: rest2 =>
                    match parse_args fuel' rest2 with
                    | Some (es, rest3) => Some (e :: es, rest3)
                    | None => None
                    end
                | ")"%char :: rest2 => Some ([e], rest2)
                | _ => None
                end
            | None => None
            end
        end).
    - destruct fuel as [|fuel']; [exact parse_error|].
      refine (fun cs =>
        let cs := ws cs in
        match cs with
        | "}"%char :: rest => Some ([], rest)
        | _ =>
            match parse_field_name cs with
            | Some (k, rest1) =>
                match ws rest1 with
                | ":"%char :: rest2 =>
                    match parse_expr fuel' rest2 with
                    | Some (e, rest3) =>
                        let rest3 := ws rest3 in
                        match rest3 with
                        | ","%char :: rest4 =>
                            match ws rest4 with
                            | "}"%char :: rest5 => Some ([(k, e)], rest5)
                            | _ =>
                                match parse_obj_fields fuel' rest4 with
                                | Some (fs, rest5) => Some ((k, e) :: fs, rest5)
                                | None => None
                                end
                            end
                        | "}"%char :: rest4 => Some ([(k, e)], rest4)
                        | _ => None
                        end
                    | None => None
                    end
                | _ => None
                end
            | None => None
            end
        end).
  Defined.

  (* [parse_program] aims at Jessica's Jessie grammar (<https://github.com/agoric-labs/jessica/blob/master/lib/quasi-jessie.js.ts>), as an executable parser target rather than a normative specification. *)
  Definition parse_program (s : string) : option program :=
    match parse_stmt_list (String.length s + 40)%nat (explode s) with
    | Some (p, rest) =>
        match ws rest with
        | [] => Some p
        | _ => None
        end
    | None => None
    end.

  Definition parse_expr_only (s : string) : option expr :=
    match parse_expr (String.length s + 20)%nat (explode s) with
    | Some (e, rest) =>
        match ws rest with
        | [] => Some e
        | _ => None
        end
    | None => None
    end.

  Definition parse_stmt_only (s : string) : option stmt :=
    match parse_stmt (String.length s + 20)%nat (explode s) with
    | Some (stmt, rest) =>
        match ws rest with
        | [] => Some stmt
        | _ => None
        end
    | None => None
    end.

  Example parse_obj_expr :
    parse_expr_only "{ x: 1 }" =
      Some (Obj [("x", Base (Lit (LJson (JNum 1))))]).
  Proof. reflexivity. Qed.

  Example parse_arrow_expr :
    parse_expr_only "() => 1" =
      Some (Arrow0 (SReturn (Base (Lit (LJson (JNum 1)))))).
  Proof. reflexivity. Qed.

  Example parse_assign_add_expr :
    parse_expr_only "count += 1" =
      Some (AssignAdd "count" 1).
  Proof. reflexivity. Qed.

  Example parse_eqstrict_expr :
    parse_expr_only "counter.incr === 1" =
      Some (Base (Justin.EqStrict (Justin.Get (Var "counter") "incr")
        (Lit (LJson (JNum 1))))).
  Proof. reflexivity. Qed.

  Example parse_harden_as_call :
    parse_expr_only "harden({})" =
      Some (Call (Base (Var "harden")) [Obj []]).
  Proof. reflexivity. Qed.

  Example parse_const_stmt :
    parse_stmt_only "const x = 1;" =
      Some (SConst "x" (Base (Lit (LJson (JNum 1))))).
  Proof. reflexivity. Qed.

  Example parse_let_stmt :
    parse_stmt_only "let x = 1;" =
      Some (SLet "x" (Base (Lit (LJson (JNum 1))))).
  Proof. reflexivity. Qed.

  Example parse_return_stmt :
    parse_stmt_only "return 1;" =
      Some (SReturn (Base (Lit (LJson (JNum 1))))).
  Proof. reflexivity. Qed.

  Example parse_expr_stmt :
    parse_stmt_only "counter.incr();" =
      Some (SExpr (Base (Justin.App (Justin.Get (Var "counter") "incr") []))).
  Proof. reflexivity. Qed.

  Example parse_block_stmt :
    parse_stmt_only "{ const x = 1; return x; }" =
      Some (SBlock
        [SConst "x" (Base (Lit (LJson (JNum 1))));
         SReturn (Base (Var "x"))]).
  Proof. reflexivity. Qed.
End JessieParseJessie.
