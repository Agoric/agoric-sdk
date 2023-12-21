import { M, getInterfaceGuardPayload } from '@endo/patterns';

/**
 * @template {{}} T
 * @param {T} obj
 * @param {unknown} that
 * @returns {T}
 */
export const bindAllMethodsTo = (obj, that = obj) =>
  /** @type {T} */
  (
    Object.fromEntries(
      Object.entries(obj).map(([name, fn]) => [name, fn.bind(that)]),
    )
  );

export const GreeterI = M.interface('Greeter', {
  greet: M.call().optional(M.string()).returns(M.string()),
});
export const greetFacet = {
  greet(greeting = 'Hello') {
    return `${greeting}, ${this.state.nick}`;
  },
};

export const GreeterAdminI = M.interface('GreeterAdmin', {
  setNick: M.call(M.string()).returns(),
});
export const adminFacet = {
  setNick(nick) {
    this.state.nick = nick;
  },
};

export const GreeterWithAdminI = M.interface('GreeterWithAdmin', {
  ...getInterfaceGuardPayload(GreeterI).methodGuards,
  ...getInterfaceGuardPayload(GreeterAdminI).methodGuards,
});

/**
 * @param {import('../src/types.js').Zone} zone
 * @param {string} label
 * @param {string} nick
 */
export const prepareGreeterSingleton = (zone, label, nick) => {
  const myThis = Object.freeze({ state: { nick } });
  return zone.exo(label, GreeterWithAdminI, {
    ...bindAllMethodsTo(greetFacet, myThis),
    ...bindAllMethodsTo(adminFacet, myThis),
  });
};

/**
 * @param {import('../src/types.js').Zone} zone
 */
export const prepareGreeter = zone =>
  zone.exoClass('Greeter', GreeterWithAdminI, nick => ({ nick }), {
    ...greetFacet,
    ...adminFacet,
  });

/**
 * @param {import('../src/types.js').Zone} zone
 */
export const prepareGreeterKit = zone =>
  zone.exoClassKit(
    'GreeterKit',
    { greeter: GreeterI, admin: GreeterAdminI },
    nick => ({ nick }),
    {
      greeter: greetFacet,
      admin: adminFacet,
    },
  );
