import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

/*
lots of vertical space to test the display of error linenumbers
when running TypeScript tests under Ava on Node.

This is not an automated test of anything. Rather, its purpose is
visual inspection of the output.

With the `SUPPRESS_NODE_ERROR_TAMING` environment variable absent
or set to `'disabled'`, you should see a stack trace that includes
something like

```
  boot/test/bootstrapTests/stack-linenumbers.test.ts:1:104
```

This is because the TypeScript compiler compiles this file into one line
of JavaScript with a sourceMap that should map back into original
positions in this file. Node specifically makes use of that sourceMap
to produce original linenumbers. However, Node does this in a way
that resists virtualization, so the normal SES error taming cannot use
this sourceMap info.

However, if you also set  the `SUPPRESS_NODE_ERROR_TAMING` environment
variable `'enabled'`, for example by doing

```sh
$ export SUPPRESS_NODE_ERROR_TAMING=enabled
```
at a bash shell, then when you run this test you should instead see
something like
```
boot/test/bootstrapTests/stack-linenumbers.test.ts:40:32
```

*/

test('for manual validation of error stack line number transparency', t => {
  t.log('look at linenumbers', Error('what me worry'));
  t.pass();
});
