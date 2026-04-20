# Jessie In Iris

This file is the working design note for the Jessie/Justin/Iris work in this
directory.

The motivation is to model capability separation properties of escrow-style
code in a logic that fits them well: Iris is a good match for "if you don't
have the reference, you can't invoke it", for separation-of-duties examples
such as `makeCounter`, and for the async/concurrency structure that matters for
escrow reasoning.

The concrete case-study shape remains the familiar one:

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

This directory has now been reset to a minimal OCPL-shaped starting point.

## Dev Tools

`iris.mk` is the local bootstrap/build helper for the Coq development toolchain.

In particular, it sets up:

- Ubuntu packages for local development: `build-essential`, `m4`, `pkg-config`, `bubblewrap`, `opam`, `git`
- an opam switch named `iris` by default
- Coq
- `coq-iris`
- `coq-iris-heap-lang`
- `vsrocq-language-server`

For day-to-day work, `make -f iris.mk build SOURCES="..."` is the lightweight way to recompile only the relevant `.v` files, with dependencies generated via `coqdep`. For the exact workflow and commands, use `make -f iris.mk help`.

## Commit Discipline

Use git commit messages as the running lab notebook. Keep this file for the comparatively stable design summary, checked results, and next-proof-milestone framing.

Commit whenever there is a coherent thought worth preserving, whether that thought is:

- a working increment
- a clarified invariant
- a proof decomposition
- a concrete reason to backtrack

Successful proof steps and failed-but-informative proof attempts should both leave commit-message breadcrumbs.

Current Coq files:

- `jessie_lang.v`
- `jessie_counter.v`
- `jessie_eval.v`
- `jessie_robust.v`
- `jessie_counter_robust.v`
- `ocpl/modern_robust_safety.v`
- `jessie_counter_heaplang.v`

`jessie_lang.v` defines a tiny language in the style of OCPL Fig. 1, keeping
only the constructs needed for `makeCounter`:

- variables
- numeric literals and a temporary unit literal for nullary calls
- `fn:` / recursive functions
- application
- `let:`
- immutable objects with last-wins field lookup
- `assert:`
- `ref`, `!`, and `<-`
- integer addition, subtraction, and `>`
- `+=` / `-=`

`jessie_counter.v` defines `makeCounter` in that tiny language and models
`cUp` as `{ "incr" := c.["incr"] }`.

`jessie_eval.v` gives a small fuelled executable semantics for the current
language:

- closures with lexical environments
- mutable references/heap
- object construction and last-wins field lookup
- monitored `assert:` that flips a goodness bit instead of relying on stuckness
- an executable monitor that treats plain evaluation failure as not itself bad;
  only failed assertions count as goodness violations

`jessie_robust.v` then adds the OCPL-style scaffolding we discussed:

- a boolean `good_state` / `is_good`
- adversarial expressions and contexts that exclude `assert:` and whose only
  free variable is the exported argument placeholder
- `attacker_body exported C`
- a generic `robust_safety_goal` schema parameterized by an exported name, a
  verified client builder, and a monitored evaluator

`jessie_counter_robust.v` is where the counter-specific instantiation now lives:

- the checked client shape

  `const c = makeCounter(); const cUp = { incr: c.incr }; attacker(cUp); assert(c.incr() > 0);`

- executable smoke tests showing the intended distinction:
  - giving only `cUp` keeps the checked client good in simple cases
  - over-sharing the full counter lets an attacker call `decr`, which flips the
    goodness bit at the final assertion

`ocpl/modern_robust_safety.v` is now the main strong-reuse bridge to OCPL:

- it ports the OCPL `robust_safety.v` setup onto modern Iris HeapLang syntax
- it defines the adversarial-value / adversarial-expression layer and the
  single-hole context grammar for the HeapLang fragment we care about
- it records the key modern mismatch explicitly: assertions are not a dedicated
  AST constructor in current HeapLang, so adversaries must exclude the library
  `assert` value rather than an `Assert` node
- TODO: add a tiny Jessie surface with `Obj` / `Get` notation and desugar it
  to HeapLang, so we keep strong reuse while writing the case study in a
  closer-to-Jessie syntax

`jessie_counter_heaplang.v` is now the counter-specific HeapLang case study:

- it uses the installed `coq-iris-heap-lang` package directly
- it encodes `makeCounter`, `cUp`, and the checked client in HeapLang notation
- it already proves the `hole` and single-`incr` client cases with Iris `wp_*`
  tactics, rather than with the bespoke evaluator
- it derives matching adequacy corollaries for those concrete clients

The current tree therefore has three layers:

- the older minimal custom-language scaffold, which is still useful for syntax
  experiments and theorem-shape sketches
- the OCPL-shaped HeapLang scaffold in `ocpl/modern_robust_safety.v`, which is the
  intended reusable proof setup
- the direct counter case study in `jessie_counter_heaplang.v`, which should
  increasingly become just an instantiation of that setup

The build is now:

```bash
make -f iris.mk build
```
