# Transform Metering

The purpose of this package is to provide a loose, but deterministic way to interrupt Javascript code that exceeds a "meter".

This technique is not airtight, but it is at least is a best approximation in the absence of an instrumented host platform.

## Quickstart

```js
import { tameMetering } from '@agoric/tame-metering';
import { lockdown } from 'ses';
import { makeMeteredEvaluator } from '@agoric/transform-metering';

// Override all the global objects with metered versions.
const replaceGlobalMeter = tameMetering();

// Enter SES.
lockdown();

const meteredEval = makeMeteredEvaluator({
  // Needed for enabling metering of the global builtins.
  replaceGlobalMeter,
  // Create an object with an `evaluate(src, endowments)` method
  makeEvaluator: opts => {
    const c = new Compartment(undefined, undefined, opts);
    return {
      evaluate(src, endowments = {}) {
        return c.evaluate(src, { endowments });
      }
    }
  },
  // Call a callback when the code inside the meteredEval is done evaluating.
  quiesceCallback: cb => setTimeout(cb),
});
```

### Using the new meteredEval

```js
import { makeMeter } from '@agoric/transform-metering';

const { meter } = makeMeter();

// Then to evaluate some source with endowments:
meteredEval(meter, 'abc + def', {abc: 123, def: 456}).then(
  ([normalReturn, value, seenMeters]) => {
    for (const m of seenMeters) {
      const ex = m.isExhausted();
      if (ex) {
        console.log('meter', m, 'was exhausted with', ex);;
      }
    }
    if (normalReturn) {
      console.log('normal return', value);
    } else {
      console.log('exception', value);
    }
  }
);
```


# Implementation Details

## Meter types

There are three types of meters:

* Allocation meters.  These decrement a budget by a cost roughly proportional to the storage size of the provided argument.

* Compute meters.  These only decrement a budget by a cost roughly proportional to the execution time of the code that follows them.

* Stack meters. These track the depth of stack used between nested calls to decrement and increment the meter.

Another type of meter is the "combined" meter, which can measure the consumption of more than one of the above against the same budget.

## The transformation

To instrument source code robustly, the metering transform should be installed as part of an 3-argument evaluator call (such as the one provided by SES, Secure EcmaScript).

The deterministic results of exceeding any meter is a thrown exception.  That same exception is rethrown by any meter adjustment, until the exceeded meter is reset.  No user code can execute after a meter exception because any attempt to `catch` or `finally` handle that exception is instrumented with another meter check.

Thus, an exceeded meter for any reason throws a `RangeError` all the way to the top of the evaluation, in the calling host code.

### Function bodies

This transformation replaces every function body (including single-expression arrow functions) with:

```js
  try {
    [decrement stack meter, throw if exceeded]
    ... // existing function body
  } finally {
    [increment stack meter]
  }
```

### Loop statements

Every loop body (including single-statement bodies), and `catch` and `finally` bodies are preceded with:

```js
   {
     [decrement compute meter, throw if exceeded]
     ... // existing loop body
   }
```

### RegExp literals

All regular expression literals (such as `/some-regexp/g`) are rewritten as follows:

```js
const $h_re_1 = RegExp('some-regexp', 'g');
... // existing use of /some-regexp/g replaced by $h_re_1
```

The `$h_re_`-prefixed identifiers are blacklisted for pre-transformed evaluated sources.

This makes it possible for an endowedd `RegExp` constructor to prevent ["catastrophic backtracking"](https://www.regular-expressions.info/catastrophic.html).  One such suitable constructor is [RE2](https://github.com/google/re2/#readme).

## Host endowments

Without precisely instrumenting the host platform code, this package provides an option to wrap a global object with code that does a rough instrumentation of function calls.

The reason for this wrapping is to provide some basic accounting for the resources consumed by the host platform methods.  The wrapping makes some assumptions about the host, such as:

1. only flat objects are allocated by builtins, and they are returned by the builtin
2. builtins that are costly in time- or space-complexity have large return values, or many calls to a supplied function argument
3. builtins have been "tamed" by the SES platform to prevent nondeterminism and pathological behaviour

This at least prevents user code from running after a builtin has exceeded a meter.
