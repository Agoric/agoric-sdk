import harden from '@agoric/harden';

// We assume we're running in a SES environment.
export function makeConsole(baseConsole) {
  // We restrict `console` to the API that can be implemented
  // by the anylogger API.
  // It should be unobservable by the code using it, notably
  // only send output via the base console, and don't return a value.
  const console = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    console[level] = (...args) => {
      baseConsole[level](...args);
      return undefined;
    };
  }
  return harden(console);
}

// This function implements makeConsole with SES1 (pre-lockdown).
export function SES1MakeConsole(SES1, baseConsole) {
  // We evaluate within SES so that the resulting object does
  // not give away access to the root realm.
  const source = `(${makeConsole})`;
  const myConsole = SES1.evaluate(source, {
    harden: SES1.global.SES.harden,
  })(baseConsole);
  return myConsole;
}
