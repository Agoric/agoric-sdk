From Coq Require Import Lia List String ZArith Program.Equality.
Require Import jessie_lang jessie_justin jessie_counter jessie_counter_reach jessie_public.

Import ListNotations.
Open Scope string_scope.
Open Scope Z_scope.

Module JessieStepConnectivity.
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
        | CounterIncr cell => cell < st_next_loc σ
        | CounterDecr cell => cell < st_next_loc σ
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
    destruct (lookup_nat_assoc pid (st_dyn_prims σ)) as [[cell|cell]|] eqn:Hdyn;
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

  Lemma closed_state_counter_empty_state :
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

End JessieStepConnectivity.
