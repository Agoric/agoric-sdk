From Coq Require Import List String.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope string_scope.

Module JessieModule.
  Import Justin.
  Import JustinExec.

  Inductive module_decl :=
  | ExportDecl (name : string) (body : core_expr).

  Record module := Module {
    module_imports : list (string * val);
    module_decls : list module_decl
  }.

  Definition exports := list (string * val).

  Fixpoint normalize (fuel : nat) (σ : state) (e : core_expr)
    : core_expr * state :=
    match fuel with
    | O => (CoreBzzt, σ)
    | S fuel' =>
        match step σ e with
        | Some (e', σ') =>
            match e' with
            | CoreLit _ => (e', σ')
            | CoreBzzt => (CoreBzzt, σ')
            | _ => normalize fuel' σ' e'
            end
        | None => (e, σ)
        end
    end.

  Definition init_state (imports : list (string * val)) : state :=
    State (st_next_loc empty_state) (st_store empty_state) (st_frozen empty_state)
      (imports ++ st_env empty_state).

  Fixpoint eval_decls (fuel : nat) (σ : state) (decls : list module_decl)
      : option (exports * state) :=
    match decls with
    | [] => Some ([], σ)
    | ExportDecl name body :: decls' =>
        let '(body', σ1) := normalize fuel σ body in
        match body' with
        | CoreLit v =>
            match eval_decls fuel
                (State (st_next_loc σ1) (st_store σ1) (st_frozen σ1)
                  ((name, v) :: st_env σ1))
                decls' with
            | Some (outs, σ2) => Some ((name, v) :: outs, σ2)
            | None => None
            end
        | _ => None
        end
    end.

  Definition eval_module (fuel : nat) (m : module) : option exports :=
    match eval_decls fuel (init_state (module_imports m)) (module_decls m) with
    | Some (outs, _) => Some outs
    | None => None
    end.

  Definition simple_module (body : core_expr) : module :=
    Module [] [ExportDecl "default" body].

  Example export_literal :
    eval_module 5 (simple_module (CoreLit (VJson (JNum 7)))) =
      Some [("default", VJson (JNum 7))].
  Proof. reflexivity. Qed.

  Example import_primitive_and_apply :
    eval_module 5
      (Module [("x", VJson (JNum 4))]
        [ExportDecl "default"
          (CoreApp (CoreVar "id") [CoreLit (VJson (JNum 4))])]) =
      Some [("default", VJson (JNum 4))].
  Proof. reflexivity. Qed.

  Example module_linking_exposes_prior_exports :
    eval_module 6
      (Module [("y", VJson (JNum 2))]
        [ ExportDecl "x" (CoreLit (VJson (JNum 1)));
          ExportDecl "default" (CoreBinop AddNum (CoreVar "y") (CoreVar "x")) ]) =
      Some [("x", VJson (JNum 1)); ("default", VJson (JNum 3))].
  Proof. reflexivity. Qed.
End JessieModule.
