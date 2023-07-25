import ddtrace from 'dd-trace';

export const hostTracer = ddtrace.init({
  service: 'host',
  env: 'dev',
  version: 'master:1.0.0',
  logInjection: true,
});
