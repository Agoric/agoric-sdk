(* Generic connectivity graph definitions and primitive connectivity contracts. *)
From Coq Require Import List String.
Require Import jessie_lang jessie_lib jessie_justin.

Import ListNotations.
Open Scope string_scope.

Module JessieConnectivity.
  Import Justin.
  Import JessieLib.
  Import JustinExec.

  Inductive cref :=
  | CObj (l : loc)
  | CDyn (pid : nat)
  | CCell (l : loc).

  Definition cref_of_val (v : val) : option cref :=
    match v with
    | VLoc l => Some (CObj l)
    | VPrim (PrimDyn pid) => Some (CDyn pid)
    | _ => None
    end.

  Inductive edge (σ : state) : cref -> cref -> Prop :=
  | EdgeObjObj l obj fld l' :
      lookup_obj σ l = Some obj ->
      lookup_field (obj_fields obj) fld = Some (VLoc l') ->
      edge σ (CObj l) (CObj l')
  | EdgeObjDyn l obj fld pid :
      lookup_obj σ l = Some obj ->
      lookup_field (obj_fields obj) fld = Some (VPrim (PrimDyn pid)) ->
      edge σ (CObj l) (CDyn pid)
  | EdgeDynCell pid cell :
      (exists delta, lookup_nat_assoc pid (st_dyn_prims σ) = Some (DynCellDelta cell delta)) ->
      edge σ (CDyn pid) (CCell cell).

  Inductive reachable (σ : state) : cref -> cref -> Prop :=
  | ReachRefl r :
      reachable σ r r
  | ReachStep r1 r2 r3 :
      edge σ r1 r2 ->
      reachable σ r2 r3 ->
      reachable σ r1 r3.

  Definition val_reaches (σ : state) (root : val) (r : cref) : Prop :=
    match cref_of_val root with
    | Some r0 => reachable σ r0 r
    | None => False
    end.

  Definition args_reach (σ : state) (args : list val) (r : cref) : Prop :=
    exists arg, In arg args /\ val_reaches σ arg r.

  Definition env_reaches (σ : state) (x : string) (r : cref) : Prop :=
    exists v, lookup_assoc x (st_env σ) = Some v /\ val_reaches σ v r.

  Definition old_or_fresh (σ σ' : state) (args : list val) (r : cref) : Prop :=
    args_reach σ args r \/
    match r with
    | CObj l => st_next_loc σ <= l < st_next_loc σ'
    | CCell l => st_next_loc σ <= l < st_next_loc σ'
    | CDyn pid => st_next_prim σ <= pid < st_next_prim σ'
    end.

  Definition primitive_connectivity_ok
      (run : state -> prim_ref -> list val -> core_expr * state) (p : prim_ref) : Prop :=
    forall σ args e' σ' r,
      run σ p args = (e', σ') ->
      (match e' with
       | CoreVal root => val_reaches σ' root r
       | _ => False
      end) ->
      old_or_fresh σ σ' args r.

  Record connected_prim_handler := {
    run_prim :> prim_handler;
    run_prim_connected : forall p, primitive_connectivity_ok run_prim p
  }.

  Lemma lookup_obj_same_store σ σ' l :
    st_store σ = st_store σ' ->
    lookup_obj σ l = lookup_obj σ' l.
  Proof.
    destruct σ as [next prim store frozen env cells dyn].
    destruct σ' as [next' prim' store' frozen' env' cells' dyn'].
    simpl.
    intro Hstore.
    now inversion Hstore.
  Qed.

  Lemma lookup_dyn_same σ σ' pid :
    st_dyn_prims σ = st_dyn_prims σ' ->
    lookup_nat_assoc pid (st_dyn_prims σ) = lookup_nat_assoc pid (st_dyn_prims σ').
  Proof.
    destruct σ as [next prim store frozen env cells dyn].
    destruct σ' as [next' prim' store' frozen' env' cells' dyn'].
    simpl.
    intro Hdyn.
    now inversion Hdyn.
  Qed.

  Lemma edge_same_graph σ σ' r1 r2 :
    st_store σ = st_store σ' ->
    st_dyn_prims σ = st_dyn_prims σ' ->
    edge σ r1 r2 ->
    edge σ' r1 r2.
  Proof.
    intros Hstore Hdyn Hedge.
    inversion Hedge; subst.
    - econstructor 1.
      + rewrite <- (lookup_obj_same_store σ σ' l Hstore). exact H.
      + exact H0.
    - econstructor 2.
      + rewrite <- (lookup_obj_same_store σ σ' l Hstore). exact H.
      + exact H0.
    - econstructor 3.
      destruct H as [delta Hlookup].
      exists delta.
      rewrite <- (lookup_dyn_same σ σ' pid Hdyn).
      exact Hlookup.
  Qed.

  Lemma reachable_same_graph σ σ' r1 r2 :
    st_store σ = st_store σ' ->
    st_dyn_prims σ = st_dyn_prims σ' ->
    reachable σ r1 r2 ->
    reachable σ' r1 r2.
  Proof.
    intros Hstore Hdyn Hreach.
    induction Hreach.
    - constructor.
    - econstructor 2.
      + eapply edge_same_graph; eauto.
      + exact IHHreach.
  Qed.

  Lemma val_reaches_same_graph σ σ' root r :
    st_store σ = st_store σ' ->
    st_dyn_prims σ = st_dyn_prims σ' ->
    val_reaches σ root r ->
    val_reaches σ' root r.
  Proof.
    intros Hstore Hdyn Hreach.
    unfold val_reaches in *.
    destruct (cref_of_val root) as [r0|] eqn:Hroot; [|exact Hreach].
    eapply reachable_same_graph; eauto.
  Qed.

  Lemma mark_frozen_preserves_store σ l :
    st_store (mark_frozen σ l) = st_store σ.
  Proof.
    unfold mark_frozen.
    destruct (existsb (Nat.eqb l) (st_frozen σ)); reflexivity.
  Qed.

  Lemma mark_frozen_preserves_dyn σ l :
    st_dyn_prims (mark_frozen σ l) = st_dyn_prims σ.
  Proof.
    unfold mark_frozen.
    destruct (existsb (Nat.eqb l) (st_frozen σ)); reflexivity.
  Qed.

  Lemma freeze_shallow_preserves_graph σ v :
    st_store (freeze_shallow σ v) = st_store σ /\
    st_dyn_prims (freeze_shallow σ v) = st_dyn_prims σ.
  Proof.
    destruct v; simpl.
    - split; reflexivity.
    - split.
      + unfold freeze_shallow. simpl. apply mark_frozen_preserves_store.
      + unfold freeze_shallow. simpl. apply mark_frozen_preserves_dyn.
    - split; reflexivity.
  Qed.

  Lemma freeze_deep_preserves_graph fuel σ v :
    st_store (freeze_deep fuel σ v) = st_store σ /\
    st_dyn_prims (freeze_deep fuel σ v) = st_dyn_prims σ.
  Proof.
    revert σ v.
    induction fuel as [|fuel IH]; intros σ v; simpl; [split; reflexivity|].
    destruct v; try (split; reflexivity).
    remember (mark_frozen σ l) as σ1 eqn:Hσ1.
    assert (Hmark :
      st_store σ1 = st_store σ /\
      st_dyn_prims σ1 = st_dyn_prims σ).
    { subst σ1. split; [apply mark_frozen_preserves_store|apply mark_frozen_preserves_dyn]. }
    destruct (lookup_obj σ1 l) as [obj|] eqn:Hobj; [|exact Hmark].
    assert (Hfold : forall flds σ0,
      st_store (fold_left (fun σacc (kv : string * val) => freeze_deep fuel σacc (snd kv)) flds σ0) =
        st_store σ0 /\
      st_dyn_prims (fold_left (fun σacc (kv : string * val) => freeze_deep fuel σacc (snd kv)) flds σ0) =
        st_dyn_prims σ0).
    {
      intros flds.
      induction flds as [|[k w] rest IHrest]; intros σ0; simpl.
      - split; reflexivity.
      - destruct (IH σ0 w) as [Hstore0 Hdyn0].
        rewrite <- Hstore0, <- Hdyn0.
        apply IHrest.
    }
    destruct (Hfold (obj_fields obj) σ1) as [Hstore Hdyn].
    rewrite Hstore.
    rewrite Hdyn.
    exact Hmark.
  Qed.

  Lemma apply_prim_connectivity p :
    primitive_connectivity_ok apply_prim p.
  Proof.
    intros σ args e' σ' r Happ Hreach.
    destruct p as [name|pid|pid]; unfold apply_prim in Happ.
    - unfold eval_builtin_prim in Happ.
      destruct name.
      + destruct args as [|a args']; simpl in Happ.
        { inversion Happ; subst; clear Happ. contradiction. }
        destruct args' as [|b rest]; simpl in Happ.
        2:{ inversion Happ; subst; clear Happ. contradiction. }
        * inversion Happ; subst; clear Happ.
          destruct (freeze_shallow_preserves_graph σ a) as [Hstore Hdyn].
          left. exists a. split; [left; reflexivity|].
          eapply val_reaches_same_graph; eauto.
      + destruct args as [|a args']; simpl in Happ.
        { inversion Happ; subst; clear Happ. contradiction. }
        destruct args' as [|b rest]; simpl in Happ.
        2:{ inversion Happ; subst; clear Happ. contradiction. }
        * inversion Happ; subst; clear Happ.
          destruct (freeze_deep_preserves_graph 20 σ a) as [Hstore Hdyn].
          left. exists a. split; [left; reflexivity|].
          eapply val_reaches_same_graph; eauto.
      + destruct args as [|a args']; simpl in Happ.
        { inversion Happ; subst; clear Happ. contradiction. }
        destruct args' as [|b rest]; simpl in Happ.
        2:{ inversion Happ; subst; clear Happ. contradiction. }
        destruct (match a with
                  | VLit (LJson (JBool true)) => true
                  | _ => false
                  end) eqn:Htruth.
        * inversion Happ; subst; clear Happ.
          destruct r; cbn [val_reaches cref_of_val] in Hreach; contradiction.
        * inversion Happ; subst; clear Happ. contradiction.
      + destruct args as [|a args']; simpl in Happ.
        { inversion Happ; subst; clear Happ. contradiction. }
        destruct args' as [|b rest]; simpl in Happ.
        2:{ inversion Happ; subst; clear Happ. contradiction. }
        change ((if hardenedb 20 σ a then (CoreVal a, σ) else (CoreBzzt, σ)) =
                  (e', σ')) in Happ.
        destruct (hardenedb 20 σ a) eqn:Hhard.
        * cbn in Happ.
          inversion Happ; subst; clear Happ.
          left. exists a. split; [left; reflexivity|exact Hreach].
        * inversion Happ; subst; clear Happ. contradiction.
      + inversion Happ; subst; clear Happ. exfalso. cbn in Hreach. exact Hreach.
    - destruct (lookup_nat_assoc pid (st_dyn_prims σ)) as [[cell delta]|] eqn:Hdyn.
      + destruct args as [|a rest]; simpl in Happ.
        * destruct (lookup_cell σ cell) as [n|] eqn:Hcell.
          -- change
               ((CoreVal (VLit (LJson (JNum (n + delta)))),
                 store_cell σ cell (n + delta)) = (e', σ')) in Happ.
             inversion Happ; subst; clear Happ.
             destruct r; cbn [val_reaches cref_of_val] in Hreach; contradiction.
          -- change ((CoreBzzt, σ) = (e', σ')) in Happ.
             destruct e'; simpl in Happ; try discriminate.
             inversion Happ; subst; clear Happ.
             contradiction.
        * change ((CoreBzzt, σ) = (e', σ')) in Happ.
          destruct e'; simpl in Happ; try discriminate.
          inversion Happ; subst; clear Happ.
          contradiction.
      + change ((CoreBzzt, σ) = (e', σ')) in Happ.
        destruct e'; simpl in Happ; try discriminate.
        inversion Happ; subst; clear Happ.
        contradiction.
    - change ((CoreBzzt, σ) = (e', σ')) in Happ.
      destruct e'; simpl in Happ; try discriminate.
      inversion Happ; subst; clear Happ.
      contradiction.
  Qed.

  Definition apply_prim_connected : connected_prim_handler :=
    {| run_prim := apply_prim;
       run_prim_connected := apply_prim_connectivity |}.
End JessieConnectivity.
