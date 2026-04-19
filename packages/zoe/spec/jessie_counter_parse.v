From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang jessie_parse jessie_parse_jessie jessie_counter.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterSurface.
  Import Justin.
  Import JessieCounterCase.
  Import JessieParseJessie.
  Import jessie_lang.JessieSurface.

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

  Definition compile_surface_program (p : program) : option core_expr :=
    match p with
    | [ SConst "makeCounter" (Arrow0 (SBlock [SLet "count" (Base (Lit (LJson (JNum 0))));
         SReturn (Harden (Obj [("incr", Arrow0 (SReturn (AssignAdd "count" 1)));
                               ("decr", Arrow0 (SReturn (AssignAdd "count" (-1))))]))]));
        SConst "counter" (Call (Base (Var "makeCounter")) []);
        SExpr (Call (Get (Base (Var "counter")) "incr") []);
        SConst "n" (Call (Get (Base (Var "counter")) "incr") []);
        SExpr (Call (Base (Var "assert")) [EqStrict (Base (Var "n")) (Base (Lit (LJson (JNum 2))))]) ] =>
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
