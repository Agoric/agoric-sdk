# Jessie In Iris

HackMD-style slide notes for the Jessie / OCPL / Iris work in this directory.

---

## The Problem

```js
const makeCounter = () => {
  let count = 0;
  return harden({
    incr: () => (count += 1),
    decr: () => (count -= 1),
  });
};
```

- Goal: state and prove a separation-of-duties claim for this
  Jessie-flavored `makeCounter` example.
- `makeCounter()` returns two methods closing over one hidden cell.
- The security question is about separation of duties: can one method be handed
  out without also handing out the other?
- This note is part of a spike on correct-by-construction Zoe2 Escrow:
  <https://github.com/Agoric/agoric-sdk/pull/8184>

> Speaker notes:
> The opening should stay at the ocap level. The proof technology can wait
> until the audience has the example and the claim in view.

---

## Separation Of Duties

```js
const c = makeCounter();
const cUp = { incr: c.incr };
attacker(cUp);
assert(c.incr() > 0);
```

- `c` is the original counter object.
- `cUp` is the restricted capability object used to separate upward authority
  from downward authority.
- Main claim: after any allowed attacker code runs on `cUp`, a direct call to
  the original `c.incr()` still returns a positive number.
- Put differently: the final assertion should still succeed even after linking
  the verified client with attacker-controlled code.

> Speaker notes:
> This is the presentation-level theorem. Internally, the proof route is about
> preserving absence of downward authority, but the user-facing conclusion is
> stated on `c.incr()`, not on hidden cells or graph predicates.

---

## What Must Be Shown

- The attacker can use the authority it was given.
- The attacker cannot synthesize `decr` authority from `cUp`.
- Therefore the hidden counter cell cannot be driven negative by attacker code
  that only received `cUp`.
- One more direct `c.incr()` call must then return something `> 0`.

---

## A Prior Formal Starting Point

- In their 2017 work, Swasey, Garg, and Dreyer reason about object capabilities
  using OCPL, a language and formalism built to prove robust safety properties.
- The key pattern is the one we need here:
  verified code linked against attacker-controlled code, with a safety
  property that should survive the linking.
- That makes OCPL the right prior starting point for this project.

Reference:
Swasey, Garg, Dreyer, "Robust and Compositional Verification of Object
Capability Patterns" (OOPSLA 2017).
<https://www.mpi-sws.org/~dreyer/papers/ocpl/paper.pdf>

Upstream Coq development in this repo:
`ocpl/upstream/theories/heap_lang/robust_safety.v`

---

## Iris As Proof Foundation

- Iris is a Coq framework for machine-checked proofs about stateful and
  concurrent programs.
- It is a good fit for reasoning about hidden references, higher-order
  functions, event-loop concurrency, and attacker-controlled linking.
- HeapLang is the small ML-like language that ships with Iris and is used for
  many Iris case studies, including ours.

Reference:
Krebbers, Jung, Bizjak, Jourdan, Dreyer, Birkedal,
"The Essence of Higher-Order Concurrent Separation Logic" (ESOP 2017).
<https://iris-project.org/pdfs/2017-esop-iris3-final.pdf>

---

## Adaptation Plan

- reuse the OCPL robust-safety pattern rather than inventing a new one
- port the relevant structure to modern Iris / HeapLang
- express the counter case study as an instance of that reused setup

---

## Two Layers In The Current Tree

1. A modernized OCPL / Iris layer
2. A direct HeapLang counter case study

> Speaker notes:
> Layer 1 provides the reusable OCPL-style reasoning setup.
> Layer 2 is the concrete HeapLang counter proof built on top of it.

---

## Layer 1: Modern OCPL In Iris

`ocpl/modern_robust_safety.v` ports that earlier OCPL robust-safety structure
onto modern Iris HeapLang.

It provides:

- attacker values and expressions
- attacker contexts with one hole where verified code and attacker code are
  linked together
- a semantic discipline saying attacker code stays within the allowed fragment
- the connection to the standard Iris reasoning rules for HeapLang programs

The reason this port is needed is version mismatch:

- the 2017 OCPL development was built against an older Iris and older HeapLang
- current Iris uses a different library and notation surface
- some constructs that used to be explicit syntax are now library-level code

The most important example for this project is `assert`:

- in the older setting, assertions could be treated as a dedicated AST form
- in modern HeapLang, `assert:` expands to application of a library value
- so the attacker filter has to exclude the library `assert` value rather than
  pattern-match on an `Assert` constructor

This porting work lives under:
`ocpl/modern_heap.v`, `ocpl/modern_lifting.v`, `ocpl/modern_on_val.v`,
`ocpl/modern_robust_safety.v`

---

## Layer 2: Direct HeapLang Counter Case Study

`jessie_counter_heaplang.v` encodes:

- `makeCounter`
- the restricted export `cUp`
- the checked client body
- the overshared negative-control client

This is the shortest path to the real Iris theorem, because it works directly
with HeapLang and standard Iris proof rules.

---

## Current Proof Status

What is in place:

- the modern OCPL attacker/context machinery
- direct HeapLang proofs for concrete attacker instances in
  `jessie_counter_heaplang.v`

What is still missing:

- the main "for every allowed attacker" theorem saying that giving the attacker
  only `cUp` still preserves the final `assert(c.incr() > 0)`

> Speaker notes:
> The hard part is no longer deciding what to prove. The hard part is proving
> the "for every allowed attacker" claim in the modern HeapLang setting, using
> the reused OCPL structure.

---

## Intended Endgame

- Treat the direct HeapLang counter proof as the concrete instance.
- Reuse the OCPL attacker/context layer as much as possible.
- Show that the counter proof can be packaged as a robust-safety result rather
  than as a one-off `makeCounter` proof.

This should leave us with a theorem that reads naturally to an ocap audience
while still being machine-checked in Iris/Coq.

---

## Future Work

- Return to the broader plan of formalizing Jessie in layers, not just the
  reduced counter core.
- JSON grammar reference:
  <https://github.com/agoric-labs/jessica/blob/master/lib/quasi-json.js.ts>
- Justin grammar reference:
  <https://github.com/agoric-labs/jessica/blob/master/lib/quasi-justin.js.ts>
- Jessie grammar reference:
  <https://github.com/agoric-labs/jessica/blob/master/lib/quasi-jessie.js.ts>
- The Blockly fixture snapshot used earlier remains a useful concrete syntax
  oracle:
  <https://github.com/endojs/Jessie/blob/3ce32c97b6d326db2a1b400827c740336eefa786/packages/blockly-tools/test/test-data.json>

---

## Dev Tools

`iris.mk` is the local bootstrap and incremental-build helper.

- toolchain bootstrap: Ubuntu packages, opam switch, Coq, Iris, HeapLang,
  `vsrocq-language-server`
- active build manifest comes from `_CoqProject`
- normal workflow entry point: `make -f iris.mk help`
- normal incremental build: `make -f iris.mk build SOURCES="..."`

> Speaker notes:
> The makefile is meant to be the operational source of truth. This slide is
> only the short orientation.

---

## Commit Discipline

Use git commit messages as the running lab notebook.

- This file is for the relatively stable argument and status summary.
- Commit whenever there is a coherent thought worth preserving.
- That includes:
  - working increments
  - clarified invariants
  - proof decompositions
  - informative backtracks

The point is to leave proof breadcrumbs in the history rather than turning this
note into an ever-growing scratchpad.

---

## Next Milestone

Prove the full "for every allowed attacker" theorem in the HeapLang/OCPL line:

- attacker receives only `cUp`
- attacker ranges over the allowed class of attacker contexts
- afterwards the checked client can still establish `c.incr() > 0`

That is the present "all contexts" target.
