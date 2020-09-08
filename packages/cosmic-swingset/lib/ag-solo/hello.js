import { promises as fs } from 'fs';

export const bootPlugin = ({ getState, setState }) => {
  let state = getState() || { count: 0 };
  const dataFile = `${__filename}.dat`;
  console.error('got initial state', dataFile, state);
  return harden({
    async hello(name) {
      state = { count: state.count + 1 };
      setState(state);
      await fs.writeFile(dataFile, `Said hello ${state.count} times\n`);
      return `Hello, ${name}!`;
    },
  });
};
