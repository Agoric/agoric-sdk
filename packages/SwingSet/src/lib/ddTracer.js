import ddtrace from 'dd-trace';

export const tracer = ddtrace.init({
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
  profiling: true,
});
