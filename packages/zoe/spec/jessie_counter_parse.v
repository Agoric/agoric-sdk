(* Parsed makeCounter fixture and compilation regression. *)
From Coq Require Import Ascii List String ZArith.
Require Import jessie_lang jessie_parse jessie_parse_jessie jessie_surface_exec.

Import ListNotations.
Open Scope char_scope.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieCounterSurface.
  Import Justin.
  Import JessieParseJessie.
  Import jessie_lang.JessieSurface.
  Import JessieSurfaceExec.

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

  Definition makeCounter_fixture_program : program :=
    [ SConst "makeCounter" (Arrow0 (SBlock [SLet "count" (Base (Lit (LJson (JNum 0))));
         SReturn (Harden (Obj [("incr", Arrow0 (SReturn (AssignAdd "count" 1)));
                               ("decr", Arrow0 (SReturn (AssignAdd "count" (-1))))]))]));
      SConst "counter" (Call (Base (Var "makeCounter")) []);
      SExpr (Call (Get (Base (Var "counter")) "incr") []);
      SConst "n" (Call (Get (Base (Var "counter")) "incr") []);
      SExpr (Call (Base (Var "assert")) [EqStrict (Base (Var "n")) (Base (Lit (LJson (JNum 2))))]) ].

  Definition makeCounter_surface_prog : program :=
    makeCounter_fixture_program.

  Definition compile_makeCounter_fixture (p : program) : option program :=
    match p with
    | makeCounter_fixture_program => Some makeCounter_surface_prog
    end.

  Definition run_surface_program (fuel : nat) (p : program) :=
    match compile_makeCounter_fixture p with
    | Some p' => run_with_builtins fuel p'
    | None => None
    end.

  Example parse_makeCounter_source_works :
    parse_makeCounter_program <> None.
  Proof. vm_compute. discriminate. Qed.

  Example compile_makeCounter_source_works :
    compile_makeCounter_fixture (match parse_makeCounter_program with Some p => p | None => [] end) =
      Some makeCounter_surface_prog.
  Proof. vm_compute. reflexivity. Qed.

  Example run_makeCounter_source_works :
    fst (match run_surface_program 40
      (match parse_makeCounter_program with Some p => p | None => [] end) with
    | Some res => res
    | None => (VLit LUndefined, empty_state)
    end) = VLit LUndefined.
  Proof. vm_compute. reflexivity. Qed.

  Example run_makeCounter_source_cell_two :
    snd (match run_surface_program 40
      (match parse_makeCounter_program with Some p => p | None => [] end) with
    | Some res => res
    | None => (VLit LUndefined, empty_state)
    end) =
      State 1%nat 1%nat
        [(0%nat, HeapObj [("incr", VClosure (("count", BCell 0%nat) :: builtin_env)
                                   (SReturn (AssignAdd "count" 1)));
                           ("decr", VClosure (("count", BCell 0%nat) :: builtin_env)
                                   (SReturn (AssignAdd "count" (-1))))])]
        [0%nat]
        [(0%nat, VLit (LJson (JNum 2)))].
  Proof. vm_compute. reflexivity. Qed.
End JessieCounterSurface.
