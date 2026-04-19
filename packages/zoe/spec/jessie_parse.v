From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang.

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
  end
.

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
            | Some (n, rest) => Some (JNum (Z.of_nat n), rest)
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

Definition explode (s : string) : list ascii := string_chars s.

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
