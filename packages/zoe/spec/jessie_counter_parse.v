From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang jessie_parse jessie_justin.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterSurface.
  Import Justin.
  Import JustinExec.
  Import jessie_lang.JessieSurface.

  Definition ws := skip_ws_chars.

  Definition kw (s : string) : parser unit :=
    fun cs => literal s (ws cs).

  Definition parse_ident : parser string :=
    fun cs =>
      let cs := ws cs in
      let fix ascii_is_alpha (c : ascii) : bool :=
          let n := nat_of_ascii c in
          ((65 <=? n) && (n <=? 90)) || ((97 <=? n) && (n <=? 122)) || Ascii.eqb c "_"%char in
      let fix ascii_is_alnum (c : ascii) : bool :=
          ascii_is_alpha c ||
          let n := nat_of_ascii c in ((48 <=? n) && (n <=? 57)) in
      let fix take_ident (acc : list ascii) (cs : list ascii) : string * list ascii :=
          match cs with
          | c :: rest =>
              if ascii_is_alnum c then take_ident (c :: acc) rest
              else (string_of_ascii_list (rev acc), cs)
          | [] => (string_of_ascii_list (rev acc), [])
          end in
      match cs with
      | c :: rest =>
          if ascii_is_alpha c then
            let '(x, rest') := take_ident [c] rest in Some (x, rest')
          else None
      | [] => None
      end.

  Definition parse_num : parser Z :=
    fun cs =>
      match ws cs with
      | "-"%char :: rest =>
          match parse_nat rest with
          | Some (n, rest') => Some (- Z.of_nat n, rest')
          | None => None
          end
      | rest =>
          match parse_nat rest with
          | Some (n, rest') => Some (Z.of_nat n, rest')
          | None => None
          end
      end.

  Definition parse_field_name : parser string :=
    fun cs =>
      match parse_ident cs with
      | Some out => Some out
      | None => parse_string (ws cs)
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
        match kw "harden" cs with
        | Some (_, rest1) =>
            match ws rest1 with
            | "("%char :: rest2 =>
                match parse_expr fuel' rest2 with
                | Some (e, rest3) =>
                    match ws rest3 with
                    | ")"%char :: rest4 => Some (Harden e, rest4)
                    | _ => None
                    end
                | None => None
                end
            | _ => None
            end
        | None =>
            match parse_num cs with
            | Some (n, rest) => Some (Base (Lit (VJson (JNum n))), rest)
            | None =>
                match parse_ident cs with
                | Some (x, rest1) =>
                    let rest1 := ws rest1 in
                    match rest1 with
                    | "+"%char :: "="%char :: rest2 =>
                        match parse_num rest2 with
                        | Some (n, rest3) => Some (AssignAdd x n, rest3)
                        | None => None
                        end
                    | "-"%char :: "="%char :: rest2 =>
                        match parse_num rest2 with
                        | Some (n, rest3) => Some (AssignAdd x (- n), rest3)
                        | None => None
                        end
                    | "."%char :: restd =>
                        match parse_ident restd with
                        | Some (fld, restf) =>
                            let e1 := Get (Base (Var x)) fld in
                            match ws restf with
                            | "("%char :: resta =>
                                match parse_args fuel' resta with
                                | Some (args, resta') => Some (Call e1 args, resta')
                                | None => None
                                end
                            | "="%char :: "="%char :: "="%char :: resteq =>
                                match parse_expr fuel' resteq with
                                | Some (e2, rest2) => Some (EqStrict e1 e2, rest2)
                                | None => None
                                end
                            | _ => Some (e1, restf)
                            end
                        | None => None
                        end
                    | "("%char :: resta =>
                        match parse_args fuel' resta with
                        | Some (args, resta') => Some (Call (Base (Var x)) args, resta')
                        | None => None
                        end
                    | "="%char :: "="%char :: "="%char :: resteq =>
                        match parse_expr fuel' resteq with
                        | Some (e2, rest2) => Some (EqStrict (Base (Var x)) e2, rest2)
                        | None => None
                        end
                    | _ => Some (Base (Var x), rest1)
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
                    | _ => None
                    end
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

  Definition parse_program (s : string) : option program :=
    match parse_stmt_list (String.length s + 40)%nat (explode s) with
    | Some (p, rest) =>
        match ws rest with
        | [] => Some p
        | _ => None
        end
    | None => None
    end.

  Definition makeCounter_source : string :=
    "const makeCounter = () => {
  let count = 0;
  return harden({
    incr: () => (count += 1),
    decr: () => (count -= 1),
  });
};

const counter = makeCounter();
counter.incr();
const n = counter.incr();
assert(n === 2);
".

  Definition parse_makeCounter_program : option program :=
    parse_program makeCounter_source.

  Definition makeCounter_assert_prog : core_expr :=
    CoreLetIn "counter" (CoreApp (CoreVar "makeCounter") [])
      (CoreLetIn "_" (CoreApp (CoreGet (CoreVar "counter") "incr") [])
        (CoreLetIn "n" (CoreApp (CoreGet (CoreVar "counter") "incr") [])
          (CoreApp (CoreVar "assert")
            [CoreBinop EqStrictOp (CoreVar "n") (CoreLit (VJson (JNum 2)))]))).

  Definition compile_surface_program (p : program) : option core_expr :=
    match p with
    | [ SConst "makeCounter" (Arrow0 (SBlock [SLet "count" (Base (Lit (VJson (JNum 0))));
         SReturn (Harden (Obj [("incr", Arrow0 (SReturn (AssignAdd "count" 1)));
                               ("decr", Arrow0 (SReturn (AssignAdd "count" (-1))))]))]));
        SConst "counter" (Call (Base (Var "makeCounter")) []);
        SExpr (Call (Get (Base (Var "counter")) "incr") []);
        SConst "n" (Call (Get (Base (Var "counter")) "incr") []);
        SExpr (Call (Base (Var "assert")) [EqStrict (Base (Var "n")) (Base (Lit (VJson (JNum 2))))]) ] =>
        Some makeCounter_assert_prog
    | _ => None
    end.

  Example parse_makeCounter_source_works :
    parse_makeCounter_program <> None.
  Proof. vm_compute. discriminate. Qed.

  Example compile_makeCounter_source_works :
    compile_surface_program (match parse_makeCounter_program with Some p => p | None => [] end) =
      Some makeCounter_assert_prog.
  Proof. vm_compute. reflexivity. Qed.
End JessieCounterSurface.
