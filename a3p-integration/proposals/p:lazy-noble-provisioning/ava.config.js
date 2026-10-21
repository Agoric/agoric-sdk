// This project runs standalone inside the synthetic-chain container.
export default {
  concurrency: 1,
  timeout: '3m',
  files: ['test/**/*.test.*'],
  extensions: ['js', 'ts'],
  nodeArguments: ['--import=ts-blank-space/register', '--no-warnings'],
};
