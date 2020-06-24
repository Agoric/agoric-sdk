import commonSetup from './exchanger';

export default function setup(syscall, state, helpers) {
  return commonSetup(syscall, state, helpers, 'bob');
}
