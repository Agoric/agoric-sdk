import { makeError, X } from '@endo/errors';
import test from '@endo/ses-ava/prepare-endo.js';
import { makeTracer } from '../src/debug.js';

// As a *-demo.test.js, the purpose of this test file is not so much to be an
// automated regression test as to be something whose console output
// should be visually and manually inspected.
//
// TODO 'makeTracer should somehow be migrated to the endo repo, perhaps as
// an extension of the causalConsole from the `'ses'` package. Once there,
// it should get a genuine automated test by using the `_throws-and-logs.js`
// module that supports testing what's sent to the console. Note that
// the functionality of `_throws-and-logs.js` is not exported from `'ses'`,
// so writing such tests before migration would be awkward.
test('test makeTracer top level', t => {
  const e = makeError(X`pretending`, URIError);

  const defaultTracer = makeTracer('defaultTracer');
  // Should noop
  const falseTracer = makeTracer('falseTracer', false);
  // Should be same as default
  const trueTracer = makeTracer('trueTracer', true);
  // Should be same as default, except when the first argument to
  // `verboseTracer` is an object with a `.log` method.
  const verboseTracer = makeTracer('verboseTracer', 'verbose');

  defaultTracer('foo1', 'bar1', e);
  falseTracer('foo2', 'bar2', e);
  trueTracer('foo3', 'bar3', e);
  verboseTracer('foo4', 'bar4', e);

  defaultTracer(t, 'foo5', 'bar5', e);
  falseTracer(t, 'foo6', 'bar6', e);
  trueTracer(t, 'foo7', 'bar7', e);
  // ignores `t` and uses `console.log`
  verboseTracer(t, 'foo8', 'bar8', e);
  t.pass();
});

// For example,
// $ LOCKDOWN_STACK_FILTERING=concise yarn test test/debug-demo.test.js
// should produce output that looks like
/*

----- defaultTracer.2  2 foo1 bar1 (URIError#1)
  ✔ test makeTracer top level
    ℹ ----- defaultTracer.2  3 foo5 bar5 (URIError#1)
    ℹ URIError#1: pretending
    ℹ   at packages/internal/test/debug-demo.test.js:16:13
        at async Promise.all (index 0)

    ℹ ----- trueTracer.4  3 foo7 bar7 (URIError#1)
  ✔ test makeTracer sub-tracers
    ℹ ----- PortC.portflio23:flow3.6  2 hello from flow3
URIError#1: pretending
  at packages/internal/test/debug-demo.test.js:16:13
  at async Promise.all (index 0)

----- trueTracer.4  2 foo3 bar3 (URIError#1)
----- verboseTracer.5  2 foo4 bar4 (URIError#1)
----- verboseTracer.5  3 foo8 bar8 (URIError#1)

*/
// The lines above prefixed with "ℹ" are the ones sent to `t.log`.
// Nothing sent to `falseTracer` appears anywhere.
// All trace calls without the `t` argument were sent to `console.info`.
// The `foo5 bar5` and `foo7 bar7` output was sent to `t.log`
// The `foo8 bar8` output was sent to `console.log` despite the
// first `t` argument, which was only skipped.
//
// The contents of any error, such as URIError#1 above, are only printed
// to the console once, whether via `t.log` or the `console` object. All
// other occurences just mention the name as a backreference to that one
// logging of its contents.

// The lines
/*

✔ test makeTracer sub-tracers
    ℹ ----- PortC.portflio23:flow3.6  2 hello from flow3

*/
// above are from the next test.

test('test makeTracer sub-tracers', t => {
  // Example from the original slack conversation.

  const trace = makeTracer('PortC');
  const trace2 = trace.sub('portfolio23');
  const trace3 = trace2.sub('flow3');

  trace3(t, 'hello from flow3');
  t.pass();
});
