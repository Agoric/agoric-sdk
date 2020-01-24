# Transform Metering

The purpose of this package is to provide a loose, but deterministic way to interrupt Javascript code that exceeds a "meter".

This technique is not airtight, but it is at least is a best approximation in the absence of an instrumented host platform.

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

## Host endowments

Without precisely instrumenting the host platform code, this package provides an option to wrap a global object with code that does a rough instrumentation of function calls.  This is not a Proxy/Membrane, rather a complete reconstruction of the globals and endowments as an object that can be supplied to the `endowments` parameter of the three-argument evaluator.

The reason for this wrapping is to provide some basic accounting for the resources consumed by the host platform methods.  The wrapping makes some assumptions about the host, such as:

1. only flat objects are allocated by builtins, and they are returned
2. builtins that are costly in time- or space-complexity have large return values, or many calls to a supplied function argument
3. builtins have been "tamed" by the SES platform to prevent nondeterminism and pathological behaviour

This at least prevents user code from running after a builtin has exceeded a meter.
