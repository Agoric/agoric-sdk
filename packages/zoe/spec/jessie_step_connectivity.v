(* Generic one-step proof infrastructure for authority connectivity. *)
From Coq Require Import Lia List String ZArith Program.Equality.
Require Import jessie_lang jessie_lib jessie_justin jessie_counter jessie_counter_reach jessie_public.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieStepConnectivity.
  Import JessieLib.
  Import Justin.
  Import JustinExec.
  Import JessieCounterCase.
  Import JessieCounterReach.
  Import JessiePublic.

  Definition env_reaches_dyn (σ : state) (x : string) (pid : nat) : Prop :=
    exists v, lookup_assoc x (st_env σ) = Some v /\ reaches_dyn σ v pid.

  Inductive expr_reaches_dyn (σ : state) : core_expr -> nat -> Prop :=
  | ExprReachesVal v pid :
      reaches_dyn σ v pid ->
      expr_reaches_dyn σ (CoreVal v) pid
  | ExprReachesVar x pid :
      env_reaches_dyn σ x pid ->
      expr_reaches_dyn σ (CoreVar x) pid
  | ExprReachesAlloc flds pid :
      fields_reach_dyn σ flds pid ->
      expr_reaches_dyn σ (CoreAllocObj flds) pid
  | ExprReachesGet e fld pid :
      expr_reaches_dyn σ e pid ->
      expr_reaches_dyn σ (CoreGet e fld) pid
  | ExprReachesAppFun f args pid :
      expr_reaches_dyn σ f pid ->
      expr_reaches_dyn σ (CoreApp f args) pid
  | ExprReachesAppArgs f args pid :
      exprs_reach_dyn σ args pid ->
      expr_reaches_dyn σ (CoreApp f args) pid
  | ExprReachesLetRhs x rhs body pid :
      expr_reaches_dyn σ rhs pid ->
      expr_reaches_dyn σ (CoreLetIn x rhs body) pid
  | ExprReachesLetBody x rhs body pid :
      expr_reaches_dyn σ body pid ->
      expr_reaches_dyn σ (CoreLetIn x rhs body) pid
  | ExprReachesTypeOf e pid :
      expr_reaches_dyn σ e pid ->
      expr_reaches_dyn σ (CoreTypeOf e) pid
  | ExprReachesCond0 e0 e1 e2 pid :
      expr_reaches_dyn σ e0 pid ->
      expr_reaches_dyn σ (CoreCond e0 e1 e2) pid
  | ExprReachesCond1 e0 e1 e2 pid :
      expr_reaches_dyn σ e1 pid ->
      expr_reaches_dyn σ (CoreCond e0 e1 e2) pid
  | ExprReachesCond2 e0 e1 e2 pid :
      expr_reaches_dyn σ e2 pid ->
      expr_reaches_dyn σ (CoreCond e0 e1 e2) pid
  | ExprReachesBinopL op e1 e2 pid :
      expr_reaches_dyn σ e1 pid ->
      expr_reaches_dyn σ (CoreBinop op e1 e2) pid
  | ExprReachesBinopR op e1 e2 pid :
      expr_reaches_dyn σ e2 pid ->
      expr_reaches_dyn σ (CoreBinop op e1 e2) pid
  with exprs_reach_dyn (σ : state) : list core_expr -> nat -> Prop :=
  | ExprsReachHere e es pid :
      expr_reaches_dyn σ e pid ->
      exprs_reach_dyn σ (e :: es) pid
  | ExprsReachThere e es pid :
      exprs_reach_dyn σ es pid ->
      exprs_reach_dyn σ (e :: es) pid
  with fields_reach_dyn (σ : state) : list (string * core_expr) -> nat -> Prop :=
  | FieldsReachHere k e flds pid :
      expr_reaches_dyn σ e pid ->
      fields_reach_dyn σ ((k, e) :: flds) pid
  | FieldsReachThere k e flds pid :
      fields_reach_dyn σ flds pid ->
      fields_reach_dyn σ ((k, e) :: flds) pid.

  Scheme expr_reaches_dyn_ind' := Induction for expr_reaches_dyn Sort Prop
  with exprs_reach_dyn_ind' := Induction for exprs_reach_dyn Sort Prop
  with fields_reach_dyn_ind' := Induction for fields_reach_dyn Sort Prop.
  Combined Scheme expr_reaches_dyn_mutind
    from expr_reaches_dyn_ind', exprs_reach_dyn_ind', fields_reach_dyn_ind'.

  Fixpoint closed_val (σ : state) (v : val) : Prop :=
    match v with
    | VLit _ => True
    | VLoc l => l < st_next_loc σ
    | VPrim (PrimBuiltin _) => True
    | VPrim (PrimExt _) => True
    | VPrim (PrimDyn pid) => pid < st_next_prim σ
    end.

  Inductive closed_expr (σ : state) : core_expr -> Prop :=
  | ClosedExprVal v :
      closed_val σ v ->
      closed_expr σ (CoreVal v)
  | ClosedExprVar x :
      closed_expr σ (CoreVar x)
  | ClosedExprAlloc flds :
      closed_fields σ flds ->
      closed_expr σ (CoreAllocObj flds)
  | ClosedExprGet e fld :
      closed_expr σ e ->
      closed_expr σ (CoreGet e fld)
  | ClosedExprApp f args :
      closed_expr σ f ->
      closed_exprs σ args ->
      closed_expr σ (CoreApp f args)
  | ClosedExprLetIn x rhs body :
      closed_expr σ rhs ->
      closed_expr σ body ->
      closed_expr σ (CoreLetIn x rhs body)
  | ClosedExprTypeOf e :
      closed_expr σ e ->
      closed_expr σ (CoreTypeOf e)
  | ClosedExprCond e0 e1 e2 :
      closed_expr σ e0 ->
      closed_expr σ e1 ->
      closed_expr σ e2 ->
      closed_expr σ (CoreCond e0 e1 e2)
  | ClosedExprBinop op e1 e2 :
      closed_expr σ e1 ->
      closed_expr σ e2 ->
      closed_expr σ (CoreBinop op e1 e2)
  | ClosedExprBzzt :
      closed_expr σ CoreBzzt
  with closed_exprs (σ : state) : list core_expr -> Prop :=
  | ClosedExprsNil :
      closed_exprs σ []
  | ClosedExprsCons e es :
      closed_expr σ e ->
      closed_exprs σ es ->
      closed_exprs σ (e :: es)
  with closed_fields (σ : state) : list (string * core_expr) -> Prop :=
  | ClosedFieldsNil :
      closed_fields σ []
  | ClosedFieldsCons k e flds :
      closed_expr σ e ->
      closed_fields σ flds ->
      closed_fields σ ((k, e) :: flds).

  Scheme closed_expr_ind' := Induction for closed_expr Sort Prop
  with closed_exprs_ind' := Induction for closed_exprs Sort Prop
  with closed_fields_ind' := Induction for closed_fields Sort Prop.
  Combined Scheme closed_expr_mutind
    from closed_expr_ind', closed_exprs_ind', closed_fields_ind'.

  Record closed_state (σ : state) : Prop := {
    closed_state_store_vals :
      forall l obj fld v,
        lookup_obj σ l = Some obj ->
        lookup_field (obj_fields obj) fld = Some v ->
        closed_val σ v;
    closed_state_env_vals :
      forall x v,
        lookup_assoc x (st_env σ) = Some v ->
        closed_val σ v;
    closed_state_cells :
      forall l n,
        lookup_cell σ l = Some n ->
        l < st_next_loc σ;
    closed_state_dyn_cells :
      forall pid dp,
        lookup_nat_assoc pid (st_dyn_prims σ) = Some dp ->
        match dp with
        | DynCellDelta cell _ => cell < st_next_loc σ
        end
  }.

  Fixpoint step_fields_with (do_prim : prim_handler) (σ : state)
      (flds : list (string * core_expr)) : option (core_expr * state) :=
    match flds with
    | [] => None
    | (k, e1) :: rest =>
        match step_with do_prim σ e1 with
        | Some (e1', σ') => Some (CoreAllocObj ((k, e1') :: rest), σ')
        | None =>
            match e1 with
            | CoreVal _ =>
                match step_fields_with do_prim σ rest with
                | Some (CoreAllocObj rest', σ') =>
                    Some (CoreAllocObj ((k, e1) :: rest'), σ')
                | other => other
                end
            | _ => None
            end
        end
    end.

  Fixpoint step_args_with (do_prim : prim_handler) (σ : state) (f : core_expr)
      (args : list core_expr) : option (core_expr * state) :=
    match args with
    | [] => None
    | e1 :: rest =>
        match step_with do_prim σ e1 with
        | Some (e1', σ') => Some (CoreApp f (e1' :: rest), σ')
        | None =>
            match e1 with
            | CoreVal _ =>
                match step_args_with do_prim σ f rest with
                | Some (CoreApp _ rest', σ') =>
                    Some (CoreApp f (e1 :: rest'), σ')
                | other => other
                end
            | _ => None
            end
        end
    end.

  Lemma step_fields_with_apply_prim_eq σ flds :
    step_fields_with apply_prim σ flds =
    (fix step_fields (flds : list (string * core_expr)) :
         option (core_expr * state) :=
       match flds with
       | [] => None
       | (k, e1) :: rest =>
           match step_with apply_prim σ e1 with
           | Some (e1', σ') => Some (CoreAllocObj ((k, e1') :: rest), σ')
           | None =>
               match e1 with
               | CoreVal _ =>
                   match step_fields rest with
                   | Some (CoreVal v0, σ') => Some (CoreVal v0, σ')
                   | Some (CoreVar x, σ') => Some (CoreVar x, σ')
                   | Some (CoreAllocObj rest', σ') =>
                       Some (CoreAllocObj ((k, e1) :: rest'), σ')
                   | Some (CoreGet e0 field, σ') => Some (CoreGet e0 field, σ')
                   | Some (CoreApp f args, σ') => Some (CoreApp f args, σ')
                   | Some (CoreLetIn x rhs body, σ') =>
                       Some (CoreLetIn x rhs body, σ')
                   | Some (CoreTypeOf e0, σ') => Some (CoreTypeOf e0, σ')
                   | Some (CoreCond e0 e2 e3, σ') =>
                       Some (CoreCond e0 e2 e3, σ')
                   | Some (CoreBinop op e0 e2, σ') =>
                       Some (CoreBinop op e0 e2, σ')
                   | Some (CoreBzzt, σ') => Some (CoreBzzt, σ')
                   | None => None
                   end
               | _ => None
               end
           end
       end) flds.
  Proof.
    induction flds as [|[k e1] rest IH]; simpl; [reflexivity|].
    destruct (step_with apply_prim σ e1) as [[e1' σ']|] eqn:?; [reflexivity|].
    destruct e1; try reflexivity.
    rewrite IH. reflexivity.
  Qed.

  Lemma step_args_with_apply_prim_eq σ f args :
    step_args_with apply_prim σ f args =
    (fix step_args (args : list core_expr) : option (core_expr * state) :=
       match args with
       | [] => None
       | e1 :: rest =>
           match step_with apply_prim σ e1 with
           | Some (e1', σ') => Some (CoreApp f (e1' :: rest), σ')
           | None =>
               match e1 with
               | CoreVal _ =>
                   match step_args rest with
                   | Some (CoreVal v0, σ') => Some (CoreVal v0, σ')
                   | Some (CoreVar x, σ') => Some (CoreVar x, σ')
                   | Some (CoreAllocObj rest', σ') => Some (CoreAllocObj rest', σ')
                   | Some (CoreGet e0 field, σ') => Some (CoreGet e0 field, σ')
                   | Some (CoreApp _ rest', σ') => Some (CoreApp f (e1 :: rest'), σ')
                   | Some (CoreLetIn x rhs body, σ') =>
                       Some (CoreLetIn x rhs body, σ')
                   | Some (CoreTypeOf e0, σ') => Some (CoreTypeOf e0, σ')
                   | Some (CoreCond e0 e2 e3, σ') =>
                       Some (CoreCond e0 e2 e3, σ')
                   | Some (CoreBinop op e0 e2, σ') =>
                       Some (CoreBinop op e0 e2, σ')
                   | Some (CoreBzzt, σ') => Some (CoreBzzt, σ')
                   | None => None
                   end
               | _ => None
               end
           end
       end) args.
  Proof.
    induction args as [|e1 rest IH]; simpl; [reflexivity|].
    destruct (step_with apply_prim σ e1) as [[e1' σ']|] eqn:?; [reflexivity|].
    destruct e1; try reflexivity.
    rewrite IH. reflexivity.
  Qed.

  Inductive step_frame (σ : state) : state -> Prop :=
  | StepFrameSame σ' :
      st_store σ' = st_store σ ->
      st_env σ' = st_env σ ->
      step_frame σ σ'
  | StepFrameAlloc vs σ' :
      alloc_obj σ vs = (VLoc (st_next_loc σ), σ') ->
      step_frame σ σ'.

  Lemma step_frame_store_eq σ σ' :
    step_frame σ σ' ->
    st_store σ' = st_store σ \/
    exists vs, alloc_obj σ vs = (VLoc (st_next_loc σ), σ').
  Proof.
    intros Hf. inversion Hf; subst; eauto.
  Qed.

  Lemma step_frame_env_eq σ σ' :
    step_frame σ σ' ->
    st_env σ' = st_env σ.
  Proof.
    intros Hf. inversion Hf as [σ0 Hstore Henv|vs σ0 Halloc]; subst; auto.
    unfold alloc_obj in Halloc. inversion Halloc. reflexivity.
  Qed.

  Lemma lookup_obj_alloc_obj_other σ vs lnew σ' l :
    alloc_obj σ vs = (VLoc lnew, σ') ->
    l <> lnew ->
    lookup_obj σ' l = lookup_obj σ l.
  Proof.
    intros Halloc Hneq.
    unfold alloc_obj in Halloc.
    inversion Halloc; subst; clear Halloc.
    unfold lookup_obj. simpl.
    destruct (Nat.eqb l (st_next_loc σ)) eqn:Heq.
    - apply Nat.eqb_eq in Heq. contradiction.
    - reflexivity.
  Qed.

  Lemma mark_frozen_preserves_env σ l :
    st_env (mark_frozen σ l) = st_env σ.
  Proof.
    unfold mark_frozen.
    destruct (existsb (Nat.eqb l) (st_frozen σ)); reflexivity.
  Qed.

  Lemma freeze_shallow_preserves_env σ v :
    st_env (freeze_shallow σ v) = st_env σ.
  Proof.
    destruct v; simpl; try reflexivity.
    apply mark_frozen_preserves_env.
  Qed.

  Lemma freeze_deep_preserves_env fuel σ v :
    st_env (freeze_deep fuel σ v) = st_env σ.
  Proof.
    revert σ v.
    induction fuel as [|fuel IH]; intros σ v; simpl; [reflexivity|].
    destruct v; try reflexivity.
    remember (mark_frozen σ l) as σ1 eqn:Hσ1.
    assert (Henv1 : st_env σ1 = st_env σ).
    { subst σ1. apply mark_frozen_preserves_env. }
    destruct (lookup_obj σ1 l) as [obj|] eqn:Hobj; [|exact Henv1].
    assert (Hfold : forall flds σ0,
      st_env (fold_left (fun σacc (kv : string * val) => freeze_deep fuel σacc (snd kv)) flds σ0) =
      st_env σ0).
    {
      intros flds.
      induction flds as [|[k w] rest IHrest]; intros σ0; simpl.
      - reflexivity.
      - transitivity (st_env (freeze_deep fuel σ0 w)).
        + apply IHrest.
        + apply IH.
    }
    rewrite Hfold.
    exact Henv1.
  Qed.

  Lemma env_lookup_closed σ x v :
    closed_state σ ->
    lookup_assoc x (st_env σ) = Some v ->
    closed_val σ v.
  Proof.
    intros Hclosed Hlookup.
    eapply closed_state_env_vals; eauto.
  Qed.

  Lemma store_lookup_closed σ l obj fld v :
    closed_state σ ->
    lookup_obj σ l = Some obj ->
    lookup_field (obj_fields obj) fld = Some v ->
    closed_val σ v.
  Proof.
    intros Hclosed Hobj Hfield.
    eapply closed_state_store_vals; eauto.
  Qed.

  Lemma reaches_dyn_old_after_alloc σ vs lnew σ' root pid :
    closed_state σ ->
    closed_val σ root ->
    alloc_obj σ vs = (VLoc lnew, σ') ->
    reaches_dyn σ' root pid ->
    reaches_dyn σ root pid.
  Proof.
    intros Hclosed Hroot Halloc Hreach.
    unfold reaches_dyn in *.
    induction Hreach as [w|l obj fld v w Hobj Hfld Hsub IH].
    - constructor.
    - simpl in Hroot.
      assert (Hneq : l <> lnew).
      { unfold alloc_obj in Halloc. inversion Halloc; subst; lia. }
      rewrite (lookup_obj_alloc_obj_other _ _ _ _ _ Halloc Hneq) in Hobj.
      econstructor 2.
      + exact Hobj.
      + exact Hfld.
      + apply IH.
        eapply store_lookup_closed; eauto.
  Qed.

  Lemma closed_val_reaches_frame σ σ' v pid :
    step_frame σ σ' ->
    closed_state σ ->
    closed_val σ v ->
    reaches_dyn σ' v pid ->
    reaches_dyn σ v pid.
  Proof.
    intros Hframe Hclosed Hval Hreach.
    inversion Hframe as [σ0 Hstore Henv|vs σ0 Halloc]; subst.
    - eapply reaches_dyn_same_store; eauto.
    - eapply reaches_dyn_old_after_alloc; eauto.
  Qed.

  Lemma all_lit_in_args args vs v :
    all_lit args = Some vs ->
    In v vs ->
    In (CoreVal v) args.
  Proof.
    revert vs v.
    induction args as [|e rest IH]; intros vs v Hall Hin; simpl in Hall.
    - inversion Hall; subst. inversion Hin.
    - destruct e; try discriminate.
      destruct (all_lit rest) eqn:Hrest; try discriminate.
      inversion Hall; subst; clear Hall.
      simpl in Hin. destruct Hin as [Hin|Hin].
      + subst. left. reflexivity.
      + right. eapply IH; eauto.
  Qed.

  Lemma all_lit_field_in_fields flds vs k v :
    all_lit_fields flds = Some vs ->
    lookup_field vs k = Some v ->
    In (k, CoreVal v) flds.
  Proof.
    revert vs k v.
    induction flds as [|[k0 e0] rest IH]; intros vs k v Hall Hlookup; simpl in *.
    - inversion Hall; subst. inversion Hlookup.
    - destruct e0; try discriminate.
      destruct (all_lit_fields rest) eqn:Hrest; try discriminate.
      inversion Hall; subst; clear Hall.
      simpl in Hlookup.
      destruct (String.eqb k k0) eqn:Heq.
      + apply String.eqb_eq in Heq. subst.
        inversion Hlookup; subst. left. reflexivity.
      + right. eapply IH; eauto.
  Qed.

  Lemma closed_fields_member σ flds k v :
    closed_fields σ flds ->
    In (k, CoreVal v) flds ->
    closed_val σ v.
  Proof.
    intros Hclosed Hin.
    induction Hclosed.
    - contradiction.
    - simpl in Hin. destruct Hin as [Hin|Hin].
      + inversion Hin; subst.
        inversion H; subst. assumption.
      + eapply IHHclosed; eauto.
  Qed.

  Lemma fields_member_reaches_dyn σ flds k v pid :
    In (k, CoreVal v) flds ->
    reaches_dyn σ v pid ->
    fields_reach_dyn σ flds pid.
  Proof.
    intros Hin Hreach.
    induction flds as [|[k0 e0] rest IH]; simpl in Hin.
    - contradiction.
    - destruct Hin as [Hin|Hin].
      + inversion Hin; subst.
        apply FieldsReachHere.
        apply ExprReachesVal.
        exact Hreach.
      + apply FieldsReachThere.
        eapply IH; eauto.
  Qed.

  Lemma alloc_result_dyn_from_fields σ flds vs lnew σ' pid :
    closed_state σ ->
    closed_fields σ flds ->
    all_lit_fields flds = Some vs ->
    alloc_obj σ vs = (VLoc lnew, σ') ->
    reaches_dyn σ' (VLoc lnew) pid ->
    fields_reach_dyn σ flds pid.
  Proof.
    intros Hclosed Hflds Hall Halloc Hreach.
    unfold reaches_dyn in Hreach.
    dependent destruction Hreach.
    unfold alloc_obj in Halloc.
    inversion Halloc; subst; clear Halloc.
    unfold lookup_obj in H. simpl in H.
    rewrite Nat.eqb_refl in H. inversion H; subst obj; clear H.
    assert (Hin : In (fld, CoreVal v) flds).
    { eapply all_lit_field_in_fields; eauto. }
    assert (Hcv : closed_val σ v).
    { eapply closed_fields_member; eauto. }
    assert (Hold : reaches_dyn σ v pid).
    { eapply reaches_dyn_old_after_alloc; eauto. }
    eapply fields_member_reaches_dyn; eauto.
  Qed.

  Lemma builtin_apply_reaches_from_arg σ name args root σ' pid :
    apply_prim σ (PrimBuiltin name) args = (CoreVal root, σ') ->
    reaches_dyn σ' root pid ->
    exists arg, In arg args /\ reaches_dyn σ arg pid.
  Proof.
    intros Happ Hreach.
    eapply builtin_conservative; eauto.
  Qed.

  Lemma dyn_apply_no_reaches σ pid args root σ' badpid :
    apply_prim σ (PrimDyn pid) args = (CoreVal root, σ') ->
    reaches_dyn σ' root badpid ->
    False.
  Proof.
    intros Happ Hreach.
    unfold apply_prim in Happ.
    destruct (lookup_nat_assoc pid (st_dyn_prims σ)) as [[cell delta]|] eqn:Hdyn;
      try discriminate;
      destruct args; try discriminate;
      destruct (lookup_cell σ cell) eqn:Hcell; inversion Happ; subst; clear Happ;
      unfold reaches_dyn in Hreach;
      eapply reaches_val_from_lit in Hreach; discriminate.
  Qed.

  Lemma ext_apply_no_reaches σ pid args root σ' badpid :
    apply_prim σ (PrimExt pid) args = (CoreVal root, σ') ->
    reaches_dyn σ' root badpid ->
    False.
  Proof. intros Happ _. discriminate Happ. Qed.

  Lemma if_result_state_eq {A B : Type} (b : bool) (x y : A) (σ σ' : B) x' :
    (if b then (x, σ) else (y, σ)) = (x', σ') ->
    σ' = σ.
  Proof.
    destruct b; intro Heq; inversion Heq; reflexivity.
  Qed.

  Lemma apply_prim_frame σ p args e' σ' :
    apply_prim σ p args = (e', σ') ->
    step_frame σ σ'.
  Proof.
    intros Happ.
    destruct p as [name|pid|pid]; unfold apply_prim in Happ.
    - unfold eval_builtin_prim in Happ.
      destruct name.
      + destruct args as [|a [|b args1]]; simpl in Happ.
        * inversion Happ; subst; clear Happ. apply StepFrameSame; reflexivity.
        * inversion Happ; subst; clear Happ.
          constructor.
          -- apply freeze_shallow_preserves_store.
          -- apply freeze_shallow_preserves_env.
        * inversion Happ; subst; clear Happ. apply StepFrameSame; reflexivity.
      + destruct args as [|a [|b args1]]; simpl in Happ.
        * inversion Happ; subst; clear Happ. apply StepFrameSame; reflexivity.
        * inversion Happ; subst; clear Happ.
          constructor.
          -- change (st_store (freeze_deep 20 σ a) = st_store σ).
             apply freeze_deep_preserves_store.
          -- change (st_env (freeze_deep 20 σ a) = st_env σ).
             apply freeze_deep_preserves_env.
        * inversion Happ; subst; clear Happ. apply StepFrameSame; reflexivity.
      + destruct args as [|a [|b args1]]; simpl in Happ.
        * inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
        * destruct a; simpl in Happ;
            try (inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity).
          destruct l; simpl in Happ;
            try (inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity).
          destruct v; simpl in Happ;
            try (inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity).
          destruct b; inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
        * inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
      + destruct args as [|a [|b args1]]; simpl in Happ.
        * inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
        * assert (Hσ : σ' = σ).
          { eapply if_result_state_eq; eauto. }
          subst σ'. apply StepFrameSame; reflexivity.
        * inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
      + destruct args; simpl in Happ;
          inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
    - destruct (lookup_nat_assoc pid (st_dyn_prims σ)) as [[cell delta]|] eqn:Hdyn.
      + destruct args as [|a rest].
        * simpl in Happ.
          destruct (lookup_cell σ cell) eqn:Hcell;
            inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
        * simpl in Happ. inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
      + simpl in Happ. inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
    - inversion Happ; subst; clear Happ; apply StepFrameSame; reflexivity.
  Qed.

  Lemma step_with_alloc_obj_eq σ flds :
    step_with apply_prim σ (CoreAllocObj flds) =
      match all_lit_fields flds with
      | Some vs =>
          let '(v, σ') := alloc_obj σ vs in
          Some (CoreVal v, σ')
      | None => step_fields_with apply_prim σ flds
      end.
  Proof.
    simpl.
    destruct (all_lit_fields flds) as [vs|] eqn:Hall; [reflexivity|].
    revert Hall.
    induction flds as [|[k e1] rest IH]; intros Hall; simpl in *; try discriminate.
    destruct (step_with apply_prim σ e1) as [[e1' σ1]|] eqn:Hstep; [reflexivity|].
    destruct e1; try reflexivity.
    destruct (all_lit_fields rest) as [vs'|] eqn:Hrestlit; simpl in Hall; try discriminate.
    specialize (IH eq_refl).
    rewrite IH.
    destruct (step_fields_with apply_prim σ rest) as [[e' σ']|] eqn:Hrest; reflexivity.
  Qed.

  Lemma step_with_app_prim_eq σ p args :
    step_with apply_prim σ (CoreApp (CoreVal (VPrim p)) args) =
      match all_lit args with
      | Some vs => Some (apply_prim σ p vs)
      | None => step_args_with apply_prim σ (CoreVal (VPrim p)) args
      end.
  Proof.
    simpl.
    destruct (all_lit args) as [vs|] eqn:Hall; [reflexivity|].
    revert Hall.
    induction args as [|a rest IH]; intros Hall; simpl in *; try discriminate.
    destruct (step_with apply_prim σ a) as [[a' σ1]|] eqn:Hstep; [reflexivity|].
    destruct a; try reflexivity.
    destruct (all_lit rest) as [vs'|] eqn:Hrestlit; simpl in Hall; try discriminate.
    specialize (IH eq_refl).
    rewrite IH.
    destruct (step_args_with apply_prim σ (CoreVal (VPrim p)) rest) as [[e' σ']|] eqn:Hrest; reflexivity.
  Qed.

  Lemma step_with_var_frame σ x e' σ' :
    step_with apply_prim σ (CoreVar x) = Some (e', σ') ->
    step_frame σ σ'.
  Proof.
    simpl.
    destruct (lookup_assoc x (st_env σ));
      intros Hstep; inversion Hstep; subst; clear Hstep;
      apply StepFrameSame; reflexivity.
  Qed.

  Lemma step_with_eqstrict_vals_frame σ v1 v2 e' σ' :
    step_with apply_prim σ (CoreBinop EqStrictOp (CoreVal v1) (CoreVal v2)) =
      Some (e', σ') ->
    step_frame σ σ'.
  Proof.
    intros Hstep.
    simpl in Hstep.
    inversion Hstep; subst; clear Hstep.
    apply StepFrameSame; reflexivity.
  Qed.

  Lemma step_with_addnum_vals_frame σ e1 e2 e' σ' :
    step_with apply_prim σ (CoreBinop AddNum e1 e2) = Some (e', σ') ->
    (exists n1 n2, e1 = CoreVal (VLit (LJson (JNum n1))) /\ e2 = CoreVal (VLit (LJson (JNum n2)))) ->
    step_frame σ σ'.
  Proof.
    intros Hstep (n1 & n2 & -> & ->).
    simpl in Hstep.
    inversion Hstep; subst; clear Hstep.
    apply StepFrameSame; reflexivity.
  Qed.

  Lemma step_with_concatstr_vals_frame σ e1 e2 e' σ' :
    step_with apply_prim σ (CoreBinop ConcatStr e1 e2) = Some (e', σ') ->
    (exists s1 s2, e1 = CoreVal (VLit (LJson (JStr s1))) /\ e2 = CoreVal (VLit (LJson (JStr s2)))) ->
    step_frame σ σ'.
  Proof.
    intros Hstep (s1 & s2 & -> & ->).
    simpl in Hstep.
    inversion Hstep; subst; clear Hstep.
    apply StepFrameSame; reflexivity.
  Qed.

  Theorem expr_reaches_frame :
    forall σ σ' e pid,
      step_frame σ σ' ->
      closed_state σ ->
      closed_expr σ e ->
      expr_reaches_dyn σ' e pid ->
      expr_reaches_dyn σ e pid
  with exprs_reach_frame :
    forall σ σ' es pid,
      step_frame σ σ' ->
      closed_state σ ->
      closed_exprs σ es ->
      exprs_reach_dyn σ' es pid ->
      exprs_reach_dyn σ es pid
  with fields_reach_frame :
    forall σ σ' flds pid,
      step_frame σ σ' ->
      closed_state σ ->
      closed_fields σ flds ->
      fields_reach_dyn σ' flds pid ->
      fields_reach_dyn σ flds pid.
  Proof.
    - intros σ σ' e pid Hframe Hclosed Hce Hreach.
      revert Hce.
      induction Hreach; intros Hce; inversion Hce; subst.
      + apply ExprReachesVal.
        eapply closed_val_reaches_frame; eauto.
      + apply ExprReachesVar.
        destruct H as [v [Hlookup Hdyn]].
        assert (Henv : st_env σ' = st_env σ) by (apply step_frame_env_eq; exact Hframe).
        rewrite Henv in Hlookup.
        exists v. split.
        * exact Hlookup.
        * pose proof (env_lookup_closed σ x v Hclosed Hlookup) as Hcv.
          exact (closed_val_reaches_frame σ σ' v pid Hframe Hclosed Hcv Hdyn).
      + apply ExprReachesAlloc.
        eapply fields_reach_frame; eauto.
      + apply ExprReachesGet.
        eapply IHHreach; eauto.
      + apply ExprReachesAppFun.
        eapply IHHreach; eauto.
      + apply ExprReachesAppArgs.
        eapply exprs_reach_frame; eauto.
      + apply ExprReachesLetRhs.
        eapply IHHreach; eauto.
      + apply ExprReachesLetBody.
        eapply IHHreach; eauto.
      + apply ExprReachesTypeOf.
        eapply IHHreach; eauto.
      + apply ExprReachesCond0.
        eapply IHHreach; eauto.
      + apply ExprReachesCond1.
        eapply IHHreach; eauto.
      + apply ExprReachesCond2.
        eapply IHHreach; eauto.
      + apply ExprReachesBinopL.
        eapply IHHreach; eauto.
      + apply ExprReachesBinopR.
        eapply IHHreach; eauto.
    - intros σ σ' es pid Hframe Hclosed Hces Hreach.
      revert Hces.
      induction Hreach; intros Hces; inversion Hces; subst.
      + apply ExprsReachHere.
        eapply expr_reaches_frame; eauto.
      + apply ExprsReachThere.
        eapply IHHreach; eauto.
    - intros σ σ' flds pid Hframe Hclosed Hcfs Hreach.
      revert Hcfs.
      induction Hreach; intros Hcfs; inversion Hcfs; subst.
      + apply FieldsReachHere.
        eapply expr_reaches_frame; eauto.
      + apply FieldsReachThere.
        eapply IHHreach; eauto.
  Qed.

  Fixpoint public_compile_closed
      (σ : state) (e : JessiePublic.expr)
      (Henv : forall x v, lookup_assoc x (st_env σ) = Some v -> closed_val σ v)
      {struct e}
      : closed_expr σ (JessiePublic.compile e).
  Proof.
    destruct e as
      [l
      | x
      | fields
      | e field
      | f args
      | x rhs body
      | e
      | e0 e1 e2
      | op e1 e2
      |].
    - simpl. constructor. destruct l; simpl; auto.
    - simpl. constructor.
    - simpl.
      constructor.
      induction fields as [|[k e'] rest IH].
      + simpl. constructor.
      + simpl. constructor.
        * exact (public_compile_closed σ e' Henv).
        * exact IH.
    - simpl. constructor. exact (public_compile_closed σ e Henv).
    - simpl.
      constructor.
      + exact (public_compile_closed σ f Henv).
      + induction args as [|a rest IH].
        * simpl. constructor.
        * simpl. constructor.
          -- exact (public_compile_closed σ a Henv).
          -- exact IH.
    - simpl. constructor.
      + exact (public_compile_closed σ rhs Henv).
      + exact (public_compile_closed σ body Henv).
    - simpl. constructor. exact (public_compile_closed σ e Henv).
    - simpl. constructor.
      + exact (public_compile_closed σ e0 Henv).
      + exact (public_compile_closed σ e1 Henv).
      + exact (public_compile_closed σ e2 Henv).
    - simpl. constructor.
      + exact (public_compile_closed σ e1 Henv).
      + exact (public_compile_closed σ e2 Henv).
    - simpl. constructor.
  Defined.

  Fixpoint public_compile_exprs_closed
      (σ : state) (es : list JessiePublic.expr)
      (Henv : forall x v, lookup_assoc x (st_env σ) = Some v -> closed_val σ v)
      {struct es}
      : closed_exprs σ (map JessiePublic.compile es).
  Proof.
    destruct es as [|e es'].
    - simpl. constructor.
    - simpl. constructor.
      + exact (public_compile_closed σ e Henv).
      + exact (public_compile_exprs_closed σ es' Henv).
  Defined.

  Fixpoint public_compile_fields_closed
      (σ : state) (flds : list (string * JessiePublic.expr))
      (Henv : forall x v, lookup_assoc x (st_env σ) = Some v -> closed_val σ v)
      {struct flds}
      : closed_fields σ
          (map (fun kv => (fst kv, JessiePublic.compile (snd kv))) flds).
  Proof.
    destruct flds as [|[k e] rest].
    - simpl. constructor.
    - simpl. constructor.
      + exact (public_compile_closed σ e Henv).
      + exact (public_compile_fields_closed σ rest Henv).
  Defined.

  Lemma closed_state_empty_state :
    closed_state empty_state.
  Proof.
    constructor.
    - intros l obj fld v Hobj.
      unfold lookup_obj in Hobj. simpl in Hobj. discriminate.
    - intros x v Hlookup.
      unfold empty_state in Hlookup. simpl in Hlookup.
      repeat
        match goal with
        | H : context [String.eqb ?a ?b] |- _ =>
            destruct (String.eqb_spec a b); subst; simpl in H
        end;
      inversion Hlookup; subst; simpl; auto.
    - intros l n Hcell.
      unfold empty_state, lookup_cell in Hcell. simpl in Hcell. discriminate.
    - intros pid dp Hdyn.
      unfold empty_state in Hdyn. simpl in Hdyn. discriminate.
  Qed.

  Lemma closed_state_makeCounter_state :
    closed_state JessieCounterCase.counter_empty_state.
  Proof.
    constructor.
    - intros l obj fld v Hobj.
      unfold JessieCounterCase.counter_empty_state, lookup_obj in Hobj.
      simpl in Hobj. discriminate.
    - intros x v Hlookup.
      unfold JessieCounterCase.counter_empty_state in Hlookup.
      simpl in Hlookup.
      destruct (String.eqb_spec x "makeCounter"); subst.
      + inversion Hlookup; subst. simpl. auto.
      + destruct (String.eqb_spec x "freeze"); subst; simpl in Hlookup.
        * inversion Hlookup; subst. simpl. auto.
        * destruct (String.eqb_spec x "harden"); subst; simpl in Hlookup.
          { inversion Hlookup; subst. simpl. auto. }
          destruct (String.eqb_spec x "assert"); subst; simpl in Hlookup.
          { inversion Hlookup; subst. simpl. auto. }
          destruct (String.eqb_spec x "id"); subst; simpl in Hlookup.
          { inversion Hlookup; subst. simpl. auto. }
          destruct (String.eqb_spec x "fail"); subst; simpl in Hlookup.
          { inversion Hlookup; subst. simpl. auto. }
          discriminate.
    - intros l n Hcell.
      unfold JessieCounterCase.counter_empty_state, lookup_cell in Hcell.
      simpl in Hcell. discriminate.
    - intros pid dp Hdyn.
      unfold JessieCounterCase.counter_empty_state in Hdyn.
      simpl in Hdyn. discriminate.
  Qed.

  Example builtin_freeze_reaches_only_from_arg :
    forall pid,
    reaches_dyn (freeze_shallow empty_state (VLoc 0%nat)) (VLoc 0%nat) pid ->
    exists arg, In arg [VLoc 0%nat] /\ reaches_dyn empty_state arg pid.
  Proof.
    intros pid Hreach.
    eapply (builtin_apply_reaches_from_arg
      empty_state PrimFreeze [VLoc 0%nat] (VLoc 0%nat)
      (freeze_shallow empty_state (VLoc 0%nat)) pid).
    - reflexivity.
    - exact Hreach.
  Qed.

  Example dyn_apply_returns_no_dyn_reachability :
    forall pid badpid root σ',
      apply_prim empty_state (PrimDyn pid) [] = (CoreVal root, σ') ->
      reaches_dyn σ' root badpid ->
      False.
  Proof.
    intros pid badpid root σ' Happ Hreach.
    eapply dyn_apply_no_reaches; eauto.
  Qed.

  Example public_compile_builtin_get_is_closed :
    closed_expr empty_state
      (JessiePublic.compile (JessiePublic.Get (JessiePublic.Var "freeze") "prototype")).
  Proof.
    apply public_compile_closed.
    intros x v Hlookup.
    eapply env_lookup_closed.
    - exact closed_state_empty_state.
    - exact Hlookup.
  Qed.

End JessieStepConnectivity.
