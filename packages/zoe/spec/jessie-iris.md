# Prompt for LLM: Mechanize Jessie in Iris via Jessica Layering

## Role

You are a programming languages researcher and Coq/Iris practitioner. Your task is to design and partially mechanize a formal semantics for Jessie, grounded in the Jessica project’s layered grammars (JSON → Justin → Jessie), and embed it into the Iris framework.

Work incrementally and precisely. Prefer small, compositional definitions over ambitious but vague ones.

---

## Objective

Produce a coherent, staged definition of a language suitable for Iris proofs, following this structure:

1. JSON (values only)
2. Justin (pure expression language, **no function literals**)
3. Jessie (module + endowment layer)

Each stage should:

- define syntax (Coq inductives)
- define semantics (small-step, evaluation contexts)
- justify design choices briefly
- prepare for Iris `ectx_language`

---

## References

- **Jessica (JSON → Justin → Jessie grammars)**: [https://github.com/agoric-labs/jessica#grammar](https://github.com/agoric-labs/jessica#grammar)
- **Jessie (EndoJS repo / spec discussions)**: [https://github.com/endojs/Jessie](https://github.com/endojs/Jessie)
- **Iris **``** interface (Coqdoc)**: [https://plv.mpi-sws.org/coqdoc/iris/iris.program\_logic.language.html](https://plv.mpi-sws.org/coqdoc/iris/iris.program_logic.language.html)
- **Iris **``** helper (Coqdoc)**: [https://plv.mpi-sws.org/coqdoc/iris/iris.program\_logic.ectx\_language.html](https://plv.mpi-sws.org/coqdoc/iris/iris.program_logic.ectx_language.html)
- **HeapLang example language (Coqdoc)**: [https://plv.mpi-sws.org/coqdoc/iris/iris.heap\_lang.lang.html](https://plv.mpi-sws.org/coqdoc/iris/iris.heap_lang.lang.html)

---

## Grounding Constraints

- Use Jessica as the **syntax reference** (JSON → Justin → Jessie layering)
- Do NOT assume full JavaScript semantics
- Justin:
  - has **application**
  - has **no lambda/function literals**
  - functions come from **static scope / endowments**
- Keep semantics minimal but sound for reasoning

---

## Stage 1: JSON

Define:

- `jval` for JSON values
- `expr := Lit jval`
- `val := jval`

Then:

- define `of_val`, `to_val`
- define trivial `ectx_language` instance (no steps)

Explain briefly why JSON is a degenerate language in Iris.

---

## Stage 2: Core Justin

### Validation and Type Refinement (IMPORTANT)

Treat all variables and intermediate values as initially having an **unknown** type.

- Operations such as `+` MUST NOT perform implicit JavaScript-style coercions.
- Instead, require **explicit refinement** before such operations are allowed.

Model a refinement mechanism similar to TypeScript narrowing:

- introduce predicates like `IsString(e)`, `IsNumber(e)`
- conditionals refine the environment in branches

Example pattern to support:

Note: `typeof` is a **built-in expression operator**, not an endowment/primitive in `ρ`.

```js
typeof x === "string" ? x + "abc" : undefined
```

Semantically:

- the conditional expression establishes a refinement that `x` is a string on the true branch
- `+` is then elaborated to a **resolved operator** (e.g., `ConcatStr`) on that branch

Define a validation/elaboration judgment:

```coq
Γ ⊢ e ⇝ e_core
```

where:

- `Γ` tracks refined types (e.g., string, number, object, prim)
- `x + y` is only accepted if operands can be classified unambiguously
- otherwise validation fails (BZZT)

This avoids modeling JavaScript coercion semantics while preserving expressiveness via refinement.

---

### Syntax

Define:

- `val`:

  - JSON literals
  - opaque primitive/function values (e.g., `VPrim`)

- `expr`:

  - `Lit`
  - `Var`
  - `Obj`
  - `Get`
  - `App`
  - `LetIn`
  - `TypeOf`   (\* built-in operator \*)
  - `Cond`  (\* ternary: e0 ? e1 : e2 \*)

No lambdas.

### Environment

Define a static environment:

- `ρ : gmap string prim`

where `prim` includes (endowed functions only; excludes built-in operators like `typeof`):

- arity
- semantic step function
- possible failure / weird halting result
- possible effects, including allocation

Assume primitives are **not necessarily total**: they may be effectful, fallible, and may allocate.

However, require that primitives:

- only accept **hardened** arguments
- only return **hardened** values

### Definition: Hardened Values

Make "hardened" precise with a semantic predicate `Hardened(v)`.

Intuition (SES-style): values are deeply immutable only **after an explicit hardening/freeze operation**; mere allocation is not enough.

Define `Hardened(v)` using an explicit hardening state:

- Primitive data values are hardened by default:
  - numbers, booleans, strings, `null`, `undefined`
- Functions in Justin are only via `VPrim`; treat each `VPrim` as hardened by construction
- Objects/arrays are **not hardened merely because they are allocated**
- Instead, objects/arrays become hardened only after an explicit hardening operation (e.g. a modeled `Object.freeze`/`harden` primitive) marks the corresponding location as frozen
- A frozen object/array is `Hardened` iff:
  - its location is marked frozen in the store/state
  - no mutation operations are available on it
  - all reachable subvalues are `Hardened`
- No prototypes / dynamic property hooks are modeled; objects are plain records

Operational consequences:

- Allocation produces fresh locations, but freshly allocated objects are **not automatically hardened**
- Introduce an explicit primitive or semantic operation corresponding to `Object.freeze` / `harden`
- Hardening recursively freezes reachable object structure
- There is no mutation in Core Justin unless explicitly added later; however, explicit hardening still matters and must not be conflated with allocation
- Equality (`===`) on objects compares locations; hardenedness does not affect equality

Interface constraints:

- Primitive application requires `∀ args, Hardened(arg)`; otherwise evaluation halts with the distinguished weird outcome (or validation failure if statically detectable)
- Primitive results must satisfy `Hardened(result)`

Testing guidance:

- Add tests distinguishing freshly allocated vs explicitly hardened objects
- Add tests for recursive/deep hardening
- Add tests ensuring primitives reject non-hardened object arguments

If any of the above choices are too strong/weak, produce distinguishing tests (see “Handling Underspecified Design Choices”) and ask the user to confirm.

### Semantics

- Call-by-value
- Left-to-right evaluation contexts
- Model object identity faithfully (`===` / `!==`) by including an immutable store in `State` already at the Justin layer
- Primitive failure in Justin should **halt with a distinguished weird outcome**, not throw an exception and not become silently stuck

Define:

- `ectx_item`
- `fill_item`
- `base_step`

Include rules for:

- object construction
- field access
- let-binding
- conditional (ternary)
- `typeof` operator semantics
- **primitive application via endowment**
- primitive failure / weird-outcome behavior
- primitive allocation effects

### Design Requirements

- No closures
- Deterministic evaluation order
- Justin's `===` / `!==` on objects MUST be modeled faithfully; therefore use an **immutable store with abstract locations** rather than purely structural objects
- Do NOT use a purely structural (heap-free) model for Justin if it includes `===` / `!==`, since that would give incorrect semantics for object identity

### Notes on Locations / References

Justin likely cannot remain fully heap-free if it includes object identity tests such as `===` / `!==` on object literals. In that case, prefer:

- object/array literals allocate fresh **abstract locations**
- store maps locations to immutable object contents
- equality on object values compares locations
- field access reads through the store
- mutation can remain absent initially

This yields a small, identity-aware semantics without pulling in a full mutable JavaScript heap.

### Notes on Locations / References (representation choice)

If/when you introduce a heap (e.g., in Jessie or an extended Justin), **do not model locations as bare **``** in a way that makes them forgeable**.

Prefer one of:

1. **Abstract location type**

   ```coq
   Parameter loc : Type.
   ```

   with no public constructor; allocation produces fresh `loc`.

2. **Sealed constructor**

   ```coq
   Module Loc.
     Inductive t := Mk (n : nat).
   End Loc.
   ```

   and only expose `t`, not `Mk`, outside the module.

3. **Freshness discipline over **`` (acceptable but be explicit):

   - treat `nat` as implementation of locations
   - enforce freshness via allocation (e.g., max+1)
   - **never** allow arbitrary casts from `nat` to `loc` in the surface language

In Iris developments, it is common to use an abstract `loc` together with a heap `state := gmap loc val`, ensuring references are **unforgeable by construction**. This aligns with capability discipline and avoids the map/territory confusion where integers could masquerade as references.

If you choose a heap-free Justin, describe it explicitly as an idealized fragment and note that it will not validate object-identity-sensitive examples like `{}` `===` `{}`. For a semantics intended to track Justin more faithfully, introduce locations already at the Justin layer.

---

## Stage 3: Iris Embedding (Justin)

Instantiate:

- `ectx_language`
- `LanguageOfEctx`

Define:

- `Expr`, `Val`, `State`
- `to_val`, `of_val`

State clearly:

- what counts as a value
- when `to_val` returns `Some`

---

## Stage 4: Jessie Layer (Modules + Endowments)

Extend the model with:

### Modules

- module = mapping from names → expressions/exports
- imports resolved via environment

### Endowments

- initial environment providing `VPrim`
- authority is derived from reachable bindings
- endowed primitives may be effectful, fallible, and may allocate, but they only consume hardened arguments and only produce hardened values

### Semantics

- module evaluation produces exports
- linking composes environments

Keep this layer minimal but explicit.

---

## Stage 5: Testing Strategy

Use lightweight, pragmatic tests throughout the project. Do **not** wait for a perfect conformance suite before testing.

### Test Materials to Use

Use the following materials as practical seeds for examples and regressions:

- **Jessica interpreter / implementation** in `agoric-labs/jessica` as a behavioral reference for accepted cases
- **Jessica grammar examples and parser/evaluator tests** as available in the repo
- **Jessie Blockly fixture data**: `packages/blockly-tools/test/test-data.json` in the EndoJS Jessie repo as a source of realistic snippets and edge cases (see also context/discussion in [https://github.com/endojs/Jessie/pull/127](https://github.com/endojs/Jessie/pull/127))

Treat these as:

- parser / AST fixtures
- example programs
- behavioral reference points

Do **not** treat them as a normative conformance suite.

### Test at Each Step

#### 1. Grammar / Parsing tests

At the surface-syntax layer:

- verify that representative JSON / Justin / Jessie snippets parse
- round-trip parse/unparse where practical
- compare produced AST shapes against expectations

#### 2. Validation / Elaboration tests

For each sample program, classify it as one of:

- parses and elaborates successfully
- parses but is rejected by validation (BZZT)
- parses and requires refinement before elaboration succeeds

Include examples such as:

- `{} === {}`
- `let x = {}; x === x`
- `0 + []`  → reject
- `"1" + 1` → reject
- `x + y` with no refinement → reject
- `typeof x === "string" ? x + "abc" : undefined` → accept after refinement on the true branch

#### 3. Differential tests against Jessica

Where primitive behavior or module behavior differs because your formalized subset imposes hardenedness or rejects coercive behavior, record that divergence explicitly and add a targeted regression test for it.

Where the intended semantics is meant to follow Jessica/Jessie behavior, run:

- Jessica interpreter
- your reference interpreter for the validated core

on the same accepted test cases, and compare outcomes.

Use this especially for:

- object identity
- evaluation order
- field access
- application of endowed primitives

When your formalized subset intentionally diverges (for example by rejecting coercive `+`), record the divergence explicitly rather than treating it as a bug.

#### 4. Reference-interpreter tests for the validated core

Include tests for primitive behavior, especially:

- fallible primitives
- effectful primitives
- allocation by primitives
- hardened-argument preconditions
- hardened-result postconditions

Build a small executable interpreter for the elaborated core language and write golden tests of the form:

- surface program
- validation result
- elaborated core term (optional but preferred)
- final value / weird outcome

This becomes the main regression suite even without a full external conformance suite.

#### 5. Coq regression tests

As definitions stabilize, add small proof-oriented regression tests:

- one-step reduction examples
- canonical forms / `to_val` examples
- evaluation-context decomposition examples
- a few WP sanity checks

These help detect semantic drift when the language definition evolves.

### Suggested Workflow

1. Mine examples from Jessica and Jessie fixture/test materials.
2. Curate them into a small labeled corpus.
3. Mark each example as:
   - adopt
   - reject (BZZT)
   - intentionally diverge
4. Use the curated corpus at every layer:
   - parser
   - validator/elaborator
   - reference interpreter
   - Coq lemmas/proofs

### Important Constraint

Do not overfit to any single existing implementation artifact. The Jessica interpreter and Jessie test materials are useful scaffolding, but the formal development must still state explicitly where it agrees with them, where it abstracts, and where it intentionally rejects JavaScript-style behavior.

---

## Stage 6: Reasoning Hooks for Iris

Identify (do not fully prove yet):

- what invariants will represent authority confinement
- how reachability of values corresponds to capabilities
- what a weakest-precondition spec for `App` should look like

---

## Handling Underspecified Design Choices

For any important semantic point that remains unspecified (for example import resolution, module initialization order, endowment threading, detailed primitive behavior, or other observable choices), do **not** silently guess.

Instead:

1. identify the design alternatives clearly
2. produce one or more **small distinguishing tests** that would separate those alternatives
3. explain the different observable outcomes those tests would have under each design
4. ask the user which outcome should be considered correct

Prefer tests that are:

- minimal
- executable
- phrased in Jessie/Justin surface syntax when possible
- directly useful as future regression tests

If a reasonable temporary choice is needed to continue, make it explicit that it is provisional and attach a distinguishing test for later confirmation.

---

## Output Requirements

- Use Coq-like syntax (not necessarily fully compiling, but consistent)
- Keep definitions tight and readable
- Avoid unnecessary generality
- Flag any underspecified semantic choices explicitly

---

## Non-Goals

Do NOT:

- introduce lambda calculus unless justified
- model full JavaScript
- over-engineer the heap model early

---

## Success Criteria

A good answer will:

- respect the Jessica layering
- correctly model application without function literals
- produce a plausible `ectx_language`
- cleanly separate syntax, semantics, and environment

---

## Stretch Goal (Optional)

Suggest how to extend the model to:

- asynchronous/eventual send
- hardened objects / immutability

but do not implement them.


## Lab Notebook

- Renamed `jessie-idris.md` to `jessie-iris.md` to match the actual Iris target.
- Added working Coq artifacts for JSON syntax, Justin syntax/elaboration, executable Justin semantics, Jessie modules, and tiny concrete parsers.
- Current focus: refactor the Justin core into an Iris `ectxi_language` with explicit context items and relational `base_step`.
- Added `jessie_iris_lang.v`, which now compiles a Justin `ectxi_language`/`language` instance against Iris.
- Tightened two semantic points while proving the Iris mixin:
  - non-primitive application only goes weird after all arguments are values
  - binary operator type errors only go weird after both operands are values
- The Iris-facing layer still models weird halting as the explicit terminal expression `CoreBzzt`; that is observable and not silent, but it is not yet packaged as a value.
DONE: bigint
DONE: typeof null === 'object' with regression test

- Added `VBigInt` to the Justin value space, `TyBigInt` to refinement/classification, and `typeof ... = "bigint"`.
- Added tiny Justin concrete syntax for bigint literals like `9898n`.
- Changed `typeof null` to return `"object"` to match JavaScript/Jessie expectations, and added regression tests in the executable, Iris, and bundle layers.
- Aligned naming with semantics:
  - `freeze` is now shallow
  - `harden` is now deep
- Added regression tests distinguishing shallow `freeze` from deep `harden`.

## makeCounter Goal

Target a mechanized example of the form:

```js
const makeCounter = () => {
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
```

and authority-splitting uses of the form:

```js
entryGuard.use({ incr: counter.incr });
```

with the theorem:

`no matter what entryGuard does, the counter can only go up`

and:

```js
exitGuard.use({ decr: counter.decr });
```

with the theorem:

`no matter what exitGuard does, the counter can only go down`

The goal is to extend the Jessie/Iris model until it supports this example directly, with:

- `makeCounter` creates private state
- a returned hardened object exposes `incr` and `decr` methods
- repeated calls satisfy an `assert(n === 2)` style regression
- passing `{ incr: counter.incr }` to an `entryGuard` supports the theorem:
  no matter what `entryGuard` does, the counter can only go up
- passing `{ decr: counter.decr }` to an `exitGuard` supports the theorem:
  no matter what `exitGuard` does, the counter can only go down

Current milestone:

### What Is Proved About `makeCounter`

The main result is a concrete authority-separation theorem for the `makeCounter` case study.

From a freshly allocated counter object, the development derives two hardened capability objects:

- an entry capability exposing only `incr`
- an exit capability exposing only `decr`

The key proved Coq identifiers for this result are:

- `invoke_entry_cap_trace_exact`
- `invoke_exit_cap_trace_exact`
- `entry_cap_trace_monotone`
- `exit_cap_trace_monotone`
- `entry_cap_trace_fields_are_incr`
- `exit_cap_trace_fields_are_decr`
- `entry_cap_hides_decr`
- `exit_cap_hides_incr`
- `entry_cap_two_calls_reach_two`
- `exit_cap_two_calls_reach_minus_two`

The trace theorems live in `jessie_counter_spec.v`. The regression wrappers live in
`jessie_regress.v`. Their content is:

- `invoke_entry_cap_trace_exact` says that any successful trace through a well-formed entry capability consists only of `"incr"` calls and leaves the hidden counter at `n + length(trace)`
- `invoke_exit_cap_trace_exact` says the symmetric fact for the exit capability, leaving the hidden counter at `n - length(trace)`
- `entry_cap_trace_monotone` specializes that to a fresh counter and says any successful trace through the entry capability leaves the hidden cell at exactly `length(trace)`
- `exit_cap_trace_monotone` specializes the exit side and leaves the hidden cell at exactly `- length(trace)`
- `entry_cap_trace_fields_are_incr` says any successful entry-cap trace contains only `"incr"`
- `exit_cap_trace_fields_are_decr` says any successful exit-cap trace contains only `"decr"`
- `entry_cap_hides_decr` states that if we project the entry capability out of a fresh counter and then try to invoke `"decr"` through it, the result is `None`
- `exit_cap_hides_incr` states the symmetric fact for the exit capability
- `entry_cap_two_calls_reach_two` states that following the trace `["incr"; "incr"]` through the entry capability leaves the hidden counter cell at `2`
- `exit_cap_two_calls_reach_minus_two` states that following the trace `["decr"; "decr"]` through the exit capability leaves the hidden counter cell at `-2`

To read one of these statements, `entry_cap_trace_monotone` is the most important:

- `entry_cap_after_makeCounter` computes the capability produced from a fresh counter
- the `match ... with Some (cap, σ) => ... | None => None end` wrapper just handles the possibility that capability allocation failed
- `invoke_cap_trace σ cap trace` means: starting from state `σ`, perform the whole client trace through the capability object
- `lookup_cell σ' 0%nat` reads the private counter cell from the resulting state
- the whole theorem ends with `= Some (Z.of_nat (length trace))`, which says the hidden state is determined exactly by how many successful entry calls were made

This is the current main white-box authority-separation result: once the counter is split into entry and exit capabilities, every successful client trace through the entry side is increment-only, and every successful client trace through the exit side is decrement-only. The proof is not by testing a few traces; it is by induction over arbitrary traces using the actual `invoke_cap_trace` code.

This is still not the final Iris theorem one would ultimately want, because it is phrased as a white-box theorem over capability traces rather than over all client contexts in the Iris language interface.

The older forgeability counterexamples remain historically useful:

- `forged_decr_breaks_entry_context_monotonicity`
- `forged_incr_breaks_exit_context_monotonicity`

Those show why the unrestricted raw-core theorem was false before the public/client boundary was introduced. The public boundary now lives in `jessie_public.v`, and the next proof step would be to connect that public syntax to the trace theorem above.

There is now also an explicit reachability layer in `jessie_counter_reach.v`:

- `reaches_val` and `reaches_dyn` formalize which values and dynamic primitive references are reachable from a root capability through object fields
- `entry_cap_reaches_only_entry_dyn` proves that anything dynamically reachable from the entry capability is increment authority
- `exit_cap_reaches_only_exit_dyn` proves the symmetric decrement fact for the exit capability
- `entry_cap_root_reaches_only_incr` and `exit_cap_root_reaches_only_decr` are concrete fresh-counter corollaries

This is not yet the full client-context bridge theorem, but it isolates the exact authority-reachability claim that such a theorem will need.

There is also now a first connectivity-oriented layer in `jessie_connectivity.v`,
aimed more directly at the Miller/Shapiro framing that "Only Connectivity Begets
Connectivity". It introduces:

- `cref`, a small reference graph of object locations, dynamic method references, and hidden counter cells
- `edge` and `reachable`, describing how connectivity propagates through object fields and method endowments
- `old_or_fresh`, which says a reachable reference after a primitive call is either already reachable from the arguments or freshly allocated in that step
- `primitive_connectivity_ok`, the corresponding primitive-level connectivity discipline

This file currently contains concrete checked examples for `makeCounter` showing
that the returned object reaches:

- the fresh counter object
- the fresh increment method reference
- the hidden counter cell through the method endowment

and that these references satisfy the intended `old_or_fresh` condition for the
fresh call from `counter_empty_state`.

There is now also a separate evaluator-step infrastructure layer in
`jessie_step_connectivity.v`. This does **not** yet prove the full
one-step theorem, but it fixes the statement boundary and mechanizes the
pieces that theorem will use:

- `closed_val`, `closed_expr`, `closed_exprs`, `closed_fields`, and `closed_state`
  define the "closed configuration" boundary. This is the formal replacement for
  the informal statement that clients cannot forge fresh locations or dynamic
  primitive references.
- `expr_reaches_dyn`, `exprs_reach_dyn`, and `fields_reach_dyn` define
  expression-level dynamic-authority reachability, separate from the
  case-study-specific capability graph.
- `step_frame` isolates the two state-shape changes relevant to the generic
  Justin evaluator:
  - either the object store/environment are unchanged for purposes of authority
    reachability, or
  - a single fresh object is allocated by `alloc_obj`.
- The attempted first proof of the generic one-step theorem revealed an
  important boundary condition: this "frame" view is too strong if interpreted
  as full-state equality, because dynamic counter primitives legitimately update
  `st_cells`. That update changes numeric counter contents but does not change
  the object graph or the dynamic-primitive graph. So the next theorem should
  be phrased in terms of preserving reachable authority, not preserving the
  entire state record.
- `lookup_obj_alloc_obj_other` and `reaches_dyn_old_after_alloc` are the key
  transport lemmas saying that a closed pre-existing value cannot suddenly gain
  new dynamic authority merely because an unrelated fresh object was allocated.
- `all_lit_in_args`, `all_lit_field_in_fields`, `closed_fields_member`, and
  `fields_member_reaches_dyn` are the bookkeeping lemmas needed to decompose
  authority reachability through object literals.
- `alloc_result_dyn_from_fields` is the main `CoreAllocObj` helper: if a dynamic
  authority is reachable from the freshly allocated object, then it was already
  reachable from one of the field values used to build that object.

This means the development now has the right proof infrastructure for the next
step theorem:

- classify the store effect of one `step_with apply_prim` step,
- transport authority reachability through unchanged closed values/expressions,
- and then prove that every dynamic authority reachable from the post-step term
  was already reachable from the pre-step closed configuration.

What is **not** yet finished is the top theorem itself. In particular:

- the generic `step_with` case split has not yet been carried through to a
  closed-form theorem `step_with_preserves_dyn`
- the public-expression closure bridge from `jessie_public.v` into these closed
  predicates has not yet been proved
- the multi-step/public-client corollary therefore remains the next milestone,
  not a completed result

Lab note: I also attempted a mutual theorem `step_with_frame /
step_fields_with_frame / step_args_with_frame` to show that one evaluator step
either preserves the authority-relevant object graph or performs a single fresh
allocation. The statement itself still looks right, but the proof script became
too brittle around `CoreBinop`, where Coq repeatedly renamed the local equation
produced by the outer `match op` simplification. I backed that proof out rather
than leave the file broken. The next pass should likely factor the `CoreBinop`
cases into a small auxiliary lemma instead of trying to finish the whole mutual
theorem in one script.

Follow-up note: I started that decomposition in `jessie_step_connectivity.v`,
but narrowed it further after the same local-fixpoint issue reappeared in the
larger constructor lemmas. The currently checked pieces are the smallest stable
ones:

- `step_with_var_frame`
- `step_with_eqstrict_vals_frame`
- `step_with_addnum_vals_frame`
- `step_with_concatstr_vals_frame`

So the proof split is still the right direction; the immediate next step is to
grow these into constructor-specific frame lemmas one case at a time, rather
than trying to reintroduce the whole mutual theorem all at once.

The underlying case-study lemmas in `jessie_counter.v` make the same story visible one step earlier, before the regression wrappers:

- `invoke_entry_cap_step`
- `invoke_exit_cap_step`
- `invoke_entry_cap_other_none`
- `invoke_exit_cap_other_none`

These say, respectively, that a well-formed entry capability increments, a well-formed exit capability decrements, and each one rejects the other authority.

### Behavior Regression

The development also proves that the canonical example program runs successfully:

```js
const counter = makeCounter();
counter.incr();
const n = counter.incr();
assert(n === 2);
```

The key Coq identifiers here are:

- `makeCounter_assert_works`
- `makeCounter_final_cell_is_two`

These prove that normalization of the corresponding core program reaches `CoreLit VUndefined`, which is the success result of the modeled `assert`, and that the final machine state contains private counter cell value `2`.

The model supporting this result treats `makeCounter` as an endowed primitive that allocates:

- a private mutable counter cell
- a hardened returned object exposing `incr` and `decr`
- dynamic method primitives whose behavior closes over that private cell

These are proofs by computation in the operational model: the examples close by `reflexivity` or `vm_compute`, because the evaluator reduces the program to the claimed result inside Coq.

### What Is Proved In The Iris Layer

The Iris-facing layer does not yet contain a full weakest-precondition proof of the `makeCounter` specification. In particular, it does not yet prove a general client theorem such as:

- any client given only the entry capability can never decrease the counter
- any client given only the exit capability can never increase the counter

What it does prove is a smaller, but still genuine, Iris-language result: atomic `base_step` facts for the split capabilities.

The relevant Coq identifiers are:

- `entry_cap_get_incr_atomic`
- `entry_cap_get_decr_missing_atomic`
- `entry_cap_call_incr_atomic`
- `exit_cap_get_incr_missing_atomic`
- `exit_cap_call_decr_atomic`

These facts show that:

- looking up `"incr"` on the entry capability steps to the corresponding primitive
- looking up `"decr"` on the entry capability steps to `undefined`
- invoking the exposed entry primitive performs the expected one-step counter increment
- looking up `"incr"` on the exit capability steps to `undefined`
- invoking the exposed exit primitive performs the expected one-step counter decrement

So the current Iris result is at the operational-interface level: it establishes that the `ectx_language` / `base_step` layer for these capability actions is correct. It is not yet the larger separation-logic proof one would usually mean by a full "Iris proof of `makeCounter`".

### Surface Syntax Connection

The surface-level syntax story is also in place, but it is not the main theorem. The exact `makeCounter` example text parses in Coq, including:

- `const` / `let`
- `() => { ... }`
- object literals with method fields
- calls like `counter.incr()`
- `count += 1` and `count -= 1`
- `assert(n === 2)`

There is then a regression showing that the parsed surface program compiles to the intended core term `makeCounter_assert_prog`. This is what connects the concrete example text to the mechanized operational result above.

## Public Client Boundary

The development now has an explicit public client syntax in
`jessie_public.v`. This is the intended boundary for any future
"arbitrary client context" theorem.

The important point is that `JessiePublic.expr` can compile only to
core terms built from:

- literal values
- variables
- object construction
- property access
- application
- let-binding
- `typeof`
- conditionals
- binary operators

It does **not** let a client program directly construct:

- `VLoc ...`
- `VPrim ...`
- `PrimDyn ...`
- `PrimExt ...`

So the surface-level forgeability problem has been removed from the
public interface. What remains is the proof work: showing that when a
public client expression is evaluated from the entry-capability state,
all runtime authority that becomes reachable is still increment-only,
and symmetrically for the exit side.

### Important Boundary

Justin still excludes function literals and assignment in the shared Justin parser. There are explicit regressions asserting:

- `parse_justin "() => undefined" = None`
- `parse_justin "count += 1" = None`

So `makeCounter` is not being presented as a general Justin program. It currently lives in the Jessie layer, where a small surface parser and case-study compiler connect the concrete example to the executable core semantics and the current Iris-facing step facts.
