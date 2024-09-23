const createStore = (reducerFn, initialState) => {
  let state = initialState;
  const getSlice = prop => state[prop];
  const getStore = () => state;
  const getState = () => state;

  const dispatch = action => {
    return (state = reducerFn(state, action));
  };
  return {
    getStore,
    getSlice,
    getState,
    dispatch,
  };
};

// verify the account does not already exists.
// look up the tier that a user falls into
//

export { createStore };
