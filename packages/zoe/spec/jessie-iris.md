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

Current Coq files:

- `jessie_lang.v`
- `jessie_counter.v`

`jessie_lang.v` defines a tiny language in the style of OCPL Fig. 1, keeping
only the constructs needed for `makeCounter`:

- variables
- numeric and unit literals
- `λ:` / recursive functions
- application
- `let:`
- pairs with `Fst` / `Snd`
- `ref`, `!`, and `<-`
- integer addition

`jessie_counter.v` defines `makeCounter` in that tiny language. The returned
counter object is modeled as a pair `(incr, decr)`, so `cUp` is represented by
the first projection.

The build is now:

```bash
make -f iris.mk build
```
