(* Shared runtime/library helpers used by Justin and Jessie surface execution. *)
From Coq Require Import List String.
Require Import jessie_lang.

Import ListNotations.
Open Scope string_scope.

Module JessieLib.
  Import Justin.

  Definition builtin_prim_names : list (string * prim_name) :=
    [ ("freeze", PrimFreeze);
      ("harden", PrimHarden);
      ("assert", PrimAssert);
      ("id", PrimId);
      ("fail", PrimFail) ].

  Definition prim_name_eqb (p1 p2 : prim_name) : bool :=
    match p1, p2 with
    | PrimFreeze, PrimFreeze
    | PrimHarden, PrimHarden
    | PrimAssert, PrimAssert
    | PrimId, PrimId
    | PrimFail, PrimFail => true
    | _, _ => false
    end.

  Fixpoint lookup_assoc {A : Type} (x : string) (xs : list (string * A)) : option A :=
    match xs with
    | [] => None
    | (y, a) :: xs' => if String.eqb x y then Some a else lookup_assoc x xs'
    end.

  Fixpoint lookup_field {A : Type} (flds : list (string * A)) (k : string) : option A :=
    match flds with
    | [] => None
    | (k', v) :: rest => if String.eqb k k' then Some v else lookup_field rest k
    end.

  Definition mark_frozen
      {state loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (σ : state) (l : loc) : state :=
    if existsb (eqb l) (get_frozen σ) then σ
    else set_frozen (l :: get_frozen σ) σ.

  Definition freeze_shallow
      {state value loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (as_loc : value -> option loc)
      (σ : state) (v : value) : state :=
    match as_loc v with
    | Some l => mark_frozen eqb get_frozen set_frozen σ l
    | None => σ
    end.

  Fixpoint freeze_deep
      {state value obj loc : Type}
      (eqb : loc -> loc -> bool)
      (get_frozen : state -> list loc)
      (set_frozen : list loc -> state -> state)
      (as_loc : value -> option loc)
      (lookup_obj : state -> loc -> option obj)
      (obj_fields : obj -> list (string * value))
      (fuel : nat) (σ : state) (v : value) : state :=
    match fuel with
    | O => σ
    | S fuel' =>
        match as_loc v with
        | Some l =>
            let σ1 := mark_frozen eqb get_frozen set_frozen σ l in
            match lookup_obj σ1 l with
            | Some obj =>
                fold_left (fun σacc kv =>
                  freeze_deep eqb get_frozen set_frozen as_loc lookup_obj obj_fields fuel' σacc (snd kv))
                  (obj_fields obj) σ1
            | None => σ1
            end
        | None => σ
        end
    end.

  Definition eval_builtin_prim
      {value state result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (p : prim_name) (σ : state) (args : list value) : result :=
    match p with
    | PrimAssert =>
        match args with
        | [v] => if truthy_true v then ok undefined σ else bad σ
        | _ => bad σ
        end
    | PrimId =>
        match args with
        | [v] =>
            if hardenedb 20%nat σ v then ok v σ else bad σ
        | _ => bad σ
        end
    | PrimFail => bad σ
    | PrimFreeze =>
        match args with
        | [v] => ok v (freeze_shallow σ v)
        | _ => bad σ
        end
    | PrimHarden =>
        match args with
        | [v] => ok v (freeze_deep 20%nat σ v)
        | _ => bad σ
        end
    end.

  Definition conservative_builtin
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop)
      (name : prim_name) : Prop :=
    forall σ args root σ' a,
      eval_builtin_prim
        undefined
        freeze_shallow
        freeze_deep
        hardenedb
        truthy_true
        ok
        bad
        name σ args = ok root σ' ->
      reaches σ' root a ->
      exists arg, In arg args /\ reaches σ arg a.

  Lemma builtin_assert_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    (forall σ a, reaches σ undefined a -> False) ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      PrimAssert.
  Proof.
    intros Hok Hbad Hundef σ args root σ' a Happ Hreach.
    unfold conservative_builtin in *.
    unfold eval_builtin_prim in Happ.
    destruct args as [|v args']; simpl in Happ.
    - exfalso. eapply Hbad. exact Happ.
    - destruct args' as [|w rest]; simpl in Happ.
      + destruct (truthy_true v) eqn:Htruth.
        * destruct (Hok _ _ _ _ Happ) as [<- <-].
          exfalso. exact (Hundef σ a Hreach).
        * exfalso. eapply Hbad. exact Happ.
      + exfalso. eapply Hbad. exact Happ.
  Qed.

  Lemma builtin_id_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      PrimId.
  Proof.
    intros Hok Hbad σ args root σ' a Happ Hreach.
    unfold conservative_builtin in *.
    unfold eval_builtin_prim in Happ.
    destruct args as [|v args']; simpl in Happ.
    - exfalso. eapply Hbad. exact Happ.
    - destruct args' as [|w rest]; simpl in Happ.
      + destruct (hardenedb 20%nat σ v) eqn:Hhard.
        * destruct (Hok _ _ _ _ Happ) as [<- <-].
          exists v. split; [left; reflexivity|exact Hreach].
        * exfalso. eapply Hbad. exact Happ.
      + exfalso. eapply Hbad. exact Happ.
  Qed.

  Lemma builtin_fail_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      PrimFail.
  Proof.
    intros _ Hbad σ args root σ' a Happ _.
    unfold conservative_builtin in *.
    unfold eval_builtin_prim in Happ.
    exfalso. eapply Hbad. exact Happ.
  Qed.

  Lemma builtin_freeze_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    (forall σ v a, reaches (freeze_shallow σ v) v a -> reaches σ v a) ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      PrimFreeze.
  Proof.
    intros Hok Hbad Hpres σ args root σ' a Happ Hreach.
    unfold conservative_builtin in *.
    unfold eval_builtin_prim in Happ.
    destruct args as [|v args']; simpl in Happ.
    - exfalso. eapply Hbad. exact Happ.
    - destruct args' as [|w rest]; simpl in Happ.
      + destruct (Hok _ _ _ _ Happ) as [<- <-].
        exists v. split; [left; reflexivity|].
        eapply Hpres; eauto.
      + exfalso. eapply Hbad. exact Happ.
  Qed.

  Lemma builtin_harden_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    (forall σ v a, reaches (freeze_deep 20%nat σ v) v a -> reaches σ v a) ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      PrimHarden.
  Proof.
    intros Hok Hbad Hpres σ args root σ' a Happ Hreach.
    unfold conservative_builtin in *.
    unfold eval_builtin_prim in Happ.
    destruct args as [|v args']; simpl in Happ.
    - exfalso. eapply Hbad. exact Happ.
    - destruct args' as [|w rest]; simpl in Happ.
      + destruct (Hok _ _ _ _ Happ) as [<- <-].
        exists v. split; [left; reflexivity|].
        eapply Hpres; eauto.
      + exfalso. eapply Hbad. exact Happ.
  Qed.

  Theorem builtin_conservative
      {value state auth result : Type}
      (undefined : value)
      (freeze_shallow : state -> value -> state)
      (freeze_deep : nat -> state -> value -> state)
      (hardenedb : nat -> state -> value -> bool)
      (truthy_true : value -> bool)
      (ok : value -> state -> result)
      (bad : state -> result)
      (reaches : state -> value -> auth -> Prop)
      (name : prim_name) :
    (forall v σ v' σ', ok v σ = ok v' σ' -> v = v' /\ σ = σ') ->
    (forall σ v σ', bad σ <> ok v σ') ->
    (forall σ a, reaches σ undefined a -> False) ->
    (forall σ v a, reaches (freeze_shallow σ v) v a -> reaches σ v a) ->
    (forall σ v a, reaches (freeze_deep 20%nat σ v) v a -> reaches σ v a) ->
    conservative_builtin
      undefined
      freeze_shallow
      freeze_deep
      hardenedb
      truthy_true
      ok
      bad
      reaches
      name.
  Proof.
    intros Hok Hbad Hundef Hshallow Hdeep.
    destruct name.
    - apply builtin_freeze_conservative; assumption.
    - apply builtin_harden_conservative; assumption.
    - apply builtin_assert_conservative; assumption.
    - apply builtin_id_conservative; assumption.
    - apply builtin_fail_conservative; assumption.
  Qed.
End JessieLib.
