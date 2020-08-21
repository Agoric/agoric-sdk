const { defineProperty } = Object;

// Patterned after
// https://github.com/Agoric/SES/blob/master/src/bundle/make-console.js
// but fake, for testing.

function makeFakeConsole(logArray) {
  // TODO: these are the properties that MDN documents. Node.js has a bunch
  // of additional ones that I didn't include, which might be appropriate.
  const consoleWhitelist = [
    'log',
    'info',
    'warn',
    'error',
    'group',
    'groupEnd',
    'trace',
    'time',
    'timeLog',
    'timeEnd',
  ];

  // TODO(msm): Too heavy a hammer
  const noErrorFilter = specimen => !(specimen instanceof Error);

  const fakeConsole = {};

  consoleWhitelist.forEach(name => {
    // Use an arror function so that it doesn't come with its own name in
    // its printed form. Instead, we're hoping that tooling uses only
    // the `.name` property set below.
    const f = (...args) => {
      // Note the curlies and lack of a `return`. All these should return
      // only undefined, i.e., not return anything.
      logArray.push([name, ...args.filter(noErrorFilter)]);
    };
    defineProperty(f, 'name', { value: name });
    fakeConsole[name] = f;
  });

  return harden(fakeConsole);
}

// Not frozen!
const fakeLog = [];

function takeLog() {
  const result = [...fakeLog];
  fakeLog.length = 0;
  return result;
}

const fakeConsole = makeFakeConsole(fakeLog);

// Intended to be used with tape or something like it.
//
// Wraps t.throws(thunk, msg) but also checks the console.
// TODO It currently checks the console by temporarily assigning
// a fake console to the global `console` variable. Once we have
// full Compartment support, we should run tests in a compartment
// with a `console` of our choosing.
//
// During thunk(), each time a console method is called, it
// will just log an array of the method name and the
// args. For example, if the code being tested does
// ```js
// console.error('what ', err);
// throw new Error('foo');
// ```
// the test code might check for exactly that with
// ```js
// throwsAndLogs(t, () => /*as above*/, /foo/,
//               [['error', 'what ', err]]);
// ```
function throwsAndLogs(t, thunk, regexp, goldenLog) {
  t.throws(
    () => {
      fakeLog.length = 0;
      const originalConsole = console;
      // eslint-disable-next-line no-global-assign
      console = fakeConsole;
      try {
        // If thunk() throws, we restore the console but not the fakeLog array.
        // An outer catcher could then both takeLog() and check the error.
        thunk();
      } finally {
        // eslint-disable-next-line no-global-assign
        console = originalConsole;
      }
    },
    { message: regexp },
  );
  t.deepEqual(takeLog(), goldenLog);
}
harden(throwsAndLogs);

export { throwsAndLogs };
