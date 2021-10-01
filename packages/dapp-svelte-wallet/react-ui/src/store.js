// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';

export const {
  reducer,
  initial: defaultState,
  actions: { setConnectionState },
} = autodux({
  slice: 'wallet',
  initial: {
    connectionState: 'idle',
  },
  actions: {},
});
