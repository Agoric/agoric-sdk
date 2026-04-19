From Coq Require Import Ascii List String ZArith.
Require Import jessie_parse.

Import ListNotations.
Open Scope char_scope.
Open Scope nat_scope.
Open Scope string_scope.
Open Scope Z_scope.

Definition ascii_is_alpha (c : ascii) : bool :=
  let n := nat_of_ascii c in
  ((Nat.leb 65 n) && (Nat.leb n 90)) ||
  ((Nat.leb 97 n) && (Nat.leb n 122)) ||
  Ascii.eqb c "_"%char.

Definition ascii_is_alnum (c : ascii) : bool :=
  ascii_is_alpha c ||
  let n := nat_of_ascii c in
  ((Nat.leb 48 n) && (Nat.leb n 57)).

Fixpoint take_ident_chars (acc : list ascii) (cs : list ascii)
    : string * list ascii :=
  match cs with
  | c :: rest =>
      if ascii_is_alnum c then take_ident_chars (c :: acc) rest
      else (string_of_ascii_list (rev acc), cs)
  | [] => (string_of_ascii_list (rev acc), [])
  end.

Definition parse_ident : parser string :=
  fun cs =>
    let cs := skip_ws_chars cs in
    match cs with
    | c :: rest =>
        if ascii_is_alpha c then
          let '(name, rest') := take_ident_chars [c] rest in
          Some (name, rest')
        else None
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
