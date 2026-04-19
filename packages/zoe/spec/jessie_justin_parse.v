From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang jessie_parse.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Import Justin.

Definition parse_jstring_lit : parser expr :=
  fun cs =>
    match parse_string (skip_ws_chars cs) with
    | Some (s, rest) => Some (Lit (LJson (JStr s)), rest)
    | None => None
    end.

Definition parse_jnumber_lit : parser expr :=
  fun cs =>
    match parse_int cs with
    | Some (n, rest) => Some (Lit (LJson (JNum n)), rest)
    | None => None
    end.

Definition parse_jbigint_lit : parser expr :=
  fun cs =>
    match parse_nat (skip_ws_chars cs) with
    | Some (n, "n"%char :: rest) => Some (Lit (LBigInt (Z.of_nat n)), rest)
    | _ => None
    end.

Definition parse_undefined : parser expr :=
  fun cs =>
    match literal "undefined" (skip_ws_chars cs) with
    | Some (_, rest) => Some (Lit LUndefined, rest)
    | None => None
    end.

Definition parse_empty_obj : parser expr :=
  fun cs =>
    match literal "{}" (skip_ws_chars cs) with
    | Some (_, rest) => Some (Obj [], rest)
    | None => None
    end.

Definition parse_var : parser expr :=
  fun cs =>
    match parse_ident cs with
    | Some (x, rest) => Some (Var x, rest)
    | None => None
    end.

Definition parse_typeof_var : parser expr :=
  fun cs =>
    match literal "typeof" (skip_ws_chars cs) with
    | Some (_, rest) =>
        match parse_ident rest with
        | Some (x, rest') => Some (TypeOf (Var x), rest')
        | None => None
        end
    | None => None
    end.

Definition parse_atom : parser expr :=
  fun cs =>
    match parse_typeof_var cs with
    | Some out => Some out
    | None =>
        match parse_empty_obj cs with
        | Some out => Some out
        | None =>
            match parse_undefined cs with
            | Some out => Some out
            | None =>
                match parse_jstring_lit cs with
                | Some out => Some out
                | None =>
                    match parse_jbigint_lit cs with
                    | Some out => Some out
                    | None =>
                        match parse_jnumber_lit cs with
                        | Some out => Some out
                        | None => parse_var cs
                        end
                    end
                end
            end
        end
    end.

Definition parse_eq : parser expr :=
  fun cs =>
    match parse_atom cs with
    | Some (e1, rest1) =>
        let rest1 := skip_ws_chars rest1 in
        match literal "===" rest1 with
        | Some (_, rest2) =>
            match parse_atom rest2 with
            | Some (e2, rest3) => Some (EqStrict e1 e2, rest3)
            | None => None
            end
        | None => Some (e1, rest1)
        end
    | None => None
    end.

Definition parse_cond : parser expr :=
  fun cs =>
    match parse_eq cs with
    | Some (e0, rest1) =>
        let rest1 := skip_ws_chars rest1 in
        match rest1 with
        | "?"%char :: rest2 =>
            match parse_eq rest2 with
            | Some (e1, rest3) =>
                let rest3 := skip_ws_chars rest3 in
                match rest3 with
                | ":"%char :: rest4 =>
                    match parse_eq rest4 with
                    | Some (e2, rest5) => Some (Cond e0 e1 e2, rest5)
                    | None => None
                    end
                | _ => None
                end
            | None => None
            end
        | _ => Some (e0, rest1)
        end
    | None => None
    end.

Definition parse_justin (s : string) : option expr :=
  match parse_cond (explode s) with
  | Some (e, rest) =>
      match skip_ws_chars rest with
      | [] => Some e
      | _ => None
      end
  | None => None
  end.

Example parse_concrete_empty_obj :
  parse_justin "{}" = Some (Obj []).
Proof. reflexivity. Qed.

Example parse_concrete_eq :
  parse_justin "{} === {}" = Some (EqStrict (Obj []) (Obj [])).
Proof. reflexivity. Qed.

Example parse_concrete_typeof_cond :
  parse_justin "typeof x === ""string"" ? x : undefined" =
    Some (Cond
      (EqStrict (TypeOf (Var "x")) (Lit (LJson (JStr "string"))))
      (Var "x")
      (Lit LUndefined)).
Proof. reflexivity. Qed.

Example parse_concrete_bigint :
  parse_justin "9898n" = Some (Lit (LBigInt 9898)).
Proof. reflexivity. Qed.

Example parse_justin_rejects_arrow_literal :
  parse_justin "() => undefined" = None.
Proof. reflexivity. Qed.

Example parse_justin_rejects_assignment :
  parse_justin "count += 1" = None.
Proof. reflexivity. Qed.
