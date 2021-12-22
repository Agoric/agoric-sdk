------------------------------------ MODULE userspace -----------------------------
(*
  The model of the userspace VAT interactions via Agoric SwingSet kernel.
  (https://github.com/Agoric/agoric-sdk/tree/master/packages/SwingSet/src/kernel)

  This is the main model file, which is complemented by:
    - typedefs.tla (defines types and auxiliary operators)

  The model has been constructed in the scope of audit & verification services
  provided by Informal Systems (https://informal.systems)
  to Agoric (https://agoric.com).

  In case of any questions please feel free to contact
    - Daniel Tisdall <daniel@informal.systems>
    - Andrey Kuprianov <andrey@informal.systems>

  v.1.1
  20.12.2021
*)

\* EXTENDS Apalache, Integers, FiniteSets, Sequences, TLC, typedefs
EXTENDS Integers, FiniteSets, Sequences, TLC, tlcFolds, typedefs

\* VATS == {"vt0", "vt1", "vt2"}
VATS == {"vt0", "vt1"}
\* Perms == Permutations(VATS)
NUM_SLITS == 5

\* POSSIBLE_INIT_WATCHER_SETS == {{"vt0", "vt1", "vt2"}, {"vt0", "vt1"}, {"vt0", "vt2"}, {"vt2", "vt1"}, {"vt0"}, {"vt1"}, {"vt2"}}
POSSIBLE_INIT_WATCHER_SETS == {{"vt0", "vt1"}, {"vt0"}, {"vt1"}}

_transferControl == "transferControl"
_sendItem == "sendItem"
_dropItem == "dropItem"
_storeSelfRef == "storeSelfRef"
_storePromise == "storePromise"
_resolve == "resolve"

VARIABLES 
    \* @type: Int;
    step_cnt,
    \* @type: Str;
    step,
    \* @type: Int;
    resolve_target,
    \* @type: VAT;
    curr,
    \* @type: BANK;
    bank,
    \* @type: Int;
    cnt_promise

\* @type: () => SLIT;
BlankSlit == [type |-> "blank", promiseId |-> 0, watchers |-> {}, creator |-> "None"]

\* @type: (SLIT, VAT) => SLIT;
SlitPlusWatcher(slit, v) == [slit EXCEPT !.watchers = @ \cup {v}] 

\* @type: (SLIT, VAT) => SLIT;
SlitLessWatcher(slit, v) == IF slit.watchers = {v} 
                            THEN BlankSlit
                            ELSE [slit EXCEPT !.watchers = @ \ {v}] 

\* @type: (VAT) => SLIT;
SlitWithVatRef(v) == [type |-> "vat", promiseId |-> 0, watchers |-> {v}, creator |-> v] 

\* @type: (VAT, Int) => SLIT;
SlitWithPromise(v, promiseId) == [type |-> "promise", promiseId |-> promiseId, watchers |-> {v}, creator |-> v] 

\* @type: (VAT, Int) => SLIT;
SlitWithResolver(v, promiseId) == [type |-> "resolver", promiseId |-> promiseId, watchers |-> {v}, creator |-> v] 

\* @type: (BANK, VAT, VAT) => Bool;
ASeesB(bank_, a, b) == 
    \E i \in DOMAIN bank_:
    /\ bank_[i].type = "vat"
    /\ bank_[i].creator = b
    /\ a \in bank_[i].watchers

\* @type: (BANK, Int) => Int;
PromiseIxOrNeg1(bank_, promiseId) ==
    LET
        \* @type: (Int, Int) => Int; 
        Combine(i, j) == 
            IF /\ bank_[j].type = "promise"
               /\ bank_[j].promiseId = promiseId
            THEN j
            ELSE i
    IN FoldSet(Combine, (0-1), DOMAIN bank_) 

\* @type: (VAT) => Set(Int);
SlitsWatchedBy(v) == {i \in DOMAIN bank : v \in bank[i].watchers}

\* @type: () => Set(Int);
BlankSlits == {i \in DOMAIN bank : bank[i].type = "blank"}

\* Useful for debugging
BlankBank == [i \in (0..(NUM_SLITS-1)) |-> BlankSlit]

ConnectedVatBanks == 
    LET 
        PossibleSlits == {BlankSlit} \cup 
        [
        type : {"vat"},
        promiseId : {0},
        watchers : POSSIBLE_INIT_WATCHER_SETS,
        creator : VATS
        ]
    IN [1..NUM_SLITS -> PossibleSlits]

Init ==
    /\ step_cnt = 0
    /\ step = "init"
    \* /\ bank = BlankBank
    /\ bank \in ConnectedVatBanks
    /\ curr \in VATS
    /\ cnt_promise = 0
    /\ resolve_target = 0

TransferControlStep == 
    /\ UNCHANGED <<bank, cnt_promise, resolve_target>>
    /\ step' = _transferControl
    /\ curr' \in VATS \ {curr}

SendItemStep ==
    LET
        SendItemAction(i, otherVat) ==
            /\ UNCHANGED <<curr, cnt_promise, resolve_target>>
            /\ step' = _sendItem
            /\ bank' = [bank EXCEPT ![i] = SlitPlusWatcher(@, otherVat)]
    IN
    \E i \in SlitsWatchedBy(curr):
    \E otherVat \in VATS \ bank[i].watchers:
    /\ ASeesB(bank, curr, otherVat)
    /\ SendItemAction(i, otherVat)

StoreSelfRefStep ==
    \E i \in BlankSlits :
    /\ UNCHANGED <<curr, cnt_promise, resolve_target>>
    /\ step' = _storeSelfRef
    /\ bank' = [bank EXCEPT ![i] = SlitWithVatRef(curr)]

StorePromiseStep == 
    LET
        StorePromiseAction(i, j, promiseId) ==
        LET 
            Mapped(k) ==
            CASE k = i -> SlitWithPromise(curr, promiseId)
            []   k = j -> SlitWithResolver(curr, promiseId)
            []   OTHER -> bank[k]
        IN 
        /\ UNCHANGED <<curr,resolve_target>>
        /\ step' = _storePromise
        /\ cnt_promise' = cnt_promise + 1
        /\ bank' = [k \in DOMAIN bank |-> Mapped(k)]
    IN
    \E i, j \in BlankSlits :
    /\ i # j 
    /\ StorePromiseAction(i, j, cnt_promise')

ResolveStep == 
    LET
        \* @type: (Int, Int, Int) => Bool;
        ResolvePromisePre(resolverIx, promiseIx, resolveItemIx) ==
            /\ bank[resolverIx].type = "resolver"
            /\ promiseIx # -1
            \* Don't resolve promise itself (banned by JS)
            /\ resolveItemIx # promiseIx
            \* Cannot resolve a promise to another promise object (banned by JS)
            /\ bank[resolveItemIx].type # "promise"
        ResolvePromiseAction(resolverIx, promiseIx, resolveItemIx) == 
        LET
            Mapped(k) ==
            CASE k = promiseIx        -> BlankSlit
            []   k = resolverIx       -> BlankSlit
            []   k = resolveItemIx -> [
                                        bank[resolveItemIx]
                                        EXCEPT
                                        !.watchers = @ \cup bank[promiseIx].watchers
                                    ]
            []   OTHER                -> bank[k]
        IN
        /\ UNCHANGED <<curr, cnt_promise>>
        /\ bank' = [k \in DOMAIN bank |-> Mapped(k)]
        /\ resolve_target' = resolveItemIx
        /\ step' = _resolve
    IN
    LET
        ResolvePromiseInner(resolverIx, resolveItemIx) ==
            LET 
                \* @type: () => Int;
                PromiseIx == PromiseIxOrNeg1(bank, bank[resolverIx].promiseId)
            IN
            /\ ResolvePromisePre(resolverIx, PromiseIx, resolveItemIx)
            /\ ResolvePromiseAction(resolverIx, PromiseIx, resolveItemIx)
    IN
    \E resolverIx, resolveItemIx \in SlitsWatchedBy(curr) :
    ResolvePromiseInner(resolverIx, resolveItemIx)
    
Next == 
    \* Util purposes only
    /\ step_cnt' = step_cnt + 1
    /\
        \/ SendItemStep
        \/ StoreSelfRefStep 
        \/ StorePromiseStep
        \/ ResolveStep
        \/ TransferControlStep

Inv == 
    /\ TRUE
    /\ step_cnt < 14

===============================================================================
