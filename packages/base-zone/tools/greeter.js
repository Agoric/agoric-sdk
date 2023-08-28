import { M } from '@endo/patterns';

export const bindAllMethodsTo = (obj, that = obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([name, fn]) => [name, fn.bind(that)]),
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
  ...GreeterI.methodGuards,
  ...GreeterAdminI.methodGuards,
});

export const prepareGreeterSingleton = (zone, label, nick) => {
  const myThis = Object.freeze({ state: { nick } });
  return zone.exo(label, GreeterWithAdminI, {
    ...bindAllMethodsTo(greetFacet, myThis),
    ...bindAllMethodsTo(adminFacet, myThis),
  });
};

export const prepareGreeter = zone =>
  zone.exoClass('Greeter', GreeterWithAdminI, nick => ({ nick }), {
    ...greetFacet,
    ...adminFacet,
  });

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
