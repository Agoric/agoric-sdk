(* Iris ectxi_language/language instance for the Justin core. *)
From Coq Require Import List String ZArith.
From iris.program_logic Require Export ectxi_language.
Require Import jessie_lang jessie_justin.

Import ListNotations.
Open Scope list_scope.
Open Scope string_scope.
Open Scope Z_scope.

Module JustinIris.
  Import Justin.
  Import JustinExec.

  Definition expr := core_expr.
  Definition val := Justin.val.
  Definition state := JustinExec.state.
  Definition observation := unit.

  Definition of_val (v : val) : expr := CoreVal v.

  Definition to_val (e : expr) : option val :=
    match e with
    | CoreVal v => Some v
    | _ => None
    end.

  Inductive ectx_item :=
  | GetCtx (fld : string)
  | TypeOfCtx
  | CondCtx (e1 e2 : expr)
  | LetInCtx (x : string) (body : expr)
  | BinOpLCtx (op : resolved_binop) (e2 : expr)
  | BinOpRCtx (op : resolved_binop) (v1 : val)
  | AppFunCtx (args : list expr)
  | AppArgCtx (vf : val) (done : list val) (pending : list expr)
  | ObjFieldCtx (done : list (string * val)) (key : string)
      (pending : list (string * expr)).

  Definition val_to_field_expr (kv : string * val) : string * expr :=
    (fst kv, CoreVal (snd kv)).

  Definition fill_item (Ki : ectx_item) (e : expr) : expr :=
    match Ki with
    | GetCtx fld => CoreGet e fld
    | TypeOfCtx => CoreTypeOf e
    | CondCtx e1 e2 => CoreCond e e1 e2
    | LetInCtx x body => CoreLetIn x e body
    | BinOpLCtx op e2 => CoreBinop op e e2
    | BinOpRCtx op v1 => CoreBinop op (CoreVal v1) e
    | AppFunCtx args => CoreApp e args
    | AppArgCtx vf done pending =>
        CoreApp (CoreVal vf) (map CoreVal done ++ e :: pending)
    | ObjFieldCtx done key pending =>
        CoreAllocObj
          (map val_to_field_expr done ++ (key, e) :: pending)
    end.

  Fixpoint all_vals (es : list expr) : option (list val) :=
    match es with
    | [] => Some []
    | e :: es' =>
        match to_val e, all_vals es' with
        | Some v, Some vs => Some (v :: vs)
        | _, _ => None
        end
    end.

  Fixpoint all_val_fields (flds : list (string * expr))
    : option (list (string * val)) :=
    match flds with
    | [] => Some []
    | (k, e) :: flds' =>
        match to_val e, all_val_fields flds' with
        | Some v, Some vs => Some ((k, v) :: vs)
        | _, _ => None
        end
    end.

  Inductive base_step :
    expr -> state -> list observation -> expr -> state -> list expr -> Prop :=
  | StepVar σ x v :
      lookup_assoc x (st_env σ) = Some v ->
      base_step (CoreVar x) σ [] (CoreVal v) σ []
  | StepVarMissing σ x :
      lookup_assoc x (st_env σ) = None ->
      base_step (CoreVar x) σ [] CoreBzzt σ []
  | StepAllocObj σ flds vs v σ' :
      all_val_fields flds = Some vs ->
      alloc_obj σ vs = (v, σ') ->
      base_step (CoreAllocObj flds) σ [] (CoreVal v) σ' []
  | StepGet σ l fld obj v :
      lookup_obj σ l = Some obj ->
      v = match lookup_field (obj_fields obj) fld with
          | Some v => v
          | None => VLit LUndefined
          end ->
      base_step (CoreGet (CoreVal (VLoc l)) fld) σ [] (CoreVal v) σ []
  | StepGetBad σ v fld :
      (forall l, v <> VLoc l) ->
      base_step (CoreGet (CoreVal v) fld) σ [] CoreBzzt σ []
  | StepTypeOf σ v :
      base_step (CoreTypeOf (CoreVal v)) σ [] (CoreVal (VLit (LJson (JStr (typeof_val v))))) σ []
  | StepCondTrue σ v e1 e2 :
      truthy v = true ->
      base_step (CoreCond (CoreVal v) e1 e2) σ [] e1 σ []
  | StepCondFalse σ v e1 e2 :
      truthy v = false ->
      base_step (CoreCond (CoreVal v) e1 e2) σ [] e2 σ []
  | StepLet σ x v body :
      base_step (CoreLetIn x (CoreVal v) body) σ [] (subst x v body) σ []
  | StepEq σ v1 v2 :
      base_step (CoreBinop EqStrictOp (CoreVal v1) (CoreVal v2))
        σ [] (CoreVal (VLit (LJson (JBool (strict_eqb v1 v2))))) σ []
  | StepAddNum σ n1 n2 :
      base_step (CoreBinop AddNum (CoreVal (VLit (LJson (JNum n1)))) (CoreVal (VLit (LJson (JNum n2)))))
        σ [] (CoreVal (VLit (LJson (JNum (n1 + n2))))) σ []
  | StepAddNumBadL σ v1 v2 :
      (forall n, v1 <> VLit (LJson (JNum n))) ->
      base_step (CoreBinop AddNum (CoreVal v1) (CoreVal v2)) σ [] CoreBzzt σ []
  | StepAddNumBadR σ n v :
      (forall n', v <> VLit (LJson (JNum n'))) ->
      base_step (CoreBinop AddNum (CoreVal (VLit (LJson (JNum n)))) (CoreVal v)) σ [] CoreBzzt σ []
  | StepConcatStr σ s1 s2 :
      base_step (CoreBinop ConcatStr (CoreVal (VLit (LJson (JStr s1)))) (CoreVal (VLit (LJson (JStr s2)))))
        σ [] (CoreVal (VLit (LJson (JStr (s1 ++ s2))))) σ []
  | StepConcatBadL σ v1 v2 :
      (forall s, v1 <> VLit (LJson (JStr s))) ->
      base_step (CoreBinop ConcatStr (CoreVal v1) (CoreVal v2)) σ [] CoreBzzt σ []
  | StepConcatBadR σ s v :
      (forall s', v <> VLit (LJson (JStr s'))) ->
      base_step (CoreBinop ConcatStr (CoreVal (VLit (LJson (JStr s)))) (CoreVal v)) σ [] CoreBzzt σ []
  | StepAppPrim σ name args vs e' σ' :
      all_vals args = Some vs ->
      apply_prim σ name vs = (e', σ') ->
      base_step (CoreApp (CoreVal (VPrim name)) args) σ [] e' σ' []
  | StepAppNonPrim σ v args vs :
      all_vals args = Some vs ->
      (forall name, v <> VPrim name) ->
      base_step (CoreApp (CoreVal v) args) σ [] CoreBzzt σ [].

  Lemma to_of_val v :
    to_val (of_val v) = Some v.
  Proof. reflexivity. Qed.

  Lemma of_to_val e v :
    to_val e = Some v -> of_val v = e.
  Proof.
    destruct e; simpl; try discriminate.
    intros [= <-].
    reflexivity.
  Qed.

  Lemma val_base_stuck e σ κ e' σ' efs :
    base_step e σ κ e' σ' efs -> to_val e = None.
  Proof.
    intros Hstep; inversion Hstep; reflexivity.
  Qed.

  Lemma fill_item_val Ki e :
    is_Some (to_val (fill_item Ki e)) -> is_Some (to_val e).
  Proof.
    destruct Ki; simpl; destruct e; simpl; intros [w Hw]; try discriminate; eauto.
  Qed.

  Lemma lit_prefix_expr_split done1 done2 e1 e2 pending1 pending2 :
    to_val e1 = None ->
    to_val e2 = None ->
    (map CoreVal done1 ++ e1 :: pending1)%list =
      (map CoreVal done2 ++ e2 :: pending2)%list ->
    done1 = done2 /\ e1 = e2 /\ pending1 = pending2.
  Proof.
    revert done2.
    induction done1 as [|v1 done1 IH]; intros [|v2 done2] Hnv1 Hnv2 Heq; simpl in Heq.
    - inversion Heq; subst. repeat split; auto.
    - destruct e1; simpl in Hnv1; discriminate.
    - destruct e2; simpl in Hnv2; discriminate.
    - injection Heq as Hhead Heq_tail.
      inversion Hhead; subst.
      specialize (IH done2 Hnv1 Hnv2 Heq_tail) as [Hdone [He Hpend]].
      subst. repeat split; auto.
  Qed.

  Lemma lit_prefix_field_split done1 done2 key1 key2 e1 e2 pending1 pending2 :
    to_val e1 = None ->
    to_val e2 = None ->
    (map val_to_field_expr done1 ++ (key1, e1) :: pending1)%list =
      (map val_to_field_expr done2 ++ (key2, e2) :: pending2)%list ->
    done1 = done2 /\ key1 = key2 /\ e1 = e2 /\ pending1 = pending2.
  Proof.
    revert done2.
    induction done1 as [|[k1 v1] done1 IH]; intros [|[k2 v2] done2] Hnv1 Hnv2 Heq; simpl in Heq.
    - inversion Heq; subst. repeat split; auto.
    - destruct e1; simpl in Hnv1; discriminate.
    - destruct e2; simpl in Hnv2; discriminate.
    - inversion Heq; subst.
      match goal with
      | Htail : (map val_to_field_expr done1 ++ (key1, e1) :: pending1)%list =
                (map val_to_field_expr done2 ++ (key2, e2) :: pending2)%list |- _ =>
          specialize (IH done2 Hnv1 Hnv2 Htail) as [Hdone [Hkey [He Hpend]]];
          subst; repeat split; auto
      end.
  Qed.

  Lemma all_vals_hole_value done e pending vs :
    all_vals (map CoreVal done ++ e :: pending) = Some vs ->
    is_Some (to_val e).
  Proof.
    revert done vs.
    induction done as [|v done IH]; intros vs Hall; simpl in Hall.
    - destruct (to_val e); simpl in Hall; [eauto|discriminate].
    - destruct (all_vals (map CoreVal done ++ e :: pending)) eqn:Hrest;
        simpl in Hall; try discriminate.
      eapply IH; eauto.
  Qed.

  Lemma all_vals_hole_value_step done e pending v vs :
    match all_vals (map CoreVal done ++ e :: pending) with
    | Some vs' => Some (v :: vs')
    | None => None
    end = Some vs ->
    is_Some (to_val e).
  Proof.
    revert done vs.
    induction done as [|v0 done IH]; intros vs Hall; simpl in Hall.
    - destruct (to_val e); simpl in Hall; [eauto|discriminate].
    - destruct (all_vals (map CoreVal done ++ e :: pending)) eqn:Hrest;
        simpl in Hall; try discriminate.
      eapply all_vals_hole_value; eauto.
  Qed.

  Lemma all_val_fields_hole_value done key e pending vs :
    all_val_fields (map val_to_field_expr done ++ (key, e) :: pending) = Some vs ->
    is_Some (to_val e).
  Proof.
    revert done vs.
    induction done as [|[k v] done IH]; intros vs Hall; simpl in Hall.
    - destruct (to_val e); simpl in Hall; [eauto|discriminate].
    - destruct (all_val_fields (map val_to_field_expr done ++ (key, e) :: pending)) eqn:Hrest;
        simpl in Hall; try discriminate.
      eapply IH; eauto.
  Qed.

  Lemma all_val_fields_hole_value_step done key e pending k v vs :
    match all_val_fields (map val_to_field_expr done ++ (key, e) :: pending) with
    | Some vs' => Some ((k, v) :: vs')
    | None => None
    end = Some vs ->
    is_Some (to_val e).
  Proof.
    revert done vs.
    induction done as [|[k0 v0] done IH]; intros vs Hall; simpl in Hall.
    - destruct (to_val e); simpl in Hall; [eauto|discriminate].
    - destruct (all_val_fields (map val_to_field_expr done ++ (key, e) :: pending)) eqn:Hrest;
        simpl in Hall; try discriminate.
      eapply all_val_fields_hole_value; eauto.
  Qed.

  Global Instance fill_item_inj Ki :
    Inj (=) (=) (fill_item Ki).
  Proof.
    destruct Ki; intros e_left e_right H; simpl in H.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H; reflexivity.
    - inversion H as [Hargs]. apply app_inv_head in Hargs. inversion Hargs. reflexivity.
    - inversion H as [Hflds]. apply app_inv_head in Hflds. inversion Hflds. reflexivity.
  Qed.

  Lemma fill_item_no_val_inj Ki1 Ki2 h1 h2 :
    to_val h1 = None -> to_val h2 = None ->
    fill_item Ki1 h1 = fill_item Ki2 h2 -> Ki1 = Ki2.
  Proof.
    intros Hnv1 Hnv2 Hfill.
    destruct Ki1, Ki2; simpl in *; try discriminate;
      try solve [inversion Hfill; subst; reflexivity];
      try solve [inversion Hfill; subst; simpl in Hnv1; congruence];
      try solve [inversion Hfill; subst; simpl in Hnv2; congruence].
    - inversion Hfill; subst.
      match goal with
      | Hargs : (map CoreVal done ++ h1 :: pending)%list =
                (map CoreVal done0 ++ h2 :: pending0)%list |- _ =>
          apply lit_prefix_expr_split in Hargs as [? [? ?]]; auto;
          subst; reflexivity
      end.
    - inversion Hfill; subst.
      match goal with
      | Hflds : (map val_to_field_expr done ++ (key, h1) :: pending)%list =
                (map val_to_field_expr done0 ++ (key0, h2) :: pending0)%list |- _ =>
          apply lit_prefix_field_split in Hflds as [? [? [? ?]]]; auto;
          subst; reflexivity
      end.
  Qed.

  Lemma base_ctx_step_val Ki hole σ κ e' σ' efs :
    base_step (fill_item Ki hole) σ κ e' σ' efs -> is_Some (to_val hole).
  Proof.
    destruct Ki; simpl; intros Hstep;
      try solve [inversion Hstep; subst; simpl; eauto].
    - inversion Hstep; subst;
        match goal with
        | H : all_vals (map CoreVal done ++ hole :: pending) = Some _ |- _ =>
            eapply all_vals_hole_value in H; exact H
        | H : match all_vals (map CoreVal done ++ hole :: pending) with
              | Some vs' => Some (_ :: vs')
              | None => None
              end = Some _ |- _ =>
            eapply all_vals_hole_value_step in H; exact H
        end.
    - inversion Hstep; subst;
        match goal with
        | H : all_val_fields (map val_to_field_expr done ++ (key, hole) :: pending) = Some _ |- _ =>
            eapply all_val_fields_hole_value in H; exact H
        | H : match all_val_fields (map val_to_field_expr done ++ (key, hole) :: pending) with
              | Some vs' => Some ((_ , _) :: vs')
              | None => None
              end = Some _ |- _ =>
            eapply all_val_fields_hole_value_step in H; exact H
        end.
  Qed.

  Lemma justin_ectxi_mixin :
    EctxiLanguageMixin of_val to_val fill_item base_step.
  Proof.
    split.
    - exact to_of_val.
    - exact of_to_val.
    - exact val_base_stuck.
    - exact fill_item_val.
    - exact fill_item_inj.
    - exact fill_item_no_val_inj.
    - exact base_ctx_step_val.
  Qed.

  Canonical Structure justin_ectxi_lang : ectxiLanguage :=
    EctxiLanguage justin_ectxi_mixin.
  Canonical Structure justin_ectx_lang : ectxLanguage :=
    EctxLanguageOfEctxi justin_ectxi_lang.
  Canonical Structure justin_lang : language :=
    LanguageOfEctx justin_ectx_lang.

  Example var_reduces :
    base_step (CoreVar "id") empty_state [] (CoreVal (VPrim (PrimBuiltin PrimId))) empty_state [].
  Proof. constructor. reflexivity. Qed.

  Example typeof_is_atomic :
    base_step (CoreTypeOf (CoreVal (VLit LUndefined))) empty_state []
      (CoreVal (VLit (LJson (JStr "undefined")))) empty_state [].
  Proof. constructor. Qed.

  Example typeof_null_is_object_atomic :
    base_step (CoreTypeOf (CoreVal (VLit (LJson JNull)))) empty_state []
      (CoreVal (VLit (LJson (JStr "object")))) empty_state [].
  Proof. constructor. Qed.

  Example strict_eq_alloc_ctx :
    fill_item (BinOpLCtx EqStrictOp (CoreAllocObj [])) (CoreAllocObj []) =
      CoreBinop EqStrictOp (CoreAllocObj []) (CoreAllocObj []).
  Proof. reflexivity. Qed.
End JustinIris.
