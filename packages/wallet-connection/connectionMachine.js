Machine({
  id: 'Agoric Wallet Connection',
  initial: 'idle',
  context: {
    location: null,
    connecting: false,
  },
  states: {
    idle: {
      on: {
        '': {
          target: 'locating',
          cond: 'connecting',
        },
      },
    },
    locating: {
      '': {
        target: 'bridging',
        cond: 'hasLocation',
      },
    },
    bridging: {
      BRIDGED: {
        target: 'connected',
        cond: 'connecting',
      },
    },
    connected: {      
    },
    waitToRetry: {
      TICK: 'locating',
    },
  },
  on: {
    '': {
      target: 'idle',
      cond: 'notConnecting',
    },
    'DISCONNECT': 'waitToRetry',
    'UPDATE.LOCATION': {
      target: 'bridging',
      actions: assign({
        location: (_, event) => event.value,
      }),
      cond: 'locationChanged',
    },
  },
  guards: {
    locationChanged: (context, event) => context.location !== event.value,
    hasLocation: (context) => context.location !== null,
    notConnecting: context => !context.connecting,
    connecting: context => context.connecting,
  },
})
