// NB: keep in sync with package.json
export default {
  extensions: {
    js: true,
    ts: 'module',
  },
  files: ['test/**/bench-*.js'],
  nodeArguments: ['--loader=tsx', '--no-warnings'],
  require: ['@endo/init/debug.js'],
  timeout: '20m',
  workerThreads: false,
};
