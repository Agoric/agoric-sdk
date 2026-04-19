# Jessie In Iris

This file is the working design and status note for the Jessie/Justin/Iris mechanization in this repository.

The motivation is to model capability separation properties of escrow-style code in a logic that fits them well: Iris is a good match for "if you don't have the reference, you can't invoke it", for separation-of-duties examples such as `makeCounter`, and for the async/concurrency structure that matters for escrow reasoning.

The repository currently contains checked Coq artifacts for:

- a Justin-style core language with explicit values, expressions, and machine state
- an executable small-step evaluator
- an Iris `ectxi_language` / `language` instance for that core
- a small Jessie surface layer for the `makeCounter` case study
- trace, reachability, and connectivity lemmas for capability separation

This document records what is modeled, what is proved, and what remains to bridge the operational facts to a public-client Iris theorem.

## External References

- Agoric SDK PR `#8184` ("SPIKE: toward correct-by-construction Zoe2 escrow"): <https://github.com/Agoric/agoric-sdk/pull/8184>
- PR `#8184` Iris motivation comment: <https://github.com/Agoric/agoric-sdk/pull/8184#issuecomment-4275585411>
- Jessica grammars: <https://github.com/agoric-labs/jessica#grammar>
- Jessie repository: <https://github.com/endojs/Jessie>
- Iris language interface: <https://plv.mpi-sws.org/coqdoc/iris/iris.program_logic.language.html>
- Iris evaluation-context helper: <https://plv.mpi-sws.org/coqdoc/iris/iris.program_logic.ectx_language.html>
- Iris `ectxi_language`: <https://plv.mpi-sws.org/coqdoc/iris/iris.program_logic.ectxi_language.html>
- Iris HeapLang example: <https://plv.mpi-sws.org/coqdoc/iris/iris.heap_lang.lang.html>
- Blockly fixture test data: <https://github.com/endojs/Jessie/blob/3ce32c97b6d326db2a1b400827c740336eefa786/packages/blockly-tools/test/test-data.json>
- Jessie Blockly fixture context: <https://github.com/endojs/Jessie/pull/127>

## Repository Map

Start from:

- `jessie_justin.v`
- `jessie_iris_lang.v`
- `jessie_counter_spec.v`

Per-file descriptions live as one-line comments at the top of the Coq files.

## Dev Tools

`iris.mk` is the local bootstrap/build helper for the Coq development toolchain. It covers the opam switch, Coq/Iris installation, the language server, and incremental `coqdep`-based builds. For the exact workflow and commands, use `make -f iris.mk help`.

### Commit Discipline

Use git commit messages as the running lab notebook. Keep this file for the comparatively stable design summary, checked results, and next-proof-milestone framing.

Commit whenever there is a coherent thought worth preserving, whether that thought is:

- a working increment
- a clarified invariant
- a proof decomposition
- a concrete reason to backtrack

Successful proof steps and failed-but-informative proof attempts should both leave commit-message breadcrumbs.

## Current Semantic Shape

### Layering

The development follows the Jessica-inspired layering:

1. JSON-like literal data
2. Justin core expressions
3. Jessie surface/module structure
4. Iris embedding of the Justin core

But the implementation is intentionally narrower than full JavaScript.

### Justin Core

The Justin core in `jessie_justin.v` is call-by-value and left-to-right. The important forms are:

- literal values
- variables
- object allocation
- property access
- application
- let-binding
- `typeof`
- conditionals
- resolved binary operators
- explicit weird termination via `CoreBzzt`

There are no lambda literals in the shared Justin layer. Functions appear only as primitive references:

- builtin primitives such as `freeze`, `harden`, `assert`, `id`, `fail`
- dynamic primitives allocated by the case study
- external primitive references when needed

### Values And State

The core uses explicit machine state:

- `st_store`: immutable object store keyed by locations
- `st_frozen`: set of frozen locations
- `st_env`: environment for variables and endowed builtins
- `st_cells`: private mutable cells used by the case study
- `st_dyn_prims`: dynamic primitive table

Object identity is therefore modeled by locations, not by structural equality. This is necessary for `===`-style reasoning about object identity.

### Hardenedness

The hardenedness model is explicit:

- primitive literals are hardened by default
- primitive references are hardened by construction
- allocated objects are not automatically hardened
- `freeze` is shallow
- `harden` is deep
- `id` accepts only hardened arguments and otherwise steps to `CoreBzzt`

The names match the semantics.

### `typeof null`

The semantics return `"object"` for `typeof null`, matching the expected JavaScript/Jessie behavior. This has regression coverage in the executable and Iris-facing layers.

### BigInt

The value space includes `VBigInt`, refinement/classification includes `TyBigInt`, and the concrete Justin parser accepts literals such as `9898n`.

## Iris Embedding

`jessie_iris_lang.v` defines:

- `expr := core_expr`
- `val := Justin.val`
- `state := JustinExec.state`
- `of_val`
- `to_val`
- explicit evaluation-context items
- `fill_item`
- relational `base_step`

This is a checked Iris-facing language layer.

The Iris mixin fixes two semantic points:

- non-primitive application goes weird only after all arguments are values
- binary operator type errors go weird only after both operands are values

Weird halting is represented as the explicit terminal expression `CoreBzzt`. It is observable and operationally explicit; it is not reified as a value.

## Current Checked Results

### Core Operational Regressions

The executable Justin layer has concrete regressions for:

- shallow `freeze` versus deep `harden`
- hardened nested objects accepted by `id`
- unhardened objects rejected by `id`
- `typeof null === "object"`
- bigint parsing/classification

Representative identifiers include:

- `freeze_shallow_marks_only_root`
- `harden_deep_marks_reachable_objects`
- `id_accepts_hardened_nested_object`
- `id_rejects_unhardened_object`

### `makeCounter` Behavior

The repository contains a concrete `makeCounter` case study in which an endowed primitive allocates:

- a private mutable counter cell
- a returned hardened object
- dynamic method primitives for `incr` and `decr`

The canonical regression

```js
const counter = makeCounter();
counter.incr();
const n = counter.incr();
assert(n === 2);
```

is proved by computation in the operational model.

Key identifiers:

- `makeCounter_assert_works`
- `makeCounter_final_cell_is_two`

These show that the modeled program normalizes to `undefined` through the modeled `assert`, and that the final hidden counter cell contains `2`.

### Trace-Level Authority Separation

The main authority results live in `jessie_counter_spec.v`. They are white-box trace theorems over capability objects produced from a fresh counter.

Entry side:

- `invoke_entry_cap_trace_exact`
- `entry_cap_trace_monotone`
- `entry_cap_trace_fields_are_incr`
- `entry_cap_hides_decr`
- `entry_cap_two_calls_reach_two`

Exit side:

- `invoke_exit_cap_trace_exact`
- `exit_cap_trace_monotone`
- `exit_cap_trace_fields_are_decr`
- `exit_cap_hides_incr`
- `exit_cap_two_calls_reach_minus_two`

Informally, these say:

- an entry capability supports only increment authority
- an exit capability supports only decrement authority
- any successful trace through the entry capability increases the hidden count by the trace length
- any successful trace through the exit capability decreases the hidden count by the trace length

This is a mechanized authority-separation result. It is stronger than a few example tests and weaker than a full public-client contextual theorem in Iris.

### Reachability Layer

`jessie_counter_reach.v` isolates dynamic-authority reachability from a root capability.

Key identifiers:

- `reaches_val`
- `reaches_dyn`
- `entry_cap_reaches_only_entry_dyn`
- `exit_cap_reaches_only_exit_dyn`
- `entry_cap_root_reaches_only_incr`
- `exit_cap_root_reaches_only_decr`

This layer says which dynamic primitive references are reachable from the visible object graph. It is the right intermediate fact for later contextual reasoning.

### Connectivity Layer

`jessie_connectivity.v` recasts the case study in a small reference graph:

- `cref`
- `edge`
- `reachable`
- `old_or_fresh`
- `primitive_connectivity_ok`

The checked examples there show that the object returned by `makeCounter` reaches exactly the fresh references it should, and that the primitive calls satisfy the intended "old or fresh" connectivity discipline.

### Step-Connectivity Infrastructure

`jessie_step_connectivity.v` contains the machinery for the generic one-step theorem.

Important pieces:

- `closed_val`, `closed_expr`, `closed_exprs`, `closed_fields`, `closed_state`
- `expr_reaches_dyn`, `exprs_reach_dyn`, `fields_reach_dyn`
- `step_frame`
- `lookup_obj_alloc_obj_other`
- `reaches_dyn_old_after_alloc`
- `alloc_result_dyn_from_fields`

Constructor-specific frame lemmas include:

- `step_with_var_frame`
- `step_with_eqstrict_vals_frame`
- `step_with_addnum_vals_frame`
- `step_with_concatstr_vals_frame`

The remaining gap in this file is a single closed-form theorem that packages these into a generic one-step preservation result for reachable dynamic authority.

### Iris-Facing Atomic Facts

`jessie_counter_iris.v` proves a smaller but genuine Iris-language result: atomic `base_step` facts for split capabilities.

Key identifiers:

- `entry_cap_get_incr_atomic`
- `entry_cap_get_decr_missing_atomic`
- `entry_cap_call_incr_atomic`
- `exit_cap_get_incr_missing_atomic`
- `exit_cap_call_decr_atomic`

These facts establish that:

- the entry capability exposes `incr`
- the entry capability does not expose `decr`
- calling the entry primitive increments the hidden cell in one atomic base step
- the exit capability does not expose `incr`
- calling the exit primitive decrements the hidden cell in one atomic base step

This Iris result is operational and precise. It is not a weakest-precondition proof that arbitrary public clients cannot violate the monotonicity property.

### Surface Syntax Connection

The repository also connects the concrete `makeCounter` source text to the core semantics.

The surface connection includes:

- parsing the surface example in Coq
- compiling it to the intended core term
- executing that core term and proving the expected result

The Justin parser is intentionally narrower than the Jessie surface layer. In particular, these regressions are explicit:

- `parse_justin "() => undefined" = None`
- `parse_justin "count += 1" = None`

`makeCounter` is modeled in the Jessie surface/case-study layer and compiles to the core rather than being treated as a plain Justin program.

## Public Client Boundary

`jessie_public.v` is the intended client boundary.

`JessiePublic.expr` can compile only to core terms built from:

- literals
- variables
- object construction
- property access
- application
- let-binding
- `typeof`
- conditionals
- binary operators

It cannot directly construct:

- raw locations
- primitive references
- dynamic primitive references
- external primitive references

That matters because the public interface does not permit forgeable authority constructors. The remaining proof obligation is semantic rather than syntactic: show that evaluation of public client code cannot manufacture new authority except through the intended connectivity discipline.

## What Is Not Proved Yet

The main missing theorem is the public-client bridge:

- if a client is expressed in `JessiePublic.expr`
- and it is evaluated from the entry-capability state
- then any dynamic authority reachable after evaluation is increment-only

and symmetrically for the exit-capability state.

This is the theorem that would justify the intended informal claim:

- no matter what an `entryGuard` client does, the counter can only go up
- no matter what an `exitGuard` client does, the counter can only go down

The development contains the ingredients for that theorem, but not the theorem itself.

## Proof-Script Boundary

The main proof obstacle is proof-script brittleness around the local fixpoints inside `step_with`:

- the object case uses a local `step_fields`
- the application case uses a local `step_args`

These do not line up cleanly with separately stated helper lemmas by conversion, and a large mutual proof over them becomes noisy and fragile.

The practical proof strategy is to continue with smaller constructor-specific lemmas and explicit unfolding/equivalence lemmas, then assemble the public-step theorem from those pieces.

## Recommended Next Steps

The next proof work should proceed in this order:

1. Finish constructor-specific `step_with_*_frame` lemmas until the remaining evaluator forms are covered.
2. Package those lemmas into a generic one-step theorem phrased in terms of reachable dynamic authority, not full-state equality.
3. Prove the closure bridge from `JessiePublic.compile e` into the `closed_*` predicates.
4. Lift the one-step theorem to a multi-step public-client corollary.
5. Only after that, decide whether a full Iris `WP` theorem is worth stating immediately or whether the public multi-step theorem should be treated as the stable intermediate milestone.

## Design Constraints That Should Remain Stable

The following choices are part of the modeled design and should not be casually reopened:

- Justin remains closure-free in the shared parser/core surface
- object identity is location-based, not structural
- weird halting is explicit as `CoreBzzt`
- `freeze` is shallow and `harden` is deep
- `typeof null` is `"object"`
- the public client boundary cannot forge locations or primitive references

If any of these are changed later, the change should come with a concrete distinguishing regression and a proof-impact note.

## Short Summary

This repository has:

- an executable Justin semantics
- a checked Iris language instance
- a parsed and executable Jessie `makeCounter` case study
- trace-level authority separation theorems
- reachability and connectivity infrastructure
- atomic Iris-facing step facts for split capabilities

The missing piece is the final theorem connecting those pieces to arbitrary public client contexts. That bridge, centered on `JessiePublic.expr` and the step-connectivity infrastructure, is the next substantive milestone.
