(* Generic parser combinators and lexical helpers shared by JSON and Jessie parsing. *)
From Coq Require Import Ascii List String.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Definition parser (A : Type) := list ascii -> option (A * list ascii).

Definition parse_error {A : Type} : parser A := fun _ => None.

Definition ret {A : Type} (x : A) : parser A :=
  fun cs => Some (x, cs).

Definition bind {A B : Type} (p : parser A) (k : A -> parser B) : parser B :=
  fun cs =>
    match p cs with
    | Some (x, rest) => k x rest
    | None => None
    end.

Notation "x <- p ;; k" := (bind p (fun x => k))
  (at level 100, p at next level, right associativity).

Definition peek : parser ascii :=
  fun cs =>
    match cs with
    | [] => None
    | c :: rest => Some (c, c :: rest)
    end.

Definition any_char : parser ascii :=
  fun cs =>
    match cs with
    | [] => None
    | c :: rest => Some (c, rest)
    end.

Definition satisfy (f : ascii -> bool) : parser ascii :=
  c <- any_char ;;
  if f c then ret c else parse_error.

Definition char (a : ascii) : parser ascii :=
  satisfy (Ascii.eqb a).

Fixpoint string_chars (s : string) : list ascii :=
  match s with
  | EmptyString => []
  | String c s' => c :: string_chars s'
  end.

Fixpoint literal_chars (xs : list ascii) : parser unit :=
  match xs with
  | [] => ret tt
  | c :: xs' =>
      bind (char c) (fun _ => literal_chars xs')
  end.

Definition literal (s : string) : parser unit := literal_chars (string_chars s).

Definition is_space (c : ascii) : bool :=
  orb (Ascii.eqb c " ")
    (orb (Ascii.eqb c (Ascii.ascii_of_nat 9))
       (orb (Ascii.eqb c (Ascii.ascii_of_nat 10))
          (Ascii.eqb c (Ascii.ascii_of_nat 13)))).

Fixpoint skip_ws_chars (cs : list ascii) : list ascii :=
  match cs with
  | c :: rest => if is_space c then skip_ws_chars rest else cs
  | [] => []
  end.

Definition skip_ws : parser unit := fun cs => Some (tt, skip_ws_chars cs).

Definition digit_value (c : ascii) : option nat :=
  if Ascii.eqb c "0" then Some 0%nat else
  if Ascii.eqb c "1" then Some 1%nat else
  if Ascii.eqb c "2" then Some 2%nat else
  if Ascii.eqb c "3" then Some 3%nat else
  if Ascii.eqb c "4" then Some 4%nat else
  if Ascii.eqb c "5" then Some 5%nat else
  if Ascii.eqb c "6" then Some 6%nat else
  if Ascii.eqb c "7" then Some 7%nat else
  if Ascii.eqb c "8" then Some 8%nat else
  if Ascii.eqb c "9" then Some 9%nat else
  None.

Fixpoint digits_to_nat (acc : nat) (cs : list ascii) : nat * list ascii :=
  match cs with
  | c :: rest =>
      match digit_value c with
      | Some d => digits_to_nat (10 * acc + d)%nat rest
      | None => (acc, cs)
      end
  | [] => (acc, [])
  end.

Fixpoint string_of_ascii_list (xs : list ascii) : string :=
  match xs with
  | [] => EmptyString
  | c :: rest => String c (string_of_ascii_list rest)
  end.

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

Definition explode (s : string) : list ascii := string_chars s.
