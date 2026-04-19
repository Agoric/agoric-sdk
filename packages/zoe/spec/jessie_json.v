(* JSON values and parsing definitions built on the generic parser helpers. *)
From Coq Require Import Ascii List String ZArith.
Require Import jessie_parse.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Inductive jval :=
| JNull
| JBool (b : bool)
| JNum (n : Z)
| JStr (s : string)
| JArr (xs : list jval)
| JObj (fields : list (string * jval)).

Definition parse_nat : parser nat :=
  fun cs =>
    match cs with
    | c :: rest =>
        match digit_value c with
        | Some d =>
            let '(n, rem) := digits_to_nat d rest in
            Some (n, rem)
        | None => None
        end
    | [] => None
    end.

Definition parse_int : parser Z :=
  fun cs =>
    match skip_ws_chars cs with
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

Fixpoint take_string_chars (acc : list ascii) (cs : list ascii)
    : option (string * list ascii) :=
  match cs with
  | [] => None
  | c :: rest =>
      if Ascii.eqb c """" then
        Some (string_of_ascii_list (rev acc), rest)
      else
        take_string_chars (c :: acc) rest
  end.

Definition parse_string : parser string :=
  bind (char """") (fun _ cs => take_string_chars [] cs).

Fixpoint parse_value (fuel : nat) : parser jval
with parse_members (fuel : nat) : parser (list (string * jval))
with parse_elements (fuel : nat) : parser (list jval).
Proof.
  - destruct fuel as [| fuel'].
    + exact parse_error.
    + refine (fun cs =>
        let cs := skip_ws_chars cs in
        match cs with
        | [] => None
        | c :: rest =>
            if Ascii.eqb c "n"%char then
              match literal "null" cs with
              | Some (_, rest') => Some (JNull, rest')
              | None => None
              end
            else if Ascii.eqb c "t"%char then
              match literal "true" cs with
              | Some (_, rest') => Some (JBool true, rest')
              | None => None
              end
            else if Ascii.eqb c "f"%char then
              match literal "false" cs with
              | Some (_, rest') => Some (JBool false, rest')
              | None => None
              end
            else if Ascii.eqb c """"%char then
              match parse_string cs with
              | Some (s, rest') => Some (JStr s, rest')
              | None => None
              end
            else if Ascii.eqb c "["%char then
              match parse_elements fuel' rest with
              | Some (xs, rest') => Some (JArr xs, rest')
              | None => None
              end
            else if Ascii.eqb c "{"%char then
              match parse_members fuel' rest with
              | Some (kvs, rest') => Some (JObj kvs, rest')
              | None => None
              end
            else
            match parse_nat cs with
            | Some (n, rest') => Some (JNum (Z.of_nat n), rest')
            | None => None
            end
        end).
  - destruct fuel as [| fuel'].
    + exact parse_error.
    + refine (fun cs =>
        let cs := skip_ws_chars cs in
        match cs with
        | [] => None
        | c :: rest =>
            if Ascii.eqb c "}"%char then Some ([], rest) else
            match parse_string cs with
            | Some (k, rest1) =>
                let rest1 := skip_ws_chars rest1 in
                match rest1 with
                | [] => None
                | c1 :: rest2 =>
                    if Ascii.eqb c1 ":"%char then
                    match parse_value fuel' rest2 with
                    | Some (v, rest3) =>
                        let rest3 := skip_ws_chars rest3 in
                        match rest3 with
                        | [] => None
                        | c2 :: rest4 =>
                            if Ascii.eqb c2 ","%char then
                            match parse_members fuel' rest4 with
                            | Some (kvs, rest5) => Some ((k, v) :: kvs, rest5)
                            | None => None
                            end
                            else if Ascii.eqb c2 "}"%char then Some ([(k, v)], rest4)
                            else None
                        end
                    | None => None
                    end
                    else None
                end
            | None => None
            end
        end).
  - destruct fuel as [| fuel'].
    + exact parse_error.
    + refine (fun cs =>
        let cs := skip_ws_chars cs in
        match cs with
        | [] => None
        | c :: rest =>
            if Ascii.eqb c "]"%char then Some ([], rest) else
            match parse_value fuel' cs with
            | Some (v, rest1) =>
                let rest1 := skip_ws_chars rest1 in
                match rest1 with
                | [] => None
                | c1 :: rest2 =>
                    if Ascii.eqb c1 ","%char then
                    match parse_elements fuel' rest2 with
                    | Some (vs, rest3) => Some (v :: vs, rest3)
                    | None => None
                    end
                    else if Ascii.eqb c1 "]"%char then Some ([v], rest2)
                    else None
                end
            | None => None
            end
        end).
Defined.

Definition parse_json (s : string) : option jval :=
  match parse_value (String.length s + 10)%nat (explode s) with
  | Some (v, rest) =>
      match skip_ws_chars rest with
      | [] => Some v
      | _ => None
      end
  | None => None
  end.

Example parse_empty_object :
  parse_json "{}" = Some (JObj []).
Proof. reflexivity. Qed.

Example parse_empty_array :
  parse_json "[]" = Some (JArr []).
Proof. reflexivity. Qed.

Example parse_object_number :
  parse_json "{""abc"":123}" = Some (JObj [("abc", JNum 123)]).
Proof. reflexivity. Qed.

Example parse_array_mixed :
  parse_json "[""abc"",123,false]" =
    Some (JArr [JStr "abc"; JNum 123; JBool false]).
Proof. reflexivity. Qed.
