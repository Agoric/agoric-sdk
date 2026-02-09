import base from '../../../ava.config.js';

const getBase = typeof base === 'function' ? base : () => base;

export default args => {
  const config = getBase(args);
  return {
    ...config,
    files: ['test/**/*.test.*', 'test/**/*.test-noendo.*'],
  };
};
